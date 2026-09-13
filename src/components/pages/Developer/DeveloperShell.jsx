import { Link, useNavigate } from "react-router-dom";
import { LogOut, Terminal } from "lucide-react";
import { useAdminAuth } from "../Admin/adminAuthContext";
import { DEV_TOKENS } from "./theme";

/**
 * The platform's own engine room, behind its own door.
 *
 * Deliberately not a tab in the backoffice. What is in here is not a decision
 * about the business - it is the credentials the whole company runs on, and
 * the desk has no reason to see them, no reason to be able to switch one off,
 * and every reason not to click on one by accident. The sign-in is the owner's
 * own, security key and all, so this is the one screen the office cannot reach
 * at all.
 *
 * The first version of it was near-black, on the theory that a tool used under
 * pressure should look like a terminal. It read as unfinished rather than as
 * serious. The warm paper below is the same ground the rest of Cosmosgen is
 * built on, which is the point: this is part of the product, not a debug page
 * somebody left in.
 */

export const DeveloperShell = ({ children }) => {
    const { admin, logout } = useAdminAuth();
    const navigate = useNavigate();

    const signOut = async () => {
        await logout();
        navigate("/developer/login");
    };

    return (
        <div
            style={DEV_TOKENS}
            className="min-h-screen font-sans bg-[var(--dev-paper)] text-[var(--dev-ink)]"
        >
            <header className="sticky top-0 z-30 bg-[var(--dev-paper)]/90 backdrop-blur-xl border-b border-[var(--dev-line)]">
                <div className="mx-auto max-w-5xl px-5 sm:px-8 h-14 flex items-center gap-4">
                    <Link to="/developer" className="flex items-center gap-2.5 shrink-0">
                        <span className="w-7 h-7 rounded-lg bg-[var(--dev-ink)] text-[var(--dev-paper)] grid place-items-center">
                            <Terminal className="w-4 h-4" />
                        </span>
                        <span className="flex flex-col leading-none">
                            <span className="font-semibold text-[14px] tracking-tight">Cosmosgen</span>
                            <span className="text-[8.5px] uppercase tracking-[0.2em] mt-1 text-[var(--dev-faint)]">
                                Developer
                            </span>
                        </span>
                    </Link>

                    <div className="ml-auto flex items-center gap-3">
                        {admin && (
                            <span className="hidden sm:block text-[12.5px] text-[var(--dev-faint)]">
                                {admin.email}
                            </span>
                        )}

                        <Link
                            to="/admin"
                            className="text-[12.5px] text-[var(--dev-soft)] hover:text-[var(--dev-ink)] transition-colors"
                        >
                            Backoffice
                        </Link>

                        <button
                            onClick={signOut}
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--dev-line)] bg-[var(--dev-card)] text-[12.5px] text-[var(--dev-soft)] hover:text-[var(--dev-ink)] transition-colors"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            Sign out
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-5xl px-5 sm:px-8 py-8 pb-20">{children}</main>
        </div>
    );
};

export default DeveloperShell;
