import { useState, useEffect, useCallback } from "react";
import { api, getErrorMessage } from "../../services/api";
import { can } from "../../config/permissions";
import { AdminAuthContext } from "./adminAuthContext";

export const AdminAuthProvider = ({ children }) => {
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);

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

    // Restore the session on load. Only on admin routes - a technician
    // opening their own panel has no admin cookie, so this would just log
    // a 401 in their console for nothing.
    useEffect(() => {
        const path = window.location.pathname;
        const isAdminRoute = path.startsWith("/admin") || path.startsWith("/owner");

        if (!isAdminRoute) {
            setLoading(false);
            return;
        }

        checkSession();
    }, [checkSession]);

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
            value={{ admin, loading, login, logout, checkSession, isSuperAdmin, hasPermission }}
        >
            {children}
        </AdminAuthContext.Provider>
    );
};