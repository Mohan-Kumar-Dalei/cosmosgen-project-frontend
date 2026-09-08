import { Navigation, Clock, Route, CheckCircle2, AlertTriangle } from "lucide-react";
import LocationMap from "../../ui/LocationMap";


const TECH_COLOR = "#2563eb";
const CUSTOMER_COLOR = "#15803d";

/**
 * Number(null), Number("") and Number(false) are all 0, and 0 is a finite
 * number - so a plain Number.isFinite check accepts a missing coordinate and
 * quietly sends the technician to 0,0 in the Gulf of Guinea. Only real numbers
 * and non-empty numeric strings get through here.
 */
const isCoord = (v) =>
    (typeof v === "number" || (typeof v === "string" && v.trim() !== "")) &&
    Number.isFinite(Number(v));

const formatEta = (seconds) => {
    if (!Number.isFinite(Number(seconds))) return null;
    const mins = Math.max(1, Math.round(Number(seconds) / 60));
    if (mins < 60) return mins + " min";
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem === 0 ? hours + " hr" : hours + " hr " + rem + " min";
};

const formatDistance = (metres) => {
    if (!Number.isFinite(Number(metres))) return null;
    const m = Number(metres);
    return m < 1000 ? Math.round(m) + " m" : (m / 1000).toFixed(1) + " km";
};

const pair = (p) => p.lat + "," + p.lon;

const buildDirectionsUrl = (origin, destination) => {
    if (!destination) return null;
    const base = "https://www.google.com/maps/dir/?api=1&destination=" +
        encodeURIComponent(pair(destination)) + "&travelmode=driving&dir_action=navigate";
    // Without an origin Google starts from wherever the phone is, which is the
    // same place - but naming it keeps the app's route identical to the one
    // drawn above rather than letting Google pick its own start.
    return origin ? base + "&origin=" + encodeURIComponent(pair(origin)) : base;
};

/**
 * The route panel on the technician's active job.
 *
 * There is nothing to press here except the navigation button. The ride
 * itself - the customer's "on the way" message, the ETA and the arrival
 * message - is driven server-side off the location ping the panel already
 * sends. Arrival especially belongs there: it sends a message the customer
 * acts on, so it cannot be something a client announces whenever it likes.
 *
 * `techPos` is that same live fix, passed down rather than watched again here,
 * because two GPS watchers on one page drain a phone twice as fast for the
 * same coordinates.
 */
const RouteToCustomer = ({ ticket, techPos }) => {
    const snapshot = ticket.customerSnapshot || {};
    const coords = ticket.location?.coordinates;

    // customerSnapshot is the address the job was booked at; location is the
    // GeoJSON copy used for dispatch. Either can be missing on an old ticket,
    // so take whichever one actually has numbers.
    const destination =
        isCoord(snapshot.lat) && isCoord(snapshot.lon)
            ? { lat: Number(snapshot.lat), lon: Number(snapshot.lon) }
            : Array.isArray(coords) && isCoord(coords[1]) && isCoord(coords[0])
                ? { lat: Number(coords[1]), lon: Number(coords[0]) }
                : null;

    const ride = ticket.ride || {};
    const arrived = Boolean(ride.arrivedAt);

    const livePos =
        techPos && isCoord(techPos.lat) && isCoord(techPos.lon)
            ? { lat: Number(techPos.lat), lon: Number(techPos.lon) }
            : null;

    // Before the first fix reaches this tab, fall back to where the server saw
    // the ride begin. That is a real point on the road rather than an empty map.
    const rideOrigin =
        isCoord(ride.origin?.lat) && isCoord(ride.origin?.lon)
            ? { lat: Number(ride.origin.lat), lon: Number(ride.origin.lon) }
            : null;

    const origin = livePos || rideOrigin;

    if (!destination) {
        return (
            <div className="p-3.5 bg-warn-tint border border-hairline rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-warn shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-semibold text-warn">No location on this ticket</p>
                    <p className="text-xs text-warn mt-0.5">
                        Ask the office for directions before you set off.
                    </p>
                </div>
            </div>
        );
    }

    const eta = formatEta(ride.etaSeconds);
    const distance = formatDistance(ride.distanceMeters);

    return (
        <div>
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                    <p className="text-xs font-semibold text-ink-faint uppercase tracking-wide">
                        Route to customer
                    </p>
                    {arrived ? (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-brand">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Arrived, customer notified
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-info">
                            <span className="w-1.5 h-1.5 rounded-full bg-info animate-pulse" />
                            {livePos ? "Live" : "Waiting for GPS"}
                        </span>
                    )}
                </div>

                {!arrived && (eta || distance) && (
                    <div className="flex items-center gap-2">
                        {eta && (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-ink bg-white border border-hairline px-2.5 py-1.5 rounded-lg">
                                <Clock className="w-3.5 h-3.5 text-ink-faint" />
                                {eta} away
                            </span>
                        )}
                        {distance && (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-ink bg-white border border-hairline px-2.5 py-1.5 rounded-lg">
                                <Route className="w-3.5 h-3.5 text-ink-faint" />
                                {distance}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* LocationMap tracks markers by title, so the technician pin is
                repositioned as it moves rather than rebuilt - and the customer
                pin stays put when the technician one appears. */}
            <LocationMap
                markers={[
                    ...(origin ? [{ ...origin, color: TECH_COLOR, title: "You" }] : []),
                    { ...destination, color: CUSTOMER_COLOR, title: "Customer" },
                ]}
                encodedPolyline={ride.encodedPolyline || null}
                className="h-64 sm:h-72"
            />

            <a
                href={buildDirectionsUrl(origin, destination)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg text-sm mt-3"
            >
                <Navigation className="w-4 h-4" />
                Open in Google Maps
            </a>

            <p className="text-[11px] text-ink-faint mt-2 text-center">
                {arrived
                    ? "The customer has been told you are here."
                    : "The customer is told automatically when you reach them."}
            </p>
        </div>
    );
};

export default RouteToCustomer;
