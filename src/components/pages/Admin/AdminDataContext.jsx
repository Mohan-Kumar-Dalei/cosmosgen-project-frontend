import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api } from "../../services/api";
import { useAdminAuth } from "./adminAuthContext";

const AdminDataContext = createContext(null);

/**
 * Every badge number in the backoffice, in one place.
 *
 * They live here rather than inside AdminLayout because AdminLayout is
 * rendered by each page and gets fresh state on every navigation. The page
 * that performs a mutation calls refreshCounts() directly instead of waiting
 * for a socket round trip, so the number moves the moment the action succeeds.
 *
 * Every one of these comes from the server's own count, not from a list a
 * screen happens to have loaded. That was the whole trouble before: a tab
 * counted its own rows, so it could only tell you what was waiting on it once
 * you had opened it - the wallet said nothing about a settlement that still
 * needed recording until you were already looking at the wallet.
 */
const EMPTY_COUNTS = {
    // Tickets
    ticketsNew: 0,
    ticketsReturned: 0,
    ticketsQueued: 0,
    ticketsScheduled: 0,
    ticketsActive: 0,

    // Payments
    paymentsToVerify: 0,
    paymentsCash: 0,
    paymentsOnline: 0,
    paymentsVisits: 0,
    wallets: 0,
};

export const AdminDataProvider = ({ children }) => {
    const { admin, loading: authLoading } = useAdminAuth();
    const [counts, setCounts] = useState(EMPTY_COUNTS);
    const [globalRefreshTrigger, setGlobalRefreshTrigger] = useState(0);

    /**
     * Moves a badge the instant a socket event lands.
     *
     * The count used to wait for refreshCounts to make a round trip to
     * /dashboard/stats, so the number arrived a beat after the notification
     * that announced it - which read as lag on a panel that is meant to be
     * live. The socket already carries the news; this applies it immediately
     * and the fetch that follows reconciles the exact figure.
     */
    const bumpCount = useCallback((key, delta = 1) => {
        setCounts((prev) => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) + delta) }));
    }, []);

    const refreshCounts = useCallback(async () => {
        // Fetching before a session exists returns 401, and the axios
        // interceptor redirects on 401 - which bounced the admin straight
        // back to the login page the moment they signed in
        if (!admin) return;

        // Any socket event that triggers refreshCounts will also bump this
        // number, which pages can listen to for auto-refreshing their data
        setGlobalRefreshTrigger((prev) => prev + 1);

        try {
            const res = await api.get("/admin/dashboard/stats");
            const badges = res.data.data.badges || {};
            setCounts({ ...EMPTY_COUNTS, ...badges });
        } catch {
            // Badge counts are decoration - never surface an error for them
        }
    }, [admin]);

    useEffect(() => {
        if (authLoading || !admin) return;

        refreshCounts();
    }, [admin, authLoading, refreshCounts]);

    return (
        <AdminDataContext.Provider value={{ counts, refreshCounts, bumpCount, globalRefreshTrigger }}>
            {children}
        </AdminDataContext.Provider>
    );
};

export const useAdminData = () => {
    const ctx = useContext(AdminDataContext);
    // Pages outside the provider shouldn't crash
    return ctx || {
        counts: EMPTY_COUNTS,
        refreshCounts: () => {},
        bumpCount: () => {},
        globalRefreshTrigger: 0,
    };
};
