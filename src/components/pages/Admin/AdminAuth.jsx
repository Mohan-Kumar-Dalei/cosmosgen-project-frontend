import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { api, getErrorMessage } from "../../services/api";
import { can } from "../../config/permissions";
import { AdminAuthContext } from "./adminAuthContext";

export const AdminAuthProvider = ({ children }) => {
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);
    const { pathname } = useLocation();

    // The developer platform signs in with the same owner account, so its
    // pages need the session restored the same way
    const isAdminRoute = pathname.startsWith("/admin")
        || pathname.startsWith("/owner")
        || pathname.startsWith("/developer");

    const isSuperAdmin = admin?.role === "superadmin";
    const hasPermission = (permission) => can(admin?.role, permission);

    const checkSession = useCallback(async () => {
        try {
            const res = await api.get("/admin/me");
            setAdmin(res.data.data);
            return true;
        } catch {
            setAdmin(null); // no cookie or expired - login will show
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    /*
     * Restore the session whenever an office page is on screen.
     *
     * Only on those pages: a customer reading the website, or a technician in
     * their own panel, has no admin cookie, so asking would log a 401 in their
     * console and buy nothing.
     *
     * The route is read from the router rather than from `window.location`,
     * which is what it used to do. That version ran once, at mount, against
     * the address the tab happened to open at - so an admin who landed on the
     * homepage and clicked through to /admin/login was never checked, and saw
     * a login form despite holding a perfectly good cookie until they
     * reloaded the page.
     */
    useEffect(() => {
        if (!isAdminRoute) return;

        // Already answered - moving between office pages must not re-ask on
        // every navigation, which is what made this a provider and not a hook
        if (admin) return;

        checkSession();
    }, [isAdminRoute, admin, checkSession]);

    const login = async (email, password, portal, secret) => {
        try {
            const res = await api.post("/admin/login", { email, password, portal, secret });

            // Read the session back from the server rather than trusting the
            // login response. If the cookie didn't stick - blocked by the
            // browser, wrong SameSite, mismatched secret - this catches it
            // here instead of on the next reload, when it looks like a
            // random logout.
            const ok = await checkSession();
            if (!ok) {
                return {
                    success: false,
                    message: "Signed in, but the session didn't save. Check that cookies are allowed for this site.",
                };
            }

            setAdmin(res.data.data);
            return { success: true };
        } catch (error) {
            return { success: false, message: getErrorMessage(error, "Sign in failed") };
        }
    };

    const logout = async () => {
        try {
            await api.post("/admin/logout");
        } catch {
            // ignore
        }
        setAdmin(null);
    };

    return (
        <AdminAuthContext.Provider
            value={{
                admin,
                // Only an office page is ever waiting on an answer. Elsewhere
                // no request goes out at all, so reporting "still loading"
                // would leave anything reading this spinning for good.
                loading: isAdminRoute && loading,
                login,
                logout,
                checkSession,
                isSuperAdmin,
                hasPermission,
            }}
        >
            {children}
        </AdminAuthContext.Provider>
    );
};