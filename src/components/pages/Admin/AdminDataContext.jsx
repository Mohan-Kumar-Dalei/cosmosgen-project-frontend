import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api } from "../../services/api";
import { useAdminAuth } from "./adminAuthContext";

const AdminDataContext = createContext(null);

/**
 * Badge counts live here rather than inside AdminLayout, because AdminLayout
 * is rendered by each page and gets fresh state on every navigation. The page
 * that performs a mutation calls refreshCounts() directly instead of waiting
 * for a socket round trip, so the number moves the moment the action succeeds.
 */
export const AdminDataProvider = ({ children }) => {
    const { admin, loading: authLoading } = useAdminAuth();
    const [counts, setCounts] = useState({
        pending: 0,
        rejected: 0,
        scheduled: 0,
        active: 0,
        toVerify: 0,
        wallets: 0,
    });
    const [globalRefreshTrigger, setGlobalRefreshTrigger] = useState(0);

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
            const t = res.data.data.tickets;
            setCounts({
                pending: t.pending || 0,
                rejected: t.rejected || 0,
                scheduled: t.scheduled || 0,
                active: (t.assigned || 0) + (t.inProgress || 0),
                toVerify: res.data.data.awaitingReconcile?.count || res.data.data.unverifiedCash?.count || 0,
                wallets: res.data.data.cashWithTechnicians?.count || 0,
            });
        } catch {
            // Badge counts are decoration - never surface an error for them
        }
    }, [admin]);

    useEffect(() => {
        if (authLoading || !admin) return;

        refreshCounts();
        // Slow poll only as a floor. Real updates come from mutations and sockets.
        const interval = setInterval(refreshCounts, 60000);
        return () => clearInterval(interval);
    }, [admin, authLoading, refreshCounts]);

    return (
        <AdminDataContext.Provider value={{ counts, refreshCounts, globalRefreshTrigger }}>
            {children}
        </AdminDataContext.Provider>
    );
};

export const useAdminData = () => {
    const ctx = useContext(AdminDataContext);
    // Pages outside the provider shouldn't crash
    return ctx || { counts: { pending: 0, toVerify: 0 }, refreshCounts: () => {}, globalRefreshTrigger: 0 };
};