import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api, getErrorMessage } from "../services/api";
import { createTrackSocket } from "../services/socket";
import LocationMap from "../ui/LocationMap";
import { decodePath, snapToRoute } from "../services/route";
import {
    Phone, MapPin, CheckCircle2, Loader2, AlertCircle, Navigation, RefreshCw,
} from "lucide-react";

const LOGO = "https://ik.imagekit.io/ny6yinyut/cosmosgenLogo/cosmosgen-logo.png?updatedAt=1788413075959";

/**
 * The five words a customer thinks in, which are not the five the office
 * runs its queue with. "Assigned" and "In-Progress" answer a dispatcher;
 * neither tells the person at home whether anyone has set off yet.
 */
/** How long the bike stands at the door before it is taken off the map. */
const RIDER_LINGER_MS = 30000;

/** Close enough to the door to count as standing at it rather than riding. */
const AT_DOOR_METRES = 25;

/** The index of "arrived" in STAGES, which is the stage the wait belongs to. */
const ARRIVED = 2;

const STAGES = [
    /*
     * Not "Assigned", and not the vendor's name either.
     *
     * The office picking somebody is not a promise that somebody is coming -
     * he may hand it straight back - so until he accepts the page says what is
     * true and shows the arc from wherever he is without naming him. The same
     * words as the app, on purpose.
     */
    { key: "assigned", label: "Finding somebody", line: "We are lining somebody up for this job." },
    { key: "on_the_way", label: "On the way", line: "They have set off towards you." },
    { key: "arrived", label: "Arrived", line: "They are at your address." },
    { key: "working", label: "Working", line: "The job is under way." },
    { key: "done", label: "Done", line: "The work is finished." },
];

/**
 * How far and how long is left, measured from where the rider actually is.
 *
 * The server works both figures out when it computes the route, and again
 * every five minutes - which is right, because each one is a billed call, but
 * it meant the customer watched the same "12 min" and the same distance sit
 * still while the bike plainly came closer. What is left of the drawn line is
 * what is left of the journey, and trimming that line is something this page
 * already does on every fix.
 *
 * The pace comes from the route Google worked out - its own distance over its
 * own duration - so traffic and one-ways are still its answer; only the length
 * remaining is measured here. With no route yet, the straight line to the door
 * with a little added for the bends in roads is the honest approximation.
 */
const ROAD_FACTOR = 1.3;

/** About 26 km/h, for when nothing has been routed yet. */
const CITY_PACE = 1 / 7.2;

const RAD = Math.PI / 180;

const gapBetween = (a, b) => {
    const k = Math.cos(((a.lat + b.lat) / 2) * RAD);
    return Math.hypot((b.lng - a.lng) * k * 111320, (b.lat - a.lat) * 111320);
};

const lengthOf = (points) => {
    if (!points || points.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < points.length; i += 1) total += gapBetween(points[i - 1], points[i]);
    return total;
};

const journeyLeft = (data) => {
    const here = data?.technicianAt;
    const there = data?.destination;

    if (!here || there?.lat == null) return { metres: null, minutes: null };

    const at = { lat: here.lat, lng: here.lon };
    const line = data.ride?.encodedPolyline ? decodePath(data.ride.encodedPolyline) : [];
    const ride = line.length > 1 ? snapToRoute(line, at) : null;

    const metres = (ride?.remaining && ride.remaining.length > 1)
        ? lengthOf(ride.remaining)
        : gapBetween(at, { lat: there.lat, lng: there.lon }) * ROAD_FACTOR;

    if (!metres) return { metres: null, minutes: null };

    const etaSeconds = data.ride?.etaSeconds;
    const distanceMeters = data.ride?.distanceMeters;
    const pace = (etaSeconds > 0 && distanceMeters > 0) ? etaSeconds / distanceMeters : CITY_PACE;

    return { metres, minutes: Math.max(1, Math.round((metres * pace) / 60)) };
};

/**
 * Kilometres until it is close, then metres, because "0.3 km away" is not how
 * anybody describes the end of a street.
 */
const distanceLabel = (metres) => {
    if (metres == null) return null;
    if (metres < 950) return Math.max(10, Math.round(metres / 10) * 10) + " m";
    return (metres / 1000).toFixed(1) + " km";
};

const CustomerTracking = () => {
    const { token } = useParams();

    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tick, setTick] = useState(0);

    /*
     * Whether the live channel is actually carrying anything.
     *
     * Not a detail for the screen - it decides whether this page has to go and
     * fetch for itself. A socket that says "connected" and delivers nothing is
     * the state this page was stuck in, so the flag follows the events rather
     * than the intention.
     */
    const [live, setLive] = useState(false);
    const socketRef = useRef(null);

    const load = useCallback(async () => {
        try {
            const res = await api.get("/track/" + token);
            setData(res.data.data);
            setError("");
        } catch (err) {
            setError(getErrorMessage(err, "This tracking link is not valid."));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    useEffect(() => { load(); }, [load]);

    /**
     * The marker moves because the technician's phone said so, not because a
     * timer went off. The one interval here only re-renders the countdown, so
     * "12 min" becomes "11 min" while nothing else is happening.
     */
    useEffect(() => {
        const s = createTrackSocket(token);
        socketRef.current = s;

        const onUpdate = (p) => {
            /*
             * A change of stage goes and fetches the rest.
             *
             * The event carries what the server had to hand at that moment,
             * which is not always the whole picture: tapping Directions
             * announces the departure immediately, and if the vendor's phone
             * has not reported a position since, technicianAt in that payload
             * is null - so the page moved to "on the way" with nothing to draw
             * and Mohan had to reload before the bike turned up.
             *
             * One request on a stage change closes that. It does not fire on
             * the position updates that follow, which are the frequent ones
             * and already carry everything the marker needs.
             */
            setData((prev) => {
                if (p.stage && prev && p.stage !== prev.stage) load();
                return prev;
            });

            /*
             * Back to "assigned" means the job has changed hands - the office
             * moved it, or the vendor handed it back. Everything worked out
             * for the last rider goes with him rather than being drawn ahead
             * of the next one.
             */
            const handedOver = p.stage === "assigned";
            const keep = (now, before) => (now ?? null) || (handedOver ? null : before);

            setData((prev) => (prev ? {
                ...prev,
                stage: p.stage || prev.stage,
                technicianAt: keep(p.technicianAt, prev.technicianAt),
                technician: handedOver
                    ? { name: null, phone: null, rating: null, photo: null }
                    : (p.technician || prev.technician),
                ride: {
                    ...prev.ride,
                    etaSeconds: handedOver ? null : (p.etaSeconds ?? prev.ride?.etaSeconds),
                    etaAt: keep(p.etaAt, prev.ride?.etaAt),
                    distanceMeters: handedOver ? null : (p.distanceMeters ?? prev.ride?.distanceMeters),
                    encodedPolyline: keep(p.encodedPolyline, prev.ride?.encodedPolyline),
                },
            } : prev));
        };

        const up = () => setLive(true);
        const down = () => setLive(false);

        s.on("connect", up);
        s.on("disconnect", down);
        s.on("connect_error", down);
        s.on("track:update", onUpdate);
        s.connect();

        const clock = setInterval(() => setTick((n) => n + 1), 30000);

        return () => {
            clearInterval(clock);
            s.off("connect", up);
            s.off("disconnect", down);
            s.off("connect_error", down);
            s.off("track:update", onUpdate);
            s.disconnect();
            setLive(false);
        };
    }, [token]);

    /*
     * The fallback, and only a fallback.
     *
     * Mohan's rule for this product is that a screen updates because something
     * happened, not because a timer went off - so nothing here polls while the
     * socket is up. But he also had to sit on this page pressing refresh, and
     * a customer waiting at their door will not do that: they will decide the
     * link is broken.
     *
     * So the page fetches for itself exactly when the live channel is down,
     * and stops the moment it comes back. It also stops once the job is done,
     * because there is nothing left to follow.
     */
    useEffect(() => {
        if (live) return undefined;
        if (!data || data.stage === "done") return undefined;

        const id = setInterval(load, 20000);
        return () => clearInterval(id);
    }, [live, data, load]);

    const stageIndex = Math.max(0, STAGES.findIndex((s) => s.key === data?.stage));

    /*
     * The bike stands at the door a moment before it goes.
     *
     * It used to stay on the map for the whole job, which left a technician
     * apparently still riding while he was inside fixing the fridge. Taking it
     * off the instant he arrives is worse, though - the marker vanishes at the
     * exact second the customer looks up to see where he got to, and that
     * reads as the tracking breaking rather than the job starting. So it waits
     * there for half a minute, as Mohan asked, and then goes.
     *
     * Anything past "arrived" means the wait is long over, so the bike is gone
     * already - otherwise moving on to "working" would start a fresh timer and
     * bring it back.
     */
    const [lingered, setLingered] = useState(false);

    /*
     * And the wait starts at the door, not at the edge of the circle.
     *
     * "Arrived" is declared a hundred metres out, which is the honest distance
     * to tell somebody their technician is here - but it is not where he
     * stops. Starting the half minute there took the bike off the map while it
     * was still riding up the street, which is the stretch the customer is
     * really watching.
     */
    const toDoor = (data?.technicianAt && data?.destination?.lat != null)
        ? gapBetween(
            { lat: data.technicianAt.lat, lng: data.technicianAt.lon },
            { lat: data.destination.lat, lng: data.destination.lon },
        )
        : null;

    const atDoor = toDoor != null && toDoor <= AT_DOOR_METRES;

    useEffect(() => {
        if (stageIndex !== ARRIVED || !atDoor) return undefined;

        const id = setTimeout(() => setLingered(true), RIDER_LINGER_MS);

        // Cleared on the way out as well as on unmount, so a job that is put
        // back to "on the way" gets its full wait again rather than none.
        return () => { clearTimeout(id); setLingered(false); };
    }, [stageIndex, atDoor]);

    const riderGone = stageIndex > ARRIVED || (stageIndex === ARRIVED && lingered);

    const markers = useMemo(() => {
        if (!data) return [];
        const list = [];

        // Position 0 is always the technician, so the marker is moved rather
        // than rebuilt on each fix - a rebuilt marker blinks, and a live
        // tracker that blinks looks broken.
        list.push(data.technicianAt && !riderGone
            ? {
                lat: data.technicianAt.lat,
                lon: data.technicianAt.lon,
                color: "#0f78d0",
                title: data.technician?.name || "Technician",

                /*
                 * The bike only once he has actually set off.
                 *
                 * Before that it is the waiting mark - a helmet on a disc,
                 * standing still. A bike drawn at "assigned" claims a journey
                 * that has not started, and a customer watching a bike that
                 * never moves concludes the page is broken rather than that
                 * nobody has left yet.
                 */
                kind: (data.stage === "on_the_way" || data.stage === "arrived") ? "vehicle" : "waiting",
            }
            : null);

        if (data.destination?.lat != null) {
            list.push({ lat: data.destination.lat, lon: data.destination.lon, color: "#17a03c", title: "Your address" });
        }
        return list.filter(Boolean);
    }, [data, riderGone]);

    const left = journeyLeft(data);
    const eta = left.minutes;
    void tick;

    if (loading) {
        return (
            <div className="min-h-screen bg-canvas flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-ink-faint animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-canvas flex items-center justify-center px-5">
                <div className="cg-card p-8 max-w-sm text-center">
                    <AlertCircle className="w-8 h-8 text-danger mx-auto mb-3" strokeWidth={1.5} />
                    <p className="cg-h2 mb-1.5">Link not working</p>
                    <p className="cg-sub">{error}</p>
                </div>
            </div>
        );
    }

    const done = data.stage === "done";
    /*
     * "On the way" was the catch-all, which meant it was also what an assigned
     * job said - the heading claimed a departure while the stepper underneath
     * it still had Assigned lit. The two now agree, and the estimate is only
     * offered once there is a journey for it to be an estimate of.
     */
    const headline = done ? "Job complete"
        : data.stage === "arrived" ? "At your door"
            : data.stage === "working" ? "Work under way"
                : data.stage === "assigned" ? "Finding somebody"
                    : eta != null ? eta + " min away"
                        : "On the way";

    return (
        <div className="min-h-screen bg-canvas flex flex-col">

            {/* A live map is the whole reason this page exists, so it gets the
                top half of the screen and the words sit underneath it. */}
            <div className="relative">
                <LocationMap
                    markers={markers}
                    encodedPolyline={data.ride?.encodedPolyline}

                    /*
                     * The dashed arc, from whoever is coming to the door they
                     * are coming to. It shows from the moment a job has
                     * somebody on it, and the map component drops it the
                     * instant a real road route exists to replace it.
                     */
                    arc={data.technicianAt && data.destination?.lat != null
                        ? {
                            from: { lat: data.technicianAt.lat, lon: data.technicianAt.lon },
                            to: { lat: data.destination.lat, lon: data.destination.lon },
                        }
                        : null}

                    className="h-[46vh] min-h-[280px]"
                    gestureHandling="greedy"

                    /*
                     * Close in on the rider and stay with him, at the zoom
                     * Mohan picked off the tracking demo. 18 is the level lane
                     * names and individual buildings are drawn at, which is
                     * what "where has he got to" actually needs.
                     */
                    follow
                    zoom={18}

                    /*
                     * The customer does not get to zoom. This page has one job
                     * - where is he, how long - and a map somebody has pinched
                     * down to street level answers neither. Dragging still
                     * works, so a rider who moves off the edge can be followed.
                     */
                    lockZoom
                />

                <div className="absolute top-0 left-0 right-0 px-4 pt-4 flex items-center justify-between pointer-events-none">
                    <div className="cg-lift pointer-events-auto flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full">
                        <img src={LOGO} alt="Cosmosgen" className="h-6 w-6 rounded-full object-contain" />
                        <span className="font-display font-semibold text-[13px] tracking-tight text-ink">Cosmosgen</span>
                    </div>

                    <button
                        onClick={() => { setRefreshing(true); load(); }}
                        disabled={refreshing}
                        className="cg-lift cg-icon-btn pointer-events-auto rounded-full"
                        aria-label="Refresh"
                    >
                        <RefreshCw className={"w-4 h-4 " + (refreshing ? "animate-spin" : "")} />
                    </button>
                </div>
            </div>

            {/* The sheet. It overlaps the map so the page reads as one surface
                with the map behind it, rather than two stacked boxes. */}
            <div className="flex-1 -mt-5 relative rounded-t-[22px] bg-surface border-t border-hairline px-5 pt-5 pb-8 shadow-[0_-8px_24px_-16px_rgba(26,26,23,0.25)]">
                <div className="mx-auto w-9 h-1 rounded-full bg-hairline-strong mb-5" />

                <div className="max-w-md mx-auto">
                    <p className="cg-label mb-1.5">{data.serviceLabel || "Your job"}</p>
                    <h1 className="cg-h1 mb-1">{headline}</h1>
                    <p className="cg-sub mb-6">{STAGES[stageIndex]?.line}</p>

                    {/* The stepper. Four thin bars beat a list of five ticks on
                        a phone - it says how far along without needing to be
                        read word by word. */}
                    <div className="flex items-center gap-1.5 mb-2.5">
                        {STAGES.map((s, i) => (
                            <div
                                key={s.key}
                                className={"h-1.5 flex-1 rounded-full transition-colors duration-500 " + (
                                    i < stageIndex ? "bg-brand/45"
                                        : i === stageIndex ? "bg-brand"
                                            : "bg-sunken"
                                )}
                            />
                        ))}
                    </div>
                    <div className="flex justify-between mb-7">
                        {STAGES.map((s, i) => (
                            <span
                                key={s.key}
                                className={"text-[10px] font-semibold tracking-wide " + (
                                    i === stageIndex ? "text-ink" : "text-ink-faint"
                                )}
                            >
                                {s.label}
                            </span>
                        ))}
                    </div>

                    {data.technician?.name && (
                        <div className="cg-rich-light p-4 flex items-center gap-3.5 mb-4">
                            <div className="w-12 h-12 rounded-full bg-accent-tint text-accent flex items-center justify-center shrink-0 font-display font-semibold text-lg">
                                {data.technician.name[0]?.toUpperCase()}
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-ink truncate">{data.technician.name}</p>
                                <p className="text-xs text-ink-soft">
                                    {data.technician.rating ? data.technician.rating + " rating" : "Cosmosgen vendor"}
                                    {left.metres != null && !done && (
                                        <span> · {distanceLabel(left.metres)} away</span>
                                    )}
                                </p>
                            </div>

                            {/* The one thing a waiting customer wants more than
                                a map is to be able to ring the person on it. */}
                            {data.technician.phone && (
                                <a href={"tel:" + data.technician.phone} className="cg-btn cg-btn-go shrink-0" aria-label="Call">
                                    <Phone className="w-4 h-4" />
                                    Call
                                </a>
                            )}
                        </div>
                    )}

                    <div className="cg-card divide-y divide-hairline">
                        <Row icon={MapPin} label="Going to" value={data.destination?.area || "Your address"} note={data.destination?.landmark} />
                        <Row icon={Navigation} label="Ticket" value={data.ticketNumber} />
                        {done && <Row icon={CheckCircle2} label="Status" value="Work finished" tone="text-brand" />}
                    </div>

                    <p className="text-center text-xs text-ink-faint mt-7">
                        This page updates on its own. Keep it open to watch them arrive.
                    </p>
                </div>
            </div>
        </div>
    );
};

const Row = ({ icon: Icon, label, value, note, tone = "text-ink" }) => (
    <div className="flex items-start gap-3 px-4 py-3.5">
        <Icon className="w-4 h-4 text-ink-faint shrink-0 mt-0.5" />
        <div className="min-w-0">
            <p className="cg-label mb-0.5">{label}</p>
            <p className={"text-sm font-medium truncate " + tone}>{value}</p>
            {note && <p className="text-xs text-ink-soft mt-0.5">{note}</p>}
        </div>
    </div>
);

export default CustomerTracking;
