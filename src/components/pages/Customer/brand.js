/**
 * The company's pictures, its mark and its one outward link, in one place.
 *
 * The rest of the app repeats the logo URL in a dozen files, so changing it
 * means finding all of them. The customer pages ask here instead - and because
 * every photograph on these pages is named here rather than pasted into a
 * component, swapping the whole set is one edit.
 */
const IK = "https://ik.imagekit.io/h7wep5nji/cosmosgen/";

/**
 * The version of the artwork this build ships with.
 *
 * A picture replaced on ImageKit under the name it already had is invisible
 * to everybody who has seen the old one: the URL has not changed, so the
 * browser and the CDN both keep serving what they cached. The site normally
 * gets around that because the office's own copy of a URL carries a stamp
 * from the day it was saved - but that copy arrives from the server, and a
 * build sitting on a host with no server to ask falls back to the names
 * below, unstamped, and shows last month's drawing.
 *
 * So the bundled set carries a stamp of its own. Bump it whenever artwork is
 * replaced without being renamed; it costs one fresh fetch per picture and
 * nothing after that.
 */
const V = "2026-09-15";

/** A bundled picture, stamped so a replaced file is actually seen. */
const pic = (file) => IK + file + "?v=" + V;

/**
 * ImageKit resizes on the URL, so a card asks for a card-sized file instead of
 * pulling a 3000px original down a phone connection. Anything that is not on
 * ImageKit is handed back untouched.
 */
export const ik = (url, tr) => {
    if (!url || !tr || !url.startsWith(IK)) return url;
    return url + (url.includes("?") ? "&" : "?") + "tr=" + tr;
};

export const LOGO = pic("cosmosgen-logo.png");

/* ---------- THE PICTURES ----------
   The customer's own set, drawn in the same 3D style as the vendor app's
   onboarding screens: characters and objects on a transparent ground, in the
   company's uniform, with no scene behind them. That is why every one of these
   is a PNG and why the components sit them on a tinted panel rather than
   cropping them to fill a frame - a cutout cropped to a box loses its feet.

   The "slide-" files stay out of here on purpose: they are drawn for somebody
   joining as an engineer, not for somebody booking one. Any picture not
   uploaded yet falls back to a tinted panel, so nothing breaks and nothing
   shows a torn-page icon while the set is being filled in. */

/**
 * Somebody from the team at a customer's door, listening to the job.
 *
 * This used to point at "cg-hero-visit.png.png", which was not a typo but the
 * name the file had actually been uploaded under. It has since been uploaded
 * properly, and the office's own copy points at the single-extension name, so
 * the bundled default follows it - otherwise a build with no server to ask
 * shows a drawing nobody has looked at in weeks.
 */
export const HERO = pic("cg-hero-visit.png");

/**
 * The team itself: several engineers together, each holding the tool of their
 * own trade.
 *
 * The home page opens on this rather than on one engineer at a door, because
 * the first thing the page has to say is that the company covers a house, not
 * a machine - four trades standing together says that before a word is read.
 * Until the drawing is uploaded the single-visit picture stands in, so the
 * page is never waiting on an asset.
 */
export const HERO_TEAM = pic("cg-hero-team.png");

/** The two smaller pictures stacked beside the headline. */
export const HERO_TILES = [
    pic("cg-hero-ac.png"),
    pic("cg-hero-electrical.png"),
];

/** Somebody reading a code out at their own front door. */
export const AT_THE_DOOR = pic("cg-at-the-door.png");

/** The van or the bike on the road, for the section about tracking. */
export const ON_THE_WAY = pic("cg-on-the-way.png");

/** One per service key in the catalogue. */
export const SERVICE_IMAGE = {
    AC_APPLIANCE: pic("service-appliance.png"),
    ELECTRICAL: pic("service-electrical.png"),
    PLUMBING: pic("service-plumbing.png"),
    HOME_CLEANING: pic("service-cleaning.png"),
    // Not sold yet, but the catalogue is the office's to change and a new
    // service should arrive on the website with a picture already waiting
    CARPENTRY: pic("service-carpentry.png"),
    PEST_CONTROL: pic("service-pest.png"),
    PAINTING: pic("service-painting.png"),
};

/** One per appliance under AC & Appliance Repair. */
export const APPLIANCE_IMAGE = {
    AC: pic("appliance-ac.png"),
    FRIDGE: pic("appliance-fridge.png"),
    WASHING_MACHINE: pic("appliance-washing-machine.png"),
    MICROWAVE: pic("appliance-microwave.png"),
    GEYSER: pic("appliance-geyser.png"),
    WATER_PURIFIER: pic("appliance-water-purifier.png"),
};

/** The phone in a hand, for the strip about the app. */
export const APP_SHOT = pic("cg-app-shot.png");

/**
 * The number people actually book on.
 *
 * Set VITE_WHATSAPP_NUMBER in the environment; the fallback keeps the buttons
 * pointing somewhere sane in development rather than at a dead link.
 */
const NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "918260866144";

export const WHATSAPP_LINK =
    "https://wa.me/" + NUMBER + "?text=" + encodeURIComponent("Hi Cosmosgen, I need help with");

/** Where the customer's app will live once it is on the store. */
export const APP_LINK = import.meta.env.VITE_APP_STORE_URL || "";

/**
 * And the engineer's app, which is a different listing.
 *
 * Two apps, two store pages: a customer who installs the vendor app by mistake
 * gets a sign-in screen they cannot pass. Empty until the listing exists, and
 * the badge that uses it says "coming soon" rather than linking nowhere.
 */
export const VENDOR_APP_LINK = import.meta.env.VITE_VENDOR_APP_STORE_URL || "";

/**
 * Which tinted ground a drawing sits on, by its position in a list.
 *
 * The pictures are cutouts with nothing behind them, so the panel under each
 * one is doing the work a photograph's own background would. Rotating through
 * three keeps a row of them from reading as one long tile.
 */
export const tintFor = (index) => ["sky", "leaf", "sand"][index % 3];
