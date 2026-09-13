import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAdminAuth } from "../Admin/adminAuthContext";
import { DEV_TOKENS } from "./theme";

/**
 * The owner, or nobody.
 *
 * A backoffice sign-in is not enough here. The server refuses these endpoints
 * to anyone but the owner anyway, so this is about what a person sees rather
 * than about what they can do: a staff account that wandered in would
 * otherwise get a screen full of failed requests instead of being told plainly
 * that this door is not theirs.
 */
export const DeveloperRoute = ({ children }) => {
    const { admin, loading } = useAdminAuth();

    if (loading) {
        return (
            <div style={DEV_TOKENS} className="min-h-screen bg-[var(--dev-paper)] grid place-items-center">
                <Loader2 className="w-5 h-5 animate-spin text-[var(--dev-faint)]" />
            </div>
        );
    }

    if (!admin) return <Navigate to="/developer/login" replace />;

    if (admin.role !== "superadmin") {
        return (
            <div style={DEV_TOKENS} className="min-h-screen bg-[var(--dev-paper)] text-[var(--dev-ink)] grid place-items-center px-6 text-center">
                <div className="max-w-sm">
                    <p className="font-semibold text-[16px]">This platform is the owner&rsquo;s.</p>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--dev-soft)]">
                        It holds the credentials the whole company runs on. Your backoffice sign-in
                        works everywhere else.
                    </p>
                    <a
                        href="/admin"
                        className="mt-5 inline-flex items-center h-10 px-5 rounded-xl bg-[var(--dev-ink)] text-white text-[13.5px] font-semibold"
                    >
                        Back to the backoffice
                    </a>
                </div>
            </div>
        );
    }

    return children;
};

export default DeveloperRoute;
