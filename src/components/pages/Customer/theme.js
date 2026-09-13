import { useEffect, useSyncExternalStore } from "react";

/**
 * Light and dark, for the customer pages only.
 *
 * The half-dark page it replaces was the mistake: a navy masthead sitting on a
 * paper body reads as two designs that met in the middle, and no amount of
 * tuning the navy fixes that. A page is either dark or it is not.
 *
 * It is scoped rather than global on purpose. The staff panels - admin,
 * owner, the engineer's own screens - are tools people use in an office all
 * day and were designed against one palette; flipping their colours from a
 * button on the public site would be changing somebody else's workplace. So
 * the token overrides hang off a class on the customer shell, and everything
 * inside it follows because every colour in this app is already a variable.
 *
 * Nothing is stored until the reader actually chooses. Until then the page
 * follows the machine, and keeps following it - somebody who switches their
 * laptop to dark at sunset should see this go with it.
 */
const STORE = "cg.theme";

const systemPrefersDark = () =>
    typeof window !== "undefined"
    && window.matchMedia("(prefers-color-scheme: dark)").matches;

const read = () => {
    try {
        const saved = localStorage.getItem(STORE);
        return saved === "dark" || saved === "light" ? saved : null;
    } catch {
        return null;
    }
};

let chosen = read();
const watchers = new Set();

const announce = () => watchers.forEach((fn) => fn());

/** "light" or "dark" - what the page should actually be right now. */
export const resolvedTheme = () => chosen || (systemPrefersDark() ? "dark" : "light");

export const setTheme = (value) => {
    chosen = value === "dark" || value === "light" ? value : null;

    try {
        if (chosen) localStorage.setItem(STORE, chosen);
        else localStorage.removeItem(STORE);
    } catch {
        // A browser with storage off still gets a working page; it just
        // forgets the choice when the tab closes.
    }

    announce();
};

const subscribe = (fn) => {
    watchers.add(fn);
    return () => watchers.delete(fn);
};

export const useTheme = () => {
    const theme = useSyncExternalStore(subscribe, resolvedTheme, () => "light");

    /*
     * Follow the machine for as long as nobody has overridden it.
     *
     * Without this the page would pick a side at load and then sit there while
     * the operating system changed around it, which is the version of this
     * feature everybody complains about.
     */
    useEffect(() => {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const onChange = () => { if (!chosen) announce(); };
        mq.addEventListener("change", onChange);
        return () => mq.removeEventListener("change", onChange);
    }, []);

    return theme;
};
