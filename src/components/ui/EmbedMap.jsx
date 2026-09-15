const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

/**
 * A map that costs nothing to look at.
 *
 * Google sells map views three ways, and the difference between them is the
 * whole reason this file exists:
 *
 *   - the JavaScript SDK, about $7 per thousand loads, which is what every
 *     "where is this vendor" click used to spend
 *   - the Static API, about $2 per thousand, a picture of a map
 *   - the **Embed API**, which is free, with no cap
 *
 * For the office simply looking at where somebody is, the embed does
 * everything the SDK did - it pans, it zooms, it has satellite view, it hands
 * over to the real Google Maps. What it cannot do is take instructions from
 * our own code: no marker we draw, no route we trace, no pin the user moves.
 *
 * So the rule in this project is: if the page only needs to *show* a place,
 * it uses this. The SDK is loaded only where something has to move on the map
 * - live tracking - and nowhere else.
 *
 * Falls back to OpenStreetMap when there is no key at all, which keeps a
 * developer with an empty .env looking at a map rather than a grey box. OSM's
 * embed is free too and needs nothing.
 */
const OSM_SPAN = 0.008;

const osmSrc = (lat, lon) => {
    const box = [lon - OSM_SPAN, lat - OSM_SPAN / 2, lon + OSM_SPAN, lat + OSM_SPAN / 2];
    return "https://www.openstreetmap.org/export/embed.html"
        + "?bbox=" + box.join("%2C")
        + "&layer=mapnik&marker=" + lat + "%2C" + lon;
};

const googleSrc = (lat, lon, zoom) =>
    "https://www.google.com/maps/embed/v1/place"
    + "?key=" + encodeURIComponent(MAPS_KEY)
    + "&q=" + encodeURIComponent(lat + "," + lon)
    + "&zoom=" + zoom
    + "&maptype=roadmap";

export const EmbedMap = ({ lat, lon, zoom = 16, title = "Location", className = "h-72 sm:h-96" }) => {
    const y = Number(lat);
    const x = Number(lon);

    if (!Number.isFinite(y) || !Number.isFinite(x)) return null;

    return (
        <div className={"w-full overflow-hidden rounded-xl border border-hairline bg-sunken " + className}>
            <iframe
                title={title}
                src={MAPS_KEY ? googleSrc(y, x, zoom) : osmSrc(y, x)}
                className="w-full h-full block border-0"
                // The map is below the fold of a modal that has just opened,
                // and nothing on the page is waiting for it
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
            />
        </div>
    );
};

export default EmbedMap;
