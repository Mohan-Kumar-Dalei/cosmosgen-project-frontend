import { useState, useEffect, useRef } from "react";
import { MapPin } from "lucide-react";

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

/**
 * One shared loader for the Maps script, for the whole app.
 *
 * The Embed API this replaced put Google's own furniture on top of the map -
 * a "more information" panel and pan arrows in the corners - and an iframe
 * gives you no way to turn those off. Loading the JavaScript API instead means
 * we draw the map ourselves and it carries only what we put on it.
 */
let mapsPromise = null;
const loadMaps = () => {
    if (window.google?.maps?.geometry) return Promise.resolve(window.google.maps);
    if (mapsPromise) return mapsPromise;

    mapsPromise = new Promise((resolve, reject) => {
        if (!MAPS_KEY) {
            reject(new Error("VITE_GOOGLE_MAPS_API_KEY is not set"));
            return;
        }
        const callbackName = "__cosmosgenMapsReady";
        window[callbackName] = () => resolve(window.google.maps);

        const script = document.createElement("script");
        script.src =
            "https://maps.googleapis.com/maps/api/js?key=" + MAPS_KEY +
            "&libraries=geometry&loading=async&callback=" + callbackName;
        script.async = true;
        script.onerror = () => {
            // Let a later mount try again rather than caching the failure -
            // this is usually a dropped connection in a lift or a basement.
            mapsPromise = null;
            reject(new Error("Google Maps could not be loaded"));
        };
        document.head.appendChild(script);
    });

    return mapsPromise;
};

/**
 * A teardrop map pin rather than a plain dot.
 *
 * A dot reads as an anonymous blob on the road; a pin points at the exact spot
 * it marks, which is the whole job of a marker. This is the standard 24x24
 * place glyph - the inner circle is wound the other way so it punches a hole
 * rather than filling in - and the anchor sits at the tip so the point, not
 * the centre of the head, lands on the coordinate.
 */
const PIN_PATH =
    "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" +
    "m0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z";

const pinIcon = (maps, fill) => ({
    path: PIN_PATH,
    fillColor: fill,
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 1.5,
    scale: 1.7,
    anchor: new maps.Point(12, 22),
});

/**
 * Shown until Google answers.
 *
 * A blank grey rectangle looks like a map that failed; faint streets and a
 * pulsing pin read as one still arriving, which is what is actually
 * happening. It matters most on the admin side, where a slow office
 * connection can leave this on screen for a second or two.
 */
const MapSkeleton = () => (
    <div className="absolute inset-0 bg-sunken overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 animate-pulse">
            <div className="absolute left-0 right-0 top-1/3 h-3 bg-sunken/70" />
            <div className="absolute left-0 right-0 top-2/3 h-2 bg-sunken/60" />
            <div className="absolute top-0 bottom-0 left-1/4 w-3 bg-sunken/70" />
            <div className="absolute top-0 bottom-0 left-3/4 w-2 bg-sunken/50" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
                <MapPin className="w-7 h-7 text-ink-faint/80" />
            </div>
        </div>
    </div>
);

/**
 * A Google map with only what we put on it.
 *
 * `markers` is positional: entry 0 stays entry 0 across renders, so a marker
 * that moves is repositioned rather than rebuilt. Rebuilding it would make it
 * blink on every GPS update, which is exactly what a live tracker must not do.
 */
const LocationMap = ({
    markers = [],
    encodedPolyline = null,
    zoom = 15,
    className = "h-64",
    gestureHandling = "cooperative",
}) => {
    const containerRef = useRef(null);
    const mapsRef = useRef(null);
    const mapRef = useRef(null);
    const lineRef = useRef(null);
    const markerRefs = useRef({});
    const hasFitRef = useRef(false);
    const [state, setState] = useState("loading");

    const first = markers[0];
    const markerSignature = markers
        .map((m) => (m.title || "") + ":" + m.lat + "," + m.lon + ":" + (m.color || ""))
        .join("|");

    // Build the map once. Re-creating it on every prop change is what makes an
    // embedded map feel jumpy.
    useEffect(() => {
        let cancelled = false;

        loadMaps()
            .then((maps) => {
                if (cancelled || !containerRef.current) return;
                mapsRef.current = maps;
                mapRef.current = new maps.Map(containerRef.current, {
                    center: first ? { lat: first.lat, lng: first.lon } : { lat: 20.2961, lng: 85.8245 },
                    zoom,
                    // No zoom buttons, no pan arrows, no Street View peg, no
                    // map-type switch. Pinch and drag still work.
                    disableDefaultUI: true,
                    // "greedy" would swallow the page scroll on a phone, which
                    // traps the reader inside the map.
                    gestureHandling,
                    clickableIcons: false,
                });
                setState("ready");
            })
            .catch(() => {
                if (!cancelled) setState("failed");
            });

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Route line, when there is one.
    useEffect(() => {
        const maps = mapsRef.current;
        const map = mapRef.current;
        if (state !== "ready" || !maps || !map) return;

        if (lineRef.current) {
            lineRef.current.setMap(null);
            lineRef.current = null;
        }
        if (!encodedPolyline) return;

        const path = maps.geometry.encoding.decodePath(encodedPolyline);
        lineRef.current = new maps.Polyline({
            map, path,
            strokeColor: "#2563eb",
            strokeOpacity: 0.9,
            strokeWeight: 5,
            zIndex: 1,
        });

        const bounds = new maps.LatLngBounds();
        path.forEach((p) => bounds.extend(p));
        map.fitBounds(bounds, 32);
        hasFitRef.current = true;
    }, [encodedPolyline, state]);

    // Markers are matched by their title, not their position in the array.
    // Indexing broke the moment a list went from one pin to two: the live
    // marker appearing at the front shifted the customer down a slot, and the
    // customer's pin jumped to the technician's coordinates.
    useEffect(() => {
        const maps = mapsRef.current;
        const map = mapRef.current;
        if (state !== "ready" || !maps || !map) return;

        const seen = new Set();

        markers.forEach((m, i) => {
            const key = m.title || "marker-" + i;
            seen.add(key);
            const position = { lat: m.lat, lng: m.lon };
            const existing = markerRefs.current[key];

            if (existing) {
                existing.setPosition(position);
                return;
            }
            markerRefs.current[key] = new maps.Marker({
                map, position,
                icon: pinIcon(maps, m.color || "#2563eb"),
                title: key,
                zIndex: 2 + i,
            });
        });

        // Drop any marker no longer in the list.
        Object.keys(markerRefs.current).forEach((key) => {
            if (seen.has(key)) return;
            markerRefs.current[key].setMap(null);
            delete markerRefs.current[key];
        });

        // Frame the pins once. Refitting on every update would yank the view
        // back each time the live marker moved.
        if (!hasFitRef.current && markers.length) {
            if (markers.length === 1) {
                map.setCenter({ lat: markers[0].lat, lng: markers[0].lon });
                map.setZoom(zoom);
            } else {
                const bounds = new maps.LatLngBounds();
                markers.forEach((m) => bounds.extend({ lat: m.lat, lng: m.lon }));
                map.fitBounds(bounds, 48);
            }
            hasFitRef.current = true;
        }
        // The array is rebuilt by the parent on every render, so depend on the
        // coordinates it carries rather than its identity.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [markerSignature, state, zoom]);

    return (
        <div className={"w-full rounded-xl overflow-hidden border border-hairline bg-sunken relative " + className}>
            <div ref={containerRef} className="w-full h-full" />

            {state === "loading" && <MapSkeleton />}

            {state === "failed" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 bg-sunken">
                    <MapPin className="w-5 h-5 text-ink-faint mb-1.5" />
                    <p className="text-xs font-medium text-ink-soft">Map unavailable</p>
                    <p className="text-[11px] text-ink-faint mt-0.5">
                        {MAPS_KEY ? "Check the connection and try again." : "VITE_GOOGLE_MAPS_API_KEY is not set."}
                    </p>
                </div>
            )}
        </div>
    );
};

export default LocationMap;
