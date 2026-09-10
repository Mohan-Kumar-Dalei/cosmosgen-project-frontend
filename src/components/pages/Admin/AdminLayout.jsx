import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAdminAuth } from "./adminAuthContext";
import { useAdminData } from "./AdminDataContext";
import { adminSocket, connectAdminSocket, disconnectAdminSocket, onLiveResume } from "../../services/socket";
import { notifyNew, notifyAlert, notifyInfo } from "../../services/notify";
import NotifyBadge from "../../ui/NotifyBadge";
import {
    LayoutDashboard, Ticket, Users, Wallet, Package,
    UserCog, TrendingUp, LogOut, Menu, X,
} from "lucide-react";

const AdminLayout = ({ children }) => {
    const { admin, logout, hasPermission } = useAdminAuth();
    const { counts, refreshCounts, bumpCount } = useAdminData();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Rewrite URL to include admin ID if missing
    useEffect(() => {
        if (admin && admin._id) {
            const currentPath = window.location.pathname;
            // e.g., if /admin/tickets, change to /admin/<id>/tickets
            // ensure it hasn't already been injected
            if (currentPath.startsWith("/admin") && !currentPath.includes(admin._id)) {
                // If the path is exactly "/admin", new path is "/admin/<id>"
                // If "/admin/tickets", new path is "/admin/<id>/tickets"
                const suffix = currentPath.replace("/admin", "");
                navigate(`/admin/${admin._id}${suffix}`, { replace: true });
            }
        }
    }, [admin, navigate]);

    const basePath = admin?._id ? `/admin/${admin._id}` : "/admin";

    useEffect(() => {
        connectAdminSocket();

        // Every card says which screen and which tab changed, and opens it.
        // "Ticket cancelled" on its own meant hunting through five tabs for
        // the thing that had just moved.
        // Each screen keeps its default tab on the bare path, because that is
        // the address you get by clicking the tab itself. Sending a link to
        // "?tab=Pending" gave the same view a second URL, so the same queue
        // looked like two different places depending on how you arrived.
        const go = (screen, tab, fallback) => () =>
            navigate(`${basePath}/${screen}` + (tab === fallback ? "" : `?tab=${tab}`));

        const goTickets = (tab) => go("tickets", tab, "Pending");
        const goTechnicians = () => navigate(`${basePath}/technicians`);
        const goPayments = (tab) => go("payments", tab, "verify");

        // These keep OTHER admins' panels in sync. The admin who performed
        // the action doesn't wait for a socket round trip - their page calls
        // refreshCounts directly the moment the request succeeds.
        const onNewTicket = (p) => {
            bumpCount("ticketsNew");
            refreshCounts();
            notifyNew("New request", (p?.customerName || "A customer") + ", " + (p?.serviceLabel || ""), {
                panel: "Backoffice", tab: "New tickets", onOpen: goTickets("Pending"),
            });
        };
        const onRejected = (p) => {
            // A returned job lands in Pending carrying a rejection, which is
            // the "Pending" tab rather than "New" - the two are counted apart
            // on the server, so only the one it actually joins moves here.
            bumpCount("ticketsReturned");
            refreshCounts();
            notifyAlert(p.technicianName + " declined a job", p.reason, {
                panel: "Backoffice", tab: "Pending tickets", onOpen: goTickets("returned"),
            });
        };
        const onCancelled = (p) => {
            refreshCounts();
            notifyInfo("Ticket cancelled", p.ticketNumber, {
                panel: "Backoffice", tab: "Cancelled tickets", onOpen: goTickets("Cancelled"),
            });
        };
        const onRescheduled = (p) => {
            refreshCounts();
            notifyInfo("Ticket rescheduled", p.ticketNumber, {
                panel: "Backoffice", tab: "Scheduled tickets", onOpen: goTickets("scheduled"),
            });
        };
        const onStartedEarly = (p) => {
            refreshCounts();
            notifyInfo((p?.technicianName || "A vendor") + " started early", p?.customerName, {
                panel: "Backoffice", tab: "Active tickets", onOpen: goTickets("active"),
            });
        };
        const onPayment = (p) => {
            bumpCount("paymentsToVerify");
            refreshCounts();
            notifyNew("Payment collected", (p?.technicianName || "A vendor") + ", " + (p?.invoiceNumber || ""), {
                panel: "Backoffice", tab: "Payments to verify", onOpen: goPayments("verify"),
            });
        };
        // Somebody is standing in a customer's house waiting on this one, so
        // it stays on screen far longer than the rest and says so.
        const onCustomerRefused = (p) => {
            // The ticket has not moved anywhere - he is still on it, waiting
            // on the office. The count only changes if the office sends it
            // back, so there is nothing to bump here.
            refreshCounts();
            notifyAlert(
                "Call now, " + (p?.technicianName || "a vendor") + " is waiting on site",
                (p?.customerName || "The customer") + " refused: " + (p?.reason || ""),
                {
                    panel: "Backoffice",
                    tab: "Pending tickets",
                    duration: 30000,
                    onOpen: goTickets("returned"),
                }
            );
        };

        const onTaken = () => refreshCounts();

        // A cash job puts a technician out of balance and a settlement squares
        // him again. Both change what the Wallet tab is carrying, and the
        // office needs to see that on the tab without opening it.
        const onWallet = () => refreshCounts();

        // He cannot sign in until somebody approves him, so an application
        // sitting unseen is a technician who cannot work.
        const onTechApplied = (p) => {
            bumpCount("techniciansPending");
            refreshCounts();
            notifyNew(
                "New vendor application",
                (p?.name || "Someone") + (p?.area ? ", " + p.area : ""),
                { panel: "Backoffice", tab: "Vendor applications", onOpen: goTechnicians }
            );
        };

        adminSocket.on("ticket:new", onNewTicket);
        adminSocket.on("ticket:rejected", onRejected);
        adminSocket.on("ticket:cancelled", onCancelled);
        adminSocket.on("ticket:rescheduled", onRescheduled);
        adminSocket.on("ticket:started-early", onStartedEarly);
        adminSocket.on("payment:collected", onPayment);
        adminSocket.on("ticket:customer-refused", onCustomerRefused);
        adminSocket.on("ticket:taken", onTaken);
        adminSocket.on("tech:status", onTaken);
        adminSocket.on("wallet:updated", onWallet);
        adminSocket.on("technician:new", onTechApplied);

        // A laptop lid closed over lunch, a dropped wifi - the socket comes
        // back but the events it missed are gone. Every badge and every
        // listening page is re-read once the connection returns, or once
        // somebody comes back to the tab.
        const stopResume = onLiveResume(adminSocket, refreshCounts);

        return () => {
            adminSocket.off("ticket:new", onNewTicket);
            adminSocket.off("ticket:rejected", onRejected);
            adminSocket.off("ticket:cancelled", onCancelled);
            adminSocket.off("ticket:rescheduled", onRescheduled);
            adminSocket.off("ticket:started-early", onStartedEarly);
            adminSocket.off("payment:collected", onPayment);
            adminSocket.off("ticket:customer-refused", onCustomerRefused);
            adminSocket.off("ticket:taken", onTaken);
            adminSocket.off("tech:status", onTaken);
            adminSocket.off("wallet:updated", onWallet);
            adminSocket.off("technician:new", onTechApplied);
            stopResume();
            // Deliberately not disconnected here. AdminLayout is rendered by
            // every page, so it unmounts and remounts on each navigation -
            // dropping the socket here would mean a fresh handshake every time
            // somebody clicks a nav item, and events lost in the gap. Sign out
            // closes it explicitly, and a 401 redirect is a full page load,
            // which takes the connection with it.
        };
    }, [refreshCounts, bumpCount, navigate, basePath]);

    const handleLogout = async () => {
        // Dropped here as well as on unmount. Signing out should end the
        // connection there and then rather than depend on which order React
        // happens to tear this tree down in.
        disconnectAdminSocket();
        await logout();
        navigate("/admin/login");
    };

    // Payments and Wallets are one screen now. Someone with only one of the
    // two permissions still lands on the half they are allowed to see, so the
    // link points at whichever route their role can actually open.
    const canSeePayments = hasPermission("VIEW_PAYMENTS");
    const moneyPath = canSeePayments ? `${basePath}/payments` : `${basePath}/wallets`;

    const navItems = [
        { to: basePath, label: "Dashboard", icon: LayoutDashboard, permission: null, end: true },
        {
            to: `${basePath}/tickets`,
            label: "Tickets",
            icon: Ticket,
            permission: "VIEW_TICKETS",
            // New requests plus the ones that came back - both are waiting on
            // somebody at the desk. The rest of the tabs are work already
            // moving, and putting those on the sidebar made the number look
            // alarming when there was nothing to do.
            badge: (counts.ticketsNew || 0) + (counts.ticketsReturned || 0),
        },
        {
            to: `${basePath}/technicians`,
            label: "Vendors",
            icon: Users,
            permission: "VIEW_TECHNICIANS",
            // Applications waiting for a yes or a no. Nothing else on that
            // screen is work - a roster is just a roster.
            badge: counts.techniciansPending || 0,
        },
        {
            to: moneyPath,
            label: "Payments",
            icon: Wallet,
            permission: canSeePayments ? "VIEW_PAYMENTS" : "VIEW_WALLETS",
            // Wallets belong in here. Checking a cash bill and recording the
            // commission that came back for it are two separate jobs, and
            // leaving the second one out meant the sidebar went quiet the
            // moment a bill was verified - while the money it represents was
            // still sitting unrecorded on the wallet tab.
            badge: (counts.paymentsToVerify || 0) + (counts.paymentsOnline || 0) + (counts.wallets || 0),
        },
        { to: `${basePath}/services`, label: "Pricing", icon: Package, permission: "MANAGE_PRICING" },
        { to: `${basePath}/staff`, label: "Team", icon: UserCog, permission: "MANAGE_STAFF" },
        { to: `${basePath}/analytics`, label: "Analytics", icon: TrendingUp, permission: "VIEW_ANALYTICS" },
    ].filter((item) => !item.permission || hasPermission(item.permission));

    const totalAlerts = navItems.reduce((sum, item) => sum + (item.badge || 0), 0);

    return (
        <div className="min-h-screen bg-canvas flex">
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* The panel is dark and the pages are paper. That contrast is the
                frame: the chrome recedes and the work is the bright thing on
                screen. Its colour is the blue from the company mark taken
                almost to black, rather than a stock slate. */}
            <aside
                className={"cg-rich-dark fixed lg:sticky top-0 left-0 h-screen w-64 shrink-0 text-white z-40 transform transition-transform duration-200 flex flex-col " + (sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")}
            >
                <div className="px-5 py-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img 
                            src="https://ik.imagekit.io/ny6yinyut/cosmosgenLogo/cosmosgen-logo.png?updatedAt=1788413075959" 
                            alt="Cosmosgen Logo" 
                            className="h-8 w-8 rounded-full bg-white p-[3px] object-contain"
                        />
                        <div className="flex flex-col">
                            <span className="font-display font-semibold text-[15px] tracking-tight leading-tight text-white">Cosmosgen</span>
                            <span className="text-[9px] text-white/40 uppercase tracking-[0.14em] leading-tight">Engineers Pvt. Ltd.</span>
                        </div>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/50 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) => "cg-nav-item " + (isActive ? "cg-nav-item-on" : "")}
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon className={"w-4 h-4 shrink-0 " + (isActive ? "text-accent" : "text-white/40")} />
                                    <span className="flex-1">{item.label}</span>
                                    <NotifyBadge count={item.badge || 0} />
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-3 mt-2 border-t border-panel-line">
                    <div className="px-3 py-2 mb-1">
                        <p className="text-sm font-semibold truncate text-white">{admin?.name}</p>
                        <span
                            className={"cg-pill mt-1.5 uppercase tracking-[0.08em] " + (admin?.role === "superadmin" ? "bg-brand/20 text-brand" : "bg-white/10 text-white/60")}
                        >
                            {admin?.role === "superadmin" ? "Owner" : "Backoffice"}
                        </span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium text-[#ff8b83] hover:bg-[#ff8b83]/10 hover:text-[#ffb0aa] transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign out
                    </button>
                </div>
            </aside>

            <div className="flex-1 min-w-0">
                <header className="lg:hidden sticky top-0 bg-surface/85 backdrop-blur border-b border-hairline px-4 py-3 flex items-center gap-3 z-20">
                    <button onClick={() => setSidebarOpen(true)} className="relative">
                        <Menu className="w-5 h-5 text-ink" />
                        {totalAlerts > 0 && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-warn rounded-full" />
                        )}
                    </button>
                    <div className="flex-1 flex items-center gap-2">
                        <img 
                            src="https://ik.imagekit.io/ny6yinyut/cosmosgenLogo/cosmosgen-logo.png?updatedAt=1788413075959" 
                            alt="Cosmosgen" 
                            className="h-5" 
                        />
                        <div className="flex flex-col">
                            <span className="font-display font-semibold text-ink text-sm tracking-tight leading-tight">Cosmosgen</span>
                            <span className="text-[9px] text-ink-faint uppercase tracking-[0.14em] leading-tight">Backoffice</span>
                        </div>
                    </div>
                    <NotifyBadge count={totalAlerts} />
                </header>

                <main className="px-4 py-6 lg:px-10 lg:py-10 max-w-[1400px] mx-auto">{children}</main>
            </div>
        </div>
    );
};

export default AdminLayout;