/**
 * The customer pages, and how to fetch one before it is asked for.
 *
 * Every page in this app is split into its own chunk, which is the right call
 * for the office's screens - nobody visiting the website should download the
 * payments panel. On the public site it has a cost the office never feels: a
 * visitor pressing "Services" waits for a request to go out, come back and
 * parse before anything happens. On a desk that is a tenth of a second. On a
 * phone on mobile data it is a second or two of a page that looks frozen, and
 * the chunks are small enough that the wait is almost entirely the round trip
 * rather than the bytes.
 *
 * So the site fetches them while nobody is waiting. The map lives here rather
 * than inside the router so that both the router's `lazy()` and the warmer
 * name the same module: a dynamic import is cached by its specifier, so the
 * page a visitor lands on has already been fetched and parsed by the time
 * they press anything, and `lazy()` resolves without a request at all.
 */
export const CUSTOMER_ROUTES = {
    "/": () => import("../components/pages/Customer/CustomerHome"),
    "/services": () => import("../components/pages/Customer/CustomerServices"),
    "/how-it-works": () => import("../components/pages/Customer/CustomerHowItWorks"),
    "/pricing": () => import("../components/pages/Customer/CustomerPricing"),
    "/chat": () => import("../components/pages/Customer/CustomerAssistant"),
    "/about": () => import("../components/pages/Customer/CustomerAbout"),
    "/faq": () => import("../components/pages/Customer/CustomerFaq"),
    "/join": () => import("../components/pages/Customer/CustomerJoin"),
    "/account": () => import("../components/pages/Customer/CustomerAccount"),
};

/** One page, fetched now. Safe to call as often as you like. */
export const warmRoute = (path) => {
    const load = CUSTOMER_ROUTES[path];
    if (load) load().catch(() => { /* offline, or the chunk has moved on a redeploy */ });
};

let warmed = false;

/**
 * The rest of the site, fetched once the browser has nothing better to do.
 *
 * Deliberately after `load` and inside an idle callback: the page a visitor
 * actually asked for comes first, and warming must never take bandwidth or
 * main thread from it. Browsers without `requestIdleCallback` get a timer,
 * which is the same idea with worse manners.
 */
export const warmCustomerRoutes = (except) => {
    if (warmed || typeof window === "undefined") return;
    warmed = true;

    const run = () => {
        for (const [path, load] of Object.entries(CUSTOMER_ROUTES)) {
            if (path === except) continue;
            load().catch(() => { /* as above */ });
        }
    };

    const queue = () => {
        if (typeof window.requestIdleCallback === "function") {
            window.requestIdleCallback(run, { timeout: 4000 });
        } else {
            setTimeout(run, 1200);
        }
    };

    if (document.readyState === "complete") queue();
    else window.addEventListener("load", queue, { once: true });
};
