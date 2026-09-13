import { useSyncExternalStore } from "react";
import { api } from "../../services/api";
import {
    LOGO, HERO, HERO_TEAM, HERO_TILES, AT_THE_DOOR, ON_THE_WAY, APP_SHOT,
} from "./brand";

/**
 * The drawings the site is showing today.
 *
 * Every picture here also exists as a constant in `brand.js`, and that is
 * deliberate: those are the drawings as commissioned, they ship with the
 * bundle, and they are what the page paints before any request has come back.
 * The office can point a slot somewhere else - a new hero, a redrawn
 * doorstep - and this is where that choice arrives.
 *
 * A store rather than a hook with its own fetch, because eight components ask
 * for these and eight requests for the same tiny object would be absurd. One
 * request on the first mount, and everything that has asked re-renders when it
 * lands.
 *
 * Failure is silent and total: the site keeps the drawings it shipped with.
 * There is no state in which a reader waits for this or sees a hole where a
 * picture should be.
 */
const SHIPPED = Object.freeze({
    LOGO,
    HERO_TEAM,
    HERO_VISIT: HERO,
    HERO_AC: HERO_TILES[0],
    HERO_ELECTRICAL: HERO_TILES[1],
    AT_THE_DOOR,
    ON_THE_WAY,
    APP_SHOT,
});

let current = SHIPPED;
let asked = false;

const listeners = new Set();

const subscribe = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
};

/**
 * Fetched once per page load, by whoever mounts first.
 *
 * Not on every navigation: these change when the office changes them, which is
 * rarely, and a request per page view would cost more than the pictures do.
 */
const pull = async () => {
    if (asked) return;
    asked = true;

    try {
        const res = await api.get("/customer/images");
        const chosen = res.data?.data || {};

        // Only slots the site actually knows about, and only ones with
        // something in them - an empty string would blank a picture
        const merged = { ...SHIPPED };
        Object.keys(SHIPPED).forEach((slot) => {
            if (chosen[slot]) merged[slot] = chosen[slot];
        });

        const changed = Object.keys(merged).some((slot) => merged[slot] !== current[slot]);
        if (!changed) return;

        current = Object.freeze(merged);
        listeners.forEach((fn) => fn());
    } catch {
        // The shipped set is already on screen and is perfectly good
    }
};

/** Called once from the shell, so no page has to remember to. */
export const loadPictures = () => { pull(); };

/**
 * The current set. The same frozen object until something actually changes,
 * which is what `useSyncExternalStore` needs to avoid re-rendering forever.
 */
export const usePictures = () => useSyncExternalStore(subscribe, () => current, () => SHIPPED);
