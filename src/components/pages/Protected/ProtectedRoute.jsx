import { Navigate } from "react-router-dom";
import { useAdminAuth } from "../Admin/adminAuthContext";
import { BrandLoader } from "../../ui/BrandLoader";

// Shown while the session check runs, so the login page doesn't flash at
// somebody who is already signed in.
const FullScreenLoader = () => <BrandLoader label="Checking your session" />;

// Pass requiredPermission to limit a route to a specific role.
export const AdminProtectedRoute = ({ children, requiredPermission }) => {
    const { admin, loading, hasPermission } = useAdminAuth();

    if (loading) return <FullScreenLoader />;
    if (!admin) return <Navigate to="/admin/login" replace />;

    // Stops a backoffice user reaching an owner-only page by typing the URL.
    if (requiredPermission && !hasPermission(requiredPermission)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
                <div className="cg-lift p-8 max-w-sm text-center">
                    <h1 className="text-lg font-bold text-ink mb-2">Access restricted</h1>
                    <p className="text-ink-soft text-sm">
                        This section is available to owners only. Contact the owner if you need access.
                    </p>
                </div>
            </div>
        );
    }

    return children;
};