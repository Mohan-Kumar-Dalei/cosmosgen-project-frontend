/**
 * The geometry a live map needs, kept out of the components that draw with it.
 *
 * Both the tracking page and the map it renders ask the same questions of a
 * route, so the answers live here rather than inside either of them.
 */

/**
 * Where the rider is on the route, which way the road points there, and what
 * is left of the journey.
 *
 * Three questions with one answer, because they come from one measurement:
 * the closest point on the drawn line to the last fix. The same function, on
 * the same reasoning, is in the customer app - see customer-app/src/route.js,
 * where the long version of why is written down.
 *
 * In short: the bike used to point north whatever the road did; the blue line
 * was drawn once and never shortened, so only a reload ever cut it; and a fix
 * taken between buildings sat the bike in the gardens beside the road.
 */

/**
 * Google hands a route back as an encoded string rather than a list of points.
 *
 * Its own maps.geometry.encoding.decodePath does this, but only once the maps
 * library has loaded - and the route has to be unpacked while the component
 * renders, before any of that is reachable. This is the published algorithm,
 * the same one the customer app carries; there is no shorter honest version.
 */
export const decodePath = (encoded) => {
    const points = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
        let result = 0;
        let shift = 0;
        let byte;

        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        lat += (result & 1) ? ~(result >> 1) : result >> 1;

        result = 0;
        shift = 0;

        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        lng += (result & 1) ? ~(result >> 1) : result >> 1;

        points.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }

    return points;
};

const RAD = Math.PI / 180;

/** Metres per degree of latitude. Longitude shrinks by cos(lat). */
const DEG_M = 111320;

const bearingBetween = (a, b) => {
    const lat1 = a.lat * RAD;
    const lat2 = b.lat * RAD;
    const dLng = (b.lng - a.lng) * RAD;

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

    return (Math.atan2(y, x) / RAD + 360) % 360;
};

export const snapToRoute = (points, at, maxDrift = 45) => {
    const idle = { point: at || null, remaining: points || null, heading: null };

    if (!at || !points || points.length < 2) return idle;

    /*
     * Flat maths, on purpose. Projecting a point onto a segment is arithmetic
     * great-circle formulae cannot do directly, and across the few kilometres
     * a job covers the error from treating the earth as flat is centimetres.
     * Longitude is scaled by cos(latitude) so that "closest" means closest
     * rather than closest-if-you-are-on-the-equator.
     */
    const k = Math.cos(at.lat * RAD);
    const px = at.lng * k;
    const py = at.lat;

    let best = null;

    for (let i = 0; i < points.length - 1; i += 1) {
        const a = points[i];
        const b = points[i + 1];

        const ax = a.lng * k;
        const ay = a.lat;
        const dx = b.lng * k - ax;
        const dy = b.lat - ay;

        const len2 = dx * dx + dy * dy;

        // Clamped to the segment, so a point past either end lands on the end
        // rather than on the line's imaginary continuation.
        const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;

        const fx = ax + t * dx;
        const fy = ay + t * dy;
        const gap = (px - fx) * (px - fx) + (py - fy) * (py - fy);

        if (!best || gap < best.gap) {
            best = { gap, index: i, point: { lat: fy, lng: fx / k } };
        }
    }

    const heading = bearingBetween(points[best.index], points[best.index + 1]);

    // Too far from the line to be noise around it: he has turned off the
    // route, or the route is stale. Leave him where the fix says and keep the
    // whole line until a fresh one arrives.
    if (Math.sqrt(best.gap) * DEG_M > maxDrift) return { ...idle, heading };

    return {
        point: best.point,
        remaining: [best.point, ...points.slice(best.index + 1)],
        heading,
    };
};
