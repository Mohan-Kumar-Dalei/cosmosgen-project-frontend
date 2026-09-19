import { useState, useEffect, useMemo, useRef } from "react";
import { MapPin } from "lucide-react";
import { decodePath, snapToRoute } from "../services/route";

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
 * The engineer on his bike, seen from above.
 *
 * A pin is right for a place and wrong for a person: two identical teardrops
 * on a road say "here are two points", not "this one is coming to that one".
 *
 * From above, and that is the whole point. It was drawn from the side twice
 * and both were wrong for the same reason Mohan gave: a map is looked down on,
 * so a bike shown in profile is lying on its side on the road. What you see
 * from up there is the helmet, the shoulders, the handlebar across, an arm out
 * to each grip, and a little wheel showing front and back - which is what
 * every ride-hailing app puts on its map, because it is what is true.
 *
 * The company's mark and name sit on the back of the shirt, which is where a
 * uniform carries them and the only surface facing the camera. The blue is
 * kept to the outer edge of the shoulders so that panel stays white and the
 * lettering has something to sit on.
 *
 * The depth is ordinary drawing rather than a 3D library: a radial highlight
 * on the crown of the helmet where light would land, gradients down the
 * shoulders and the tank, steel on the mirrors, and a blurred ellipse offset
 * on the road so the bike sits above the tarmac instead of printed on it.
 *
 * It points north. If a heading ever reaches this screen, rotating the whole
 * marker by it is the one change that would make it read as travelling rather
 * than as sliding.
 *
 * Kept identical to customer-app/src/Rider.js.
 */
const RIDER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="132" viewBox="0 0 100 132">
  <defs>
    <radialGradient id="helm" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.6" stop-color="#f0f3f6"/>
      <stop offset="1" stop-color="#bcc6cf"/>
    </radialGradient>
    <linearGradient id="shirt" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#cbd3da"/>
    </linearGradient>
    <linearGradient id="blue" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0" stop-color="#4b9ee4"/>
      <stop offset="0.5" stop-color="#0f78d0"/>
      <stop offset="1" stop-color="#0a4f8c"/>
    </linearGradient>
    <linearGradient id="dark" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0" stop-color="#39424a"/>
      <stop offset="1" stop-color="#171b20"/>
    </linearGradient>
    <linearGradient id="steel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#cdd4da"/>
      <stop offset="1" stop-color="#7d868e"/>
    </linearGradient>
    <clipPath id="badge"><circle cx="50" cy="81" r="6"/></clipPath>
    <filter id="soft" x="-40%" y="-20%" width="180%" height="140%">
      <feGaussianBlur stdDeviation="3"/>
    </filter>
  </defs>

  <ellipse cx="53" cy="72" rx="24" ry="42" fill="rgba(13,26,38,0.22)" filter="url(#soft)"/>

  <!-- front wheel and the mudguard over it -->
  <rect x="45.5" y="6" width="9" height="30" rx="4" fill="url(#dark)"/>
  <path d="M43 22 C43 19 46 17 50 17 C54 17 57 19 57 22 L57 34 C57 36 54 37 50 37 C46 37 43 36 43 34 Z" fill="url(#blue)"/>
  <path d="M46 21 C47 20 48 19.5 50 19.5 C52 19.5 53 20 54 21 C52 22 48 22 46 21 Z" fill="#a8d6f8" opacity="0.7"/>

  <!-- handlebar, grips, mirrors -->
  <rect x="18" y="39" width="64" height="6" rx="3" fill="url(#dark)"/>
  <rect x="14" y="36" width="13" height="11" rx="5" fill="#1b2128"/>
  <rect x="73" y="36" width="13" height="11" rx="5" fill="#1b2128"/>
  <rect x="11" y="31" width="3" height="8" rx="1.5" fill="#39424a"/>
  <rect x="86" y="31" width="3" height="8" rx="1.5" fill="#39424a"/>
  <ellipse cx="12" cy="29" rx="6" ry="4" fill="url(#steel)"/>
  <ellipse cx="88" cy="29" rx="6" ry="4" fill="url(#steel)"/>

  <!-- a sliver of tank between the bars and the rider -->
  <path d="M41 45 C41 43 45 42 50 42 C55 42 59 43 59 45 L59 57 L41 57 Z" fill="url(#blue)"/>

  <!-- arms, thin, from the shoulders out to the grips -->
  <path d="M36 70 C32 62 27 53 23 46 L29 42 C33 50 38 60 42 67 Z" fill="url(#shirt)"/>
  <path d="M64 70 C68 62 73 53 77 46 L71 42 C67 50 62 60 58 67 Z" fill="url(#shirt)"/>
  <path d="M21 41 C25 39 29 41 30 44 L24 48 C21 47 19 43 21 41 Z" fill="#2b3138"/>
  <path d="M79 41 C75 39 71 41 70 44 L76 48 C79 47 81 43 79 41 Z" fill="#2b3138"/>

  <!-- shoulders and back. The blue is kept to the outer edge so the middle
       stays white - that is the panel a uniform carries its name on -->
  <path d="M31 76 C31 67 40 62 50 62 C60 62 69 67 69 76 L69 94 C69 100 60 103 50 103 C40 103 31 100 31 94 Z" fill="url(#shirt)"/>
  <path d="M31 76 C31 69 34 65 38 63 L38 88 C33 87 31 83 31 79 Z" fill="url(#blue)"/>
  <path d="M69 76 C69 69 66 65 62 63 L62 88 C67 87 69 83 69 79 Z" fill="url(#blue)"/>

  <!-- the company, on the back of the shirt where a uniform carries it -->
  <g transform="translate(50 82.5) scale(0.76) translate(-50 -81)">
  <g clip-path="url(#badge)">
    <circle cx="50" cy="81" r="6" fill="#0f78d0"/>
    <g stroke="#ffffff" stroke-width="0.9">
      <line x1="42" y1="82" x2="50" y2="74"/>
      <line x1="45" y1="86" x2="54" y2="77"/>
      <line x1="49" y1="88" x2="57" y2="80"/>
    </g>
    <path d="M46 86 L52 80 L50.5 78.5 L54 77 L53 80.5 L51.5 79 L47.5 87 Z" fill="#17a03c"/>
  </g>
  <circle cx="50" cy="81" r="6" fill="none" stroke="rgba(13,26,38,0.12)" stroke-width="0.6"/>
  </g>

  <text x="50" y="92" text-anchor="middle"
        font-family="Outfit, Segoe UI, Arial, sans-serif"
        font-size="4.4" font-weight="700" letter-spacing="-0.08" fill="#123a5e">Cosmosgen</text>
  <text x="50" y="96.4" text-anchor="middle"
        font-family="Outfit, Segoe UI, Arial, sans-serif"
        font-size="2.5" font-weight="600" letter-spacing="0.08" fill="#5c6a77">Engineers Pvt Ltd</text>

  <!-- the helmet: white shell, one narrow stripe, a visor at the front edge -->
  <circle cx="50" cy="64" r="15.5" fill="url(#helm)"/>
  <path d="M45.5 49.5 C47 49 53 49 54.5 49.5 L54.5 78.5 C53 79 47 79 45.5 78.5 Z" fill="url(#blue)"/>
  <path d="M37 59 C40 53 44 50 50 50 C56 50 60 53 63 59 C57 56 43 56 37 59 Z" fill="#0b0e11"/>
  <ellipse cx="44" cy="57" rx="3.5" ry="1.4" fill="#8d99a3" opacity="0.75"/>
  <circle cx="50" cy="64" r="15.5" fill="none" stroke="rgba(13,26,38,0.10)" stroke-width="1"/>

  <!-- the bag behind him -->
  <rect x="32" y="102" width="36" height="22" rx="5" fill="url(#dark)"/>
  <rect x="32" y="108" width="36" height="6" fill="#0f78d0"/>
  <rect x="46" y="102" width="8" height="22" fill="#20262c" opacity="0.8"/>

  <!-- rear wheel, just past the bag -->
  <rect x="45" y="119" width="10" height="11" rx="4" fill="url(#dark)"/>
</svg>`;

/**
 * The same rider, standing still.
 *
 * Shown from the moment a job has somebody on it until they tap Directions.
 * Drawing the bike then would say they had set off when they had not - and a
 * customer watching a bike that never moves decides the page is broken long
 * before they decide nobody has left yet.
 *
 * So it is the helmet on its own, on a disc with a soft ring around it: the
 * person is real and accounted for, and nothing about it suggests movement.
 * The ring is what reads as waiting.
 */
const waitingSvg = (ringR, ringOpacity) => `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <defs>
    <radialGradient id="wshell" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.6" stop-color="#f0f3f6"/>
      <stop offset="1" stop-color="#bcc6cf"/>
    </radialGradient>
    <linearGradient id="wblue" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0" stop-color="#4b9ee4"/>
      <stop offset="0.5" stop-color="#0f78d0"/>
      <stop offset="1" stop-color="#0a4f8c"/>
    </linearGradient>
  </defs>

  <circle cx="48" cy="48" r="${ringR}" fill="#0f78d0" opacity="${ringOpacity}"/>
  <circle cx="48" cy="48" r="25" fill="#ffffff"/>
  <circle cx="48" cy="48" r="25" fill="none" stroke="#0f78d0" stroke-width="2.2" opacity="0.55"/>

  <path d="M34 60 C34 51 40 46 48 46 C56 46 62 51 62 60 L62 64 C57 66 39 66 34 64 Z" fill="url(#wblue)"/>
  <circle cx="48" cy="44" r="12" fill="url(#wshell)"/>
  <path d="M44.5 33 C45.8 32.7 50.2 32.7 51.5 33 L51.5 55 C50.2 55.3 45.8 55.3 44.5 55 Z" fill="url(#wblue)" opacity="0.9"/>
  <path d="M38.5 41 C41 36.5 44 34.5 48 34.5 C52 34.5 55 36.5 57.5 41 C53 38.8 43 38.8 38.5 41 Z" fill="#0b0e11"/>
  <circle cx="48" cy="44" r="12" fill="none" stroke="rgba(13,26,38,0.14)" stroke-width="1"/>
</svg>`;

/*
 * The same scale as the rider, because they are the same person.
 *
 * This was 44 while the bike was 56, which read correctly. The bike is 30 now
 * - sized to sit between the kerbs rather than across them - and a waiting
 * mark left at 44 would be half again as big as the man once he sets off. The
 * sequence would read backwards: standing still bigger than riding.
 *
 * Kept a shade larger than 30 on purpose. The ring pulses outward from inside
 * this box, so a few points of margin are what the pulse travels through; cut
 * to exactly 30 and the swell has nowhere to go.
 */
const WAITING_SIZE = 34;

const waitingIcon = (maps, ringR = 34, ringOpacity = 0.13) => ({
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(waitingSvg(ringR, ringOpacity)),
    scaledSize: new maps.Size(WAITING_SIZE, WAITING_SIZE),
    anchor: new maps.Point(WAITING_SIZE / 2, WAITING_SIZE / 2),
});

/**
 * The ring pulses; the person inside it does not.
 *
 * A marker that never moves is hard to tell from a page that has stopped
 * working - and this one never moves on purpose, because standing still is its
 * whole meaning. So the blue ring around him behaves the way a live dot does
 * anywhere else: it swells outward and fades, over and over.
 *
 * Only the ring. Scaling the whole mark was the first attempt and it was
 * wrong - the man himself grew and shrank, which reads as a zoom rather than
 * as a signal. Now he sits still at his own size and the ring does the work.
 *
 * Redrawn from outside rather than animated inside. An SVG handed to a marker
 * as an image is rasterised once and its own animation never runs, so each
 * frame is a fresh drawing with a bigger, fainter ring.
 */
const PULSE_MS = 1800;

const startPulse = (maps, marker) => {
    const began = Date.now();

    return setInterval(() => {
        const phase = ((Date.now() - began) % PULSE_MS) / PULSE_MS;

        // Out from the shell and gone by the edge of the box, fading as it
        // travels - which is what makes it read as a signal leaving him.
        const radius = 26 + phase * 20;
        const opacity = 0.3 * (1 - phase);

        marker.setIcon(waitingIcon(maps, radius, Number(opacity.toFixed(3))));
    }, 50);
};

/*
 * Sized against the road, not against the screen.
 *
 * It was 56 wide, which is about twice a two-lane road at the zoom the
 * tracking map sits at - so the rider read as something laid on top of the
 * map rather than something travelling along it. At 36 he fits between the
 * kerbs, which is what makes the movement look like movement. Mohan settled
 * on 30 against real tiles at the zoom the tracking screen uses.
 *
 * The 100 x 132 viewBox is unchanged, so the proportions are the drawing's
 * own: 36 wide is 48 tall.
 */
const RIDER_W = 30;
const RIDER_H = 40;

/*
 * A square canvas, so the rider can turn inside it without losing a wheel.
 *
 * Google's marker icons are images, and an image has no rotation of its own -
 * the turn has to be in the artwork. Rotating a 100 x 132 drawing inside a
 * 100 x 132 box clips the corners at every angle but the one it was drawn at,
 * so the box is widened to the drawing's diagonal, which no rotation can
 * exceed. The drawing keeps its own coordinates; only the frame around it
 * grows, which is why the bike still reads at 30 x 40 on screen.
 */
const CANVAS = Math.ceil(Math.hypot(100, 132));
const PAD_X = (CANVAS - 100) / 2;
const PAD_Y = (CANVAS - 132) / 2;

/** The drawing's own centre, which is what it turns about. */
const PIVOT = { x: 50, y: 66 };

/*
 * The square scaled so the drawing inside it still fits the 30 x 40 Mohan
 * settled on against real tiles. A square canvas can only scale uniformly, and
 * 30 x 40 is the drawing's own 100 x 132 proportion rounded, so the smaller of
 * the two ratios keeps the bike inside the size that was agreed rather than a
 * fraction over it.
 */
const RIDER_BOX = Math.round(CANVAS * Math.min(RIDER_W / 100, RIDER_H / 132));

const riderIcon = (maps, heading = 0) => {
    const turned = RIDER_SVG
        .replace(
            /<svg[^>]*>/,
            '<svg xmlns="http://www.w3.org/2000/svg" width="' + CANVAS + '" height="' + CANVAS + '"'
            + ' viewBox="' + -PAD_X + ' ' + -PAD_Y + ' ' + CANVAS + ' ' + CANVAS + '">'
            + '<g transform="rotate(' + Math.round(heading) + ' ' + PIVOT.x + ' ' + PIVOT.y + ')">'
        )
        .replace(/<\/svg>\s*$/, "</g></svg>");

    return {
        url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(turned),
        scaledSize: new maps.Size(RIDER_BOX, RIDER_BOX),

        /*
         * The pivot, which is now the middle of the square. A marker drawn
         * from above sits on its position rather than pointing at it, so there
         * is no tip to anchor - and anchoring anywhere but the point it turns
         * about would make the bike swing around the road as it turned.
         */
        anchor: new maps.Point(RIDER_BOX / 2, RIDER_BOX / 2),
    };
};







/**
 * The dashed curve from whoever is coming to where they are going.
 *
 * Not the road route - that is the solid line, and it only exists once a route
 * has been worked out. This is the other thing Swiggy draws: a light arc that
 * says "this person, to that door", there from the moment a job has somebody
 * on it and before anybody has set off.
 *
 * Curved on purpose. A straight line between two pins reads as a measurement;
 * a bowed one reads as a journey, and it keeps the line off the marker at each
 * end. The bow is a quadratic bezier sampled into points, because a Google
 * polyline takes coordinates rather than a path.
 */
const arcBetween = (from, to, bend = 0.16, steps = 48) => {
    // The control point sits off to one side of the midpoint, at right angles
    // to the line - which is what makes the bow rather than a sag.
    const cLat = (from.lat + to.lat) / 2 - (to.lon - from.lon) * bend;
    const cLon = (from.lon + to.lon) / 2 + (to.lat - from.lat) * bend;

    const points = [];
    for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const u = 1 - t;
        points.push({
            lat: u * u * from.lat + 2 * u * t * cLat + t * t * to.lat,
            lng: u * u * from.lon + 2 * u * t * cLon + t * t * to.lon,
        });
    }
    return points;
};

/**
 * A dash, the only way Google's API draws one: a symbol repeated along a line
 * whose own stroke is invisible.
 */
const DASH = { path: "M 0,-1 0,1", strokeOpacity: 0.85, strokeWeight: 2.6, scale: 3 };

/**
 * Shown until Google answers.
 *
 * A blank grey rectangle looks like a map that failed; faint streets and a
 * pulsing pin read as one still arriving, which is what is actually
 * happening. It matters most on the admin side, where a slow office
 * connection can leave this on screen for a second or two.
 */
/** How long a followed map leaves the reader alone after they drag it. */
const HANDS_OFF_MS = 10000;

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

    /*
     * Keep the rider under the middle of the map instead of framing both ends
     * once and leaving it there.
     *
     * The framed-once view is right for a dispatcher looking at a job, and
     * wrong for a customer watching somebody approach: the frame is decided
     * while the rider is kilometres away, and by the time he reaches the door
     * the map still shows the whole city. Only the customer's own tracking
     * page asks for this.
     */
    follow = false,
    /*
     * Street level, and deliberately not further.
     *
     * Mohan asked for something near 22, which is the level individual
     * buildings are drawn at. It is only usable when there is one point to
     * look at: two points more than about fifty metres apart cannot both be on
     * a screen at that zoom, and the arc and the route between them are the
     * whole reason this map exists. So this is the zoom for a lone marker, and
     * a pair is still framed by fitBounds - which now goes as close as the two
     * of them allow, because the padding was cut and the lock no longer clamps
     * it.
     */
    zoom = 19,
    className = "h-64",
    gestureHandling = "cooperative",

    /*
     * Two markers to join with the dashed arc, when the road route is not
     * known yet. Given as a pair rather than taken from the markers list, because
     * only the caller knows which two of them are the journey.
     */
    arc = null,

    /** Fix the zoom where it lands, so a pinch cannot change it. */
    lockZoom = false,
}) => {
    const containerRef = useRef(null);
    const mapsRef = useRef(null);
    const mapRef = useRef(null);
    const lineRef = useRef(null);
    const arcRef = useRef(null);

    /**
     * Freeze the zoom where the map settled, not where it started.
     *
     * Called once the framing is done, so a customer cannot pinch closer or
     * further but is left looking at a view that actually contains both ends
     * of the journey. Dragging still works, which is the part that matters
     * when a rider moves off the edge.
     */
    const lockAfterFit = () => {
        if (!lockZoom) return;
        const map = mapRef.current;
        const maps = mapsRef.current;
        if (!map || !maps) return;

        // Google settles the zoom a beat after fitBounds, so the value is read
        // on the event that says it has rather than straight away.
        maps.event.addListenerOnce(map, "idle", () => {
            const settled = map.getZoom();
            if (typeof settled === "number") map.setOptions({ minZoom: settled, maxZoom: settled });
        });
    };
    const markerRefs = useRef({});
    const hasFitRef = useRef(false);

    // Which route the view has already been framed on.
    const fittedRef = useRef(null);
    const [state, setState] = useState("loading");

    const first = markers[0];
    const markerSignature = markers
        .map((m) => (m.title || "") + ":" + m.lat + "," + m.lon + ":" + (m.color || ""))
        .join("|");

    const vehicle = markers.find((m) => m.kind === "vehicle");

    /*
     * The rider placed on his route, and the route shortened to what is left.
     *
     * Worked out here, from the line already on screen, rather than asked of
     * the server - so it happens on every fix that arrives instead of only
     * when a fresh route is computed. That is the whole of "the line only cut
     * when I reloaded": nothing was wrong with the updates, there was simply
     * nothing in the page that shortened a line.
     */
    const geo = useMemo(() => {
        if (!encodedPolyline) return { point: null, remaining: null, heading: null };

        return snapToRoute(
            decodePath(encodedPolyline),
            vehicle ? { lat: vehicle.lat, lng: vehicle.lon } : null,
        );
        // The rider's coordinates, not the object holding them: `markers` is
        // rebuilt by the parent on every render, so depending on the object
        // would recompute this on renders where nothing has actually moved.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [encodedPolyline, vehicle?.lat, vehicle?.lon]);

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
                    // map-type switch.
                    disableDefaultUI: true,

                    /*
                     * A tracking page is looked at, not explored.
                     *
                     * Pinning the two zoom limits together is what actually
                     * stops a pinch: there is no setting for "pan but do not
                     * zoom", and gestureHandling "none" would take the drag
                     * away too - which matters, because a customer whose rider
                     * has moved off the edge still has to be able to follow
                     * him.
                     */
                    /*
                     * The wheel and the double click go now; the pinch is
                     * stopped later, once the view has settled.
                     *
                     * Locking min and max here was wrong and it broke the map:
                     * fitBounds cannot zoom past a limit, so pinning both ends
                     * to the starting zoom meant a fit that was supposed to
                     * frame the rider and the door was clamped, and one of
                     * them ended up off the screen. The lock belongs after the
                     * fit, at whatever zoom the fit chose - see lockAfterFit().
                     */
                    ...(lockZoom ? { scrollwheel: false, disableDoubleClickZoom: true } : {}),
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

        if (!encodedPolyline || !geo.remaining) {
            if (lineRef.current) {
                lineRef.current.setMap(null);
                lineRef.current = null;
            }
            return;
        }

        const path = geo.remaining;

        /*
         * Moved, not rebuilt.
         *
         * This line is redrawn on every fix now that it shortens as he rides,
         * and tearing a polyline down to put an almost identical one back
         * makes it blink each time. Setting the path leaves the same object
         * on the map and simply changes where it goes.
         */
        if (lineRef.current) {
            lineRef.current.setPath(path);
        } else {
            lineRef.current = new maps.Polyline({
                map, path,
                strokeColor: "#2563eb",
                strokeOpacity: 0.9,
                strokeWeight: 5,
                zIndex: 1,
            });
        }

        // Framed on the route once. Refitting as it shortens would creep the
        // view in on the rider while somebody is looking at the far end of it.
        if (follow || fittedRef.current === encodedPolyline) return;
        fittedRef.current = encodedPolyline;

        const bounds = new maps.LatLngBounds();
        path.forEach((pt) => bounds.extend(pt));
        map.fitBounds(bounds, 30);
        lockAfterFit();
        hasFitRef.current = true;
        // lockAfterFit only reads refs and the lockZoom flag, neither of which
        // changes across a render in a way this effect should chase.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [encodedPolyline, state, geo.remaining, follow]);

    /*
     * Following: the rider stays under the middle of the map.
     *
     * Held off while the customer is looking somewhere themselves - dragging
     * hands control over, and ten quiet seconds hands it back. Taking it for
     * good would strand somebody who nudged the map once at the start of a
     * twenty minute ride; taking it back at once would make the map impossible
     * to read at all.
     */
    const heldRef = useRef(false);
    const releaseRef = useRef(null);

    useEffect(() => {
        const maps = mapsRef.current;
        const map = mapRef.current;
        if (!follow || state !== "ready" || !maps || !map) return undefined;

        const hold = () => {
            heldRef.current = true;
            clearTimeout(releaseRef.current);
            releaseRef.current = setTimeout(() => { heldRef.current = false; }, HANDS_OFF_MS);
        };

        const listener = map.addListener("dragstart", hold);

        return () => {
            listener.remove();
            clearTimeout(releaseRef.current);
        };
    }, [follow, state]);

    const followedRef = useRef(false);

    useEffect(() => {
        const map = mapRef.current;
        if (!follow || state !== "ready" || !map || !geo.point || heldRef.current) return;

        // The zoom is set once. After that it is the centre that moves, so a
        // locked map is never asked for a zoom it is not allowed to have.
        if (!followedRef.current) {
            followedRef.current = true;
            map.setZoom(zoom);
            lockAfterFit();
        }

        map.panTo({ lat: geo.point.lat, lng: geo.point.lng });
        // lockAfterFit only reads refs and the lockZoom flag.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [follow, state, zoom, geo.point]);

    useEffect(() => () => {
        Object.values(markerRefs.current).forEach((m) => {
            if (m?.pulse) clearInterval(m.pulse);
        });
        markerRefs.current = {};
    }, []);

    /*
     * The dashed arc, drawn whenever there are two ends to join.
     *
     * Taken down as soon as the road route arrives: two lines between the same
     * two points is one line too many, and the real route is the better of the
     * two. Until then this is what tells the customer somebody is on the way
     * and roughly from where.
     */
    useEffect(() => {
        const maps = mapsRef.current;
        const map = mapRef.current;
        if (state !== "ready" || !maps || !map) return;

        if (arcRef.current) {
            arcRef.current.setMap(null);
            arcRef.current = null;
        }

        if (!arc?.from || !arc?.to || encodedPolyline) return;

        arcRef.current = new maps.Polyline({
            map,
            path: arcBetween(arc.from, arc.to),

            // The line itself is invisible; the dashes along it are the line.
            strokeOpacity: 0,
            icons: [{ icon: { ...DASH, strokeColor: "#0f78d0" }, offset: "0", repeat: "15px" }],
            zIndex: 1,
        });
        // The object is rebuilt by the parent every render, so depend on the
        // four numbers in it rather than on its identity.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state, encodedPolyline, arc?.from?.lat, arc?.from?.lon, arc?.to?.lat, arc?.to?.lon]);

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
            /*
             * The rider goes where the route says, everybody else where their
             * own coordinates say. A fix taken among buildings is routinely
             * ten or twenty metres out, which at this zoom is the width of a
             * house - enough to sit the bike in somebody's garden beside the
             * road it is plainly travelling along.
             */
            const position = (m.kind === "vehicle" && geo.point)
                ? { lat: geo.point.lat, lng: geo.point.lng }
                : { lat: m.lat, lng: m.lon };
            /*
             * A bike for whoever is travelling, the waiting mark for whoever
             * has not set off, a pin for the place they are going. Anything
             * that says none of those gets the pin, so every other map in the
             * panel is untouched.
             */
            const iconFor = () => (m.kind === "vehicle"
                ? riderIcon(maps, geo.heading ?? 0)
                : m.kind === "waiting"
                    ? waitingIcon(maps)
                    : pinIcon(maps, m.color || "#2563eb"));

            const existing = markerRefs.current[key];

            /*
             * Compared the short way round. 359 and 1 degrees are two degrees
             * apart, not three hundred and fifty eight, and a rider crossing
             * due north must not redraw as if he had spun on the spot.
             */
            const turn = ((geo.heading ?? 0) - (existing?.heading ?? 0) + 540) % 360 - 180;
            const heading = (existing?.heading ?? 0) + turn;

            if (existing) {
                existing.marker.setPosition(position);

                /*
                 * And the icon, when what it is has changed.
                 *
                 * This was the bug behind "I tapped Directions and the bike
                 * only appeared after a reload". A marker is matched by title,
                 * and the technician's title does not change when he sets off -
                 * so the marker was found, moved, and returned, and the waiting
                 * mark stayed where a bike should have been. Only a reload
                 * rebuilt it, which is exactly what Mohan had to do.
                 */
                if (existing.kind !== m.kind) {
                    if (existing.pulse) clearInterval(existing.pulse);

                    existing.marker.setIcon(iconFor());
                    existing.kind = m.kind;
                    existing.heading = heading;
                    existing.pulse = m.kind === "waiting" ? startPulse(maps, existing.marker) : null;
                    return;
                }

                /*
                 * And turned, when the road has turned under him.
                 *
                 * The icon is a drawing rotated to a bearing, so a new angle
                 * means a new image - and swapping the image on every fix,
                 * for a bearing that has moved a fraction of a degree along a
                 * straight road, makes the bike flicker. A couple of degrees
                 * is below what anybody can see and well above GPS noise.
                 */
                if (m.kind === "vehicle" && Math.abs(heading - (existing.heading ?? 0)) >= 2) {
                    existing.marker.setIcon(iconFor());
                    existing.heading = heading;
                }

                return;
            }

            const marker = new maps.Marker({
                map, position,
                icon: iconFor(),
                title: key,

                // Above the destination pin, so the two never hide each other
                // as the rider arrives.
                zIndex: (m.kind === "vehicle" || m.kind === "waiting") ? 50 : 2 + i,
            });

            markerRefs.current[key] = {
                marker,
                kind: m.kind,
                heading: geo.heading ?? 0,
                pulse: m.kind === "waiting" ? startPulse(maps, marker) : null,
            };
        });

        // Drop any marker no longer in the list.
        Object.keys(markerRefs.current).forEach((key) => {
            if (seen.has(key)) return;

            // The pulse is a timer, and a timer outliving its marker keeps the
            // tab awake for a marker nobody can see.
            const gone = markerRefs.current[key];
            if (gone.pulse) clearInterval(gone.pulse);
            gone.marker.setMap(null);

            delete markerRefs.current[key];
        });

        // Frame the pins once. Refitting on every update would yank the view
        // back each time the live marker moved.
        if (!follow && !hasFitRef.current && markers.length) {
            if (markers.length === 1) {
                map.setCenter({ lat: markers[0].lat, lng: markers[0].lon });
                map.setZoom(zoom);
            } else {
                const bounds = new maps.LatLngBounds();
                markers.forEach((m) => bounds.extend({ lat: m.lat, lng: m.lon }));
                /*
                  * Close in, with just enough margin to keep both ends off the
                  * edge.
                  *
                  * Padding is what decides the zoom here - more of it pushes
                  * the view further out - and the whole point of this map is
                  * the dashed arc and the route between the two points. Read
                  * from across a room they have to be lines, not a hairline
                  * across a picture of the town.
                  */
                map.fitBounds(bounds, 34);
            }
            lockAfterFit();
            hasFitRef.current = true;
        }
        // The array is rebuilt by the parent on every render, so depend on the
        // coordinates it carries rather than its identity.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [markerSignature, state, zoom, geo.point, geo.heading, follow]);

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
