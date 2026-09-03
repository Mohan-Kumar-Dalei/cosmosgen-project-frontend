import { createContext, useContext } from "react";

// Kept out of AdminAuth.jsx so that file exports only components. Vite's
// Fast Refresh gives up on a module that mixes components with other
// exports, forcing a full page reload on every edit.
export const AdminAuthContext = createContext(null);

export const useAdminAuth = () => {
    const ctx = useContext(AdminAuthContext);
    if (!ctx) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
    return ctx;
};