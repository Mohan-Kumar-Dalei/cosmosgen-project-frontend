import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";

/**
 * Where the visitor is, and what we can actually do there.
 *
 * The catalogue is the same in every town; the people who do the work are not.
 * Showing somebody in a district we have never sent an engineer to the same
 * confident list of services as somebody in Bhubaneswar is a promise the
 * company cannot keep, and they find that out only after describing their
 * problem and waiting for a reply.
 *
 * So the area is asked for once, kept, and every service list on the site is
 * answered against it. Nothing here prompts for the browser's location on its
 * own - a permission box that appears before the visitor has read a word is
 * the fastest way to have it denied for ever. They press the pill, or they
 * type a town.
 */
const AreaContext = createContext(null);

const STORE = "cg.area";

const read = () => {
    try {
        const raw = localStorage.getItem(STORE);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const write = (value) => {
    try {
        if (value) localStorage.setItem(STORE, JSON.stringify(value));
        else localStorage.removeItem(STORE);
    } catch {
        // A browser with storage switched off still gets a working page; it
        // just asks again next time.
    }
};

export const AreaProvider = ({ children }) => {
    // Read once, at mount. A ref would be the obvious home for this but its
    // value would then be read while rendering, which React is right to
    // complain about; a lazy initial state is the same thing done legally.
    const [saved] = useState(read);

    const [status, setStatus] = useState(saved ? "loading" : "idle");
    const [place, setPlace] = useState(saved?.place || null);
    const [services, setServices] = useState([]);
    const [radiusKm, setRadiusKm] = useState(25);
    const [engineers, setEngineers] = useState(0);
    const [error, setError] = useState("");

    /** One call, whether the query is a pin or a typed name. */
    const ask = useCallback(async (params, remember) => {
        setStatus("loading");
        setError("");

        try {
            const res = await api.get("/customer/coverage", { params });
            const data = res.data.data || {};

            setPlace(data.place || null);
            setServices(data.services || []);
            setRadiusKm(data.radiusKm || 25);
            setEngineers(data.engineers || 0);
            setStatus("ready");
            write({ place: data.place || null, params: remember });
            return true;
        } catch (err) {
            setStatus("error");
            setError(err.response?.data?.message || "Could not check that area just now.");
            return false;
        }
    }, []);

    /*
     * What we already knew is re-checked on load rather than trusted.
     *
     * A saved area is a name, not an answer: the engineer who covered it last
     * month may have left. The name shows immediately so the header never
     * flickers, and the availability behind it is refreshed underneath.
     */
    useEffect(() => {
        if (saved?.params) ask(saved.params, saved.params);
    }, [ask, saved]);

    const detect = useCallback(() => {
        if (!navigator.geolocation) {
            setStatus("error");
            setError("This browser cannot share a location. Type your town instead.");
            return;
        }

        setStatus("locating");
        setError("");

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const params = {
                    lat: Number(pos.coords.latitude.toFixed(5)),
                    lon: Number(pos.coords.longitude.toFixed(5)),
                };
                ask(params, params);
            },
            () => {
                setStatus("error");
                setError("Location was not shared. Type your town or pincode instead.");
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 }
        );
    }, [ask]);

    const search = useCallback((q) => {
        const term = String(q || "").trim();
        if (!term) return Promise.resolve(false);
        return ask({ q: term }, { q: term });
    }, [ask]);

    const forget = useCallback(() => {
        write(null);
        setPlace(null);
        setServices([]);
        setStatus("idle");
        setError("");
    }, []);

    const value = useMemo(() => {
        const byKey = new Map(services.map((s) => [s.key, s]));

        return {
            status,
            place,
            services,
            radiusKm,
            error,
            detect,
            search,
            forget,

            /** Whether the area has been settled at all. */
            known: status === "ready" && Boolean(place),

            /** The coverage row for one service, or null while unknown. */
            cover: (key) => byKey.get(key) || null,

            /** People, counted once each however many trades they cover. */
            total: engineers,

            covered: services.some((s) => s.available),
        };
    }, [status, place, services, radiusKm, engineers, error, detect, search, forget]);

    return <AreaContext.Provider value={value}>{children}</AreaContext.Provider>;
};

export const useArea = () => {
    const ctx = useContext(AreaContext);
    if (!ctx) throw new Error("useArea must be used inside AreaProvider");
    return ctx;
};
