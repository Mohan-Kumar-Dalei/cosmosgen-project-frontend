import { Navigate } from "react-router-dom";
import { useAdminAuth } from "../Admin/adminAuthContext";

// Spinner while the session check runs, so the login page doesn't flash.
const FullScreenLoader = () => (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50">
        <div className="w-10 h-10 border-4 border-green-700 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500 font-medium">Loading...</p>
    </div>
);

// Pass requiredPermission to limit a route to a specific role.
export const AdminProtectedRoute = ({ children, requiredPermission }) => {
    const { admin, loading, hasPermission } = useAdminAuth();

    if (loading) return <FullScreenLoader />;
    if (!admin) return <Navigate to="/admin/login" replace />;

    // Stops a backoffice user reaching an owner-only page by typing the URL.
    if (requiredPermission && !hasPermission(requiredPermission)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="bg-white rounded-2xl shadow p-8 max-w-sm text-center">
                    <h1 className="text-lg font-bold text-gray-900 mb-2">Access restricted</h1>
                    <p className="text-gray-500 text-sm">
                        This section is available to owners only. Contact the owner if you need access.
                    </p>
                </div>
            </div>
        );
    }

    return children;
};