import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api, getErrorMessage } from "../services/api";
import { createTrackSocket } from "../services/socket";
import LocationMap from "../ui/LocationMap";
import {
    Phone, MapPin, CheckCircle2, Loader2, AlertCircle, Navigation, RefreshCw,
} from "lucide-react";

const LOGO = "https://ik.imagekit.io/ny6yinyut/cosmosgenLogo/cosmosgen-logo.png?updatedAt=1788413075959";

/**
 * The five words a customer thinks in, which are not the five the office
 * runs its queue with. "Assigned" and "In-Progress" answer a dispatcher;
 * neither tells the person at home whether anyone has set off yet.
 */
const STAGES = [
    { key: "assigned", label: "Assigned", line: "We have someone for this job." },
    { key: "on_the_way", label: "On the way", line: "They have set off towards you." },
    { key: "arrived", label: "Arrived", line: "They are at your address." },
    { key: "working", label: "Working", line: "The job is under way." },
    { key: "done", label: "Done", line: "The work is finished." },
];

const minutesFrom = (etaSeconds, etaAt) => {
    if (etaSeconds == null) return null;
    // The stored ETA was true when it was computed. Counting down from that
    // moment is closer to the truth than repeating the original number for
    // twenty minutes, and it is what makes the figure feel alive.
    const elapsed = etaAt ? (Date.now() - new Date(etaAt).getTime()) / 1000 : 0;
    return Math.max(1, Math.round((etaSeconds - elapsed) / 60));
};

const CustomerTracking = () => {
    const { token } = useParams();

    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tick, setTick] = useState(0);
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
            setData((prev) => (prev ? {
                ...prev,
                stage: p.stage || prev.stage,
                technicianAt: p.technicianAt || prev.technicianAt,
                ride: {
                    ...prev.ride,
                    etaSeconds: p.etaSeconds ?? prev.ride?.etaSeconds,
                    etaAt: p.etaAt || prev.ride?.etaAt,
                    distanceMeters: p.distanceMeters ?? prev.ride?.distanceMeters,
                    encodedPolyline: p.encodedPolyline || prev.ride?.encodedPolyline,
                },
            } : prev));
        };

        s.on("track:update", onUpdate);
        s.connect();

        const clock = setInterval(() => setTick((n) => n + 1), 30000);

        return () => {
            clearInterval(clock);
            s.off("track:update", onUpdate);
            s.disconnect();
        };
    }, [token]);

    const stageIndex = Math.max(0, STAGES.findIndex((s) => s.key === data?.stage));

    const markers = useMemo(() => {
        if (!data) return [];
        const list = [];

        // Position 0 is always the technician, so the marker is moved rather
        // than rebuilt on each fix - a rebuilt marker blinks, and a live
        // tracker that blinks looks broken.
        list.push(data.technicianAt
            ? { lat: data.technicianAt.lat, lon: data.technicianAt.lon, color: "#0f78d0", title: data.technician?.name || "Technician" }
            : null);

        if (data.destination?.lat != null) {
            list.push({ lat: data.destination.lat, lon: data.destination.lon, color: "#17a03c", title: "Your address" });
        }
        return list.filter(Boolean);
    }, [data]);

    const eta = data ? minutesFrom(data.ride?.etaSeconds, data.ride?.etaAt) : null;
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
    const headline = done ? "Job complete"
        : data.stage === "arrived" ? "At your door"
            : data.stage === "working" ? "Work under way"
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
                    className="h-[46vh] min-h-[280px]"
                    gestureHandling="greedy"
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
                                    {data.ride?.distanceMeters != null && !done && (
                                        <span> · {(data.ride.distanceMeters / 1000).toFixed(1)} km away</span>
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
