import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAdminAuth } from "./adminAuthContext";
import { useAdminData } from "./AdminDataContext";
import { adminSocket, connectAdminSocket } from "../../services/socket";
import { notifyNew, notifyAlert, notifyInfo } from "../../services/notify";
import {
    LayoutDashboard, Ticket, Users, Wallet, Package, Landmark,
    UserCog, TrendingUp, LogOut, Menu, X, Hexagon, Bell,
} from "lucide-react";

const AdminLayout = ({ children }) => {
    const { admin, logout, hasPermission } = useAdminAuth();
    const { counts, refreshCounts } = useAdminData();
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

    useEffect(() => {
        connectAdminSocket();

        // These keep OTHER admins' panels in sync. The admin who performed
        // the action doesn't wait for a socket round trip - their page calls
        // refreshCounts directly the moment the request succeeds.
        const onNewTicket = (p) => {
            refreshCounts();
            notifyNew("New request", (p?.customerName || "A customer") + " - " + (p?.serviceLabel || ""));
        };
        const onRejected = (p) => {
            refreshCounts();
            notifyAlert(p.technicianName + " declined a job", p.reason);
        };
        const onCancelled = (p) => {
            refreshCounts();
            notifyInfo("Ticket cancelled", p.ticketNumber);
        };
        const onRescheduled = (p) => {
            refreshCounts();
            notifyInfo("Ticket rescheduled", p.ticketNumber);
        };
        const onStartedEarly = (p) => {
            refreshCounts();
            notifyInfo((p?.technicianName || "A technician") + " started early", p?.customerName);
        };
        const onPayment = (p) => {
            refreshCounts();
            notifyNew("Payment collected", (p?.technicianName || "A technician") + " - " + (p?.invoiceNumber || ""));
        };
        const onTaken = () => refreshCounts();

        adminSocket.on("ticket:new", onNewTicket);
        adminSocket.on("ticket:rejected", onRejected);
        adminSocket.on("ticket:cancelled", onCancelled);
        adminSocket.on("ticket:rescheduled", onRescheduled);
        adminSocket.on("ticket:started-early", onStartedEarly);
        adminSocket.on("payment:collected", onPayment);
        adminSocket.on("ticket:taken", onTaken);
        adminSocket.on("tech:status", onTaken);

        return () => {
            adminSocket.off("ticket:new", onNewTicket);
            adminSocket.off("ticket:rejected", onRejected);
            adminSocket.off("ticket:cancelled", onCancelled);
            adminSocket.off("ticket:rescheduled", onRescheduled);
            adminSocket.off("ticket:started-early", onStartedEarly);
            adminSocket.off("payment:collected", onPayment);
            adminSocket.off("ticket:taken", onTaken);
            adminSocket.off("tech:status", onTaken);
        };
    }, [refreshCounts]);

    const handleLogout = async () => {
        await logout();
        navigate("/admin/login");
    };

    const basePath = admin?._id ? `/admin/${admin._id}` : "/admin";

    const navItems = [
        { to: basePath, label: "Dashboard", icon: LayoutDashboard, permission: null, end: true },
        { to: `${basePath}/tickets`, label: "Tickets", icon: Ticket, permission: "VIEW_TICKETS", badge: counts.pending },
        { to: `${basePath}/technicians`, label: "Technicians", icon: Users, permission: "VIEW_TECHNICIANS" },
        { to: `${basePath}/payments`, label: "Payments", icon: Wallet, permission: "VIEW_PAYMENTS", badge: (counts.toVerify || 0) + (counts.awaitingPayment || 0) },
        { to: `${basePath}/wallets`, label: "Wallets", icon: Landmark, permission: "VIEW_WALLETS", badge: counts.wallets },
        { to: `${basePath}/services`, label: "Pricing", icon: Package, permission: "MANAGE_PRICING" },
        { to: `${basePath}/staff`, label: "Team", icon: UserCog, permission: "MANAGE_STAFF" },
        { to: `${basePath}/analytics`, label: "Analytics", icon: TrendingUp, permission: "VIEW_ANALYTICS" },
    ].filter((item) => !item.permission || hasPermission(item.permission));

    const totalAlerts = (counts.pending || 0) + (counts.toVerify || 0) + (counts.awaitingPayment || 0) + (counts.wallets || 0);

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            <aside
                className={"fixed lg:sticky top-0 left-0 h-screen w-64 shrink-0 bg-slate-900 text-white z-40 transform transition-transform duration-200 flex flex-col " + (sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")}
            >
                <div className="p-5 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img 
                            src="https://ik.imagekit.io/ny6yinyut/cosmosgenLogo/cosmosgen-logo.png?updatedAt=1788413075959" 
                            alt="Cosmosgen Logo" 
                            className="h-7" 
                        />
                        <div className="flex flex-col">
                            <span className="font-bold text-sm leading-tight">Cosmosgen</span>
                            <span className="text-[9px] text-white/50 uppercase tracking-widest leading-tight">Engineers Pvt. Ltd.</span>
                        </div>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/60">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) =>
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors " +
                                (isActive ? "bg-green-600 text-white" : "text-white/70 hover:bg-white/10 hover:text-white")
                            }
                        >
                            <item.icon className="w-4 h-4 shrink-0" />
                            <span className="flex-1">{item.label}</span>
                            {item.badge > 0 && (
                                <span className="bg-amber-500 text-slate-900 text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                                    {item.badge > 99 ? "99+" : item.badge}
                                </span>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-3 border-t border-white/10">
                    <div className="px-3 py-2 mb-2">
                        <p className="text-sm font-semibold truncate">{admin?.name}</p>
                        <span
                            className={"inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide " + (admin?.role === "superadmin" ? "bg-amber-500 text-slate-900" : "bg-white/15 text-white/80")}
                        >
                            {admin?.role === "superadmin" ? "Owner" : "Backoffice"}
                        </span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-300 hover:bg-red-500/15"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign out
                    </button>
                </div>
            </aside>

            <div className="flex-1 min-w-0">
                <header className="lg:hidden sticky top-0 bg-white border-b px-4 py-3 flex items-center gap-3 z-20">
                    <button onClick={() => setSidebarOpen(true)} className="relative">
                        <Menu className="w-5 h-5 text-gray-700" />
                        {totalAlerts > 0 && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full" />
                        )}
                    </button>
                    <div className="flex-1 flex items-center gap-2">
                        <img 
                            src="https://ik.imagekit.io/ny6yinyut/cosmosgenLogo/cosmosgen-logo.png?updatedAt=1788413075959" 
                            alt="Cosmosgen" 
                            className="h-5" 
                        />
                        <div className="flex flex-col">
                            <span className="font-bold text-gray-900 text-sm leading-tight">Cosmosgen</span>
                            <span className="text-[9px] text-gray-500 uppercase tracking-widest leading-tight">Backoffice</span>
                        </div>
                    </div>
                    {totalAlerts > 0 && (
                        <span className="flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full">
                            <Bell className="w-3 h-3" />
                            {totalAlerts}
                        </span>
                    )}
                </header>

                <main className="p-4 lg:p-8">{children}</main>
            </div>
        </div>
    );
};

export default AdminLayout;