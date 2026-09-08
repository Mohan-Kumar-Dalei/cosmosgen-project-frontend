import { useState, useEffect } from "react";
import { api } from "../services/api";

/**
 * Turns a coordinate into the words an office person would use for it.
 *
 * Neither a ticket nor a technician stores a pincode against their live
 * position - only latitude and longitude - so "which area is this" has to be
 * asked of the geocoder. The server caches every answer for a day at about
 * eleven metres of precision, so reopening the same panel costs nothing and
 * two technicians on the same street resolve to one billed call.
 *
 * Returns nulls rather than throwing: a missing area name should never be the
 * reason a location panel fails to open.
 */
const useAreaLookup = (lat, lon, enabled = true) => {
    const hasCoords = Number.isFinite(Number(lat)) && Number.isFinite(Number(lon));
    const key = hasCoords ? lat + "," + lon : null;

    // The answer is stored next to the coordinate it belongs to. That makes
    // "still loading" a comparison rather than a second piece of state the
    // effect has to set on its way in, and it means a stale name from the
    // previous location can never be shown against this one.
    const [result, setResult] = useState({ key: null, place: null });

    useEffect(() => {
        if (!enabled || !key) return;

        let cancelled = false;

        api.get("/map/rev-geocode", { params: { lat, lon } })
            .then((res) => {
                if (cancelled) return;
                const best = res.data?.data?.results?.[0];
                setResult({
                    key,
                    place: best ? {
                        address: best.formatted_address || "",
                        area: best.locality || "",
                        city: best.city || "",
                        state: best.state || "",
                        pincode: best.pincode || "",
                    } : null,
                });
            })
            .catch(() => {
                if (!cancelled) setResult({ key, place: null });
            });

        return () => { cancelled = true; };
    }, [key, lat, lon, enabled]);

    return {
        place: result.key === key ? result.place : null,
        loading: enabled && Boolean(key) && result.key !== key,
    };
};

export default useAreaLookup;
