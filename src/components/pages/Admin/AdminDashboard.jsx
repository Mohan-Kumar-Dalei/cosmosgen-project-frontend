import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import { useAdminAuth } from "../Admin/adminAuthContext";
import { useAdminData } from "./AdminDataContext";
import { api, getErrorMessage } from "../../services/api";
import { adminSocket, connectAdminSocket } from "../../services/socket";
import {
    Ticket, Users, Clock, AlertCircle, ArrowRight,
    CalendarDays, Banknote, Wallet,
} from "lucide-react";

const StatCard = ({ label, value, sub, icon: Icon, tone = "gray" }) => {
    const tones = {
        gray: "bg-sunken text-ink",
        amber: "bg-warn-tint text-warn",
        green: "bg-brand-tint text-brand",
        blue: "bg-info-tint text-info",
    };

    return (
        <div className="cg-card p-5">
            <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium text-ink-soft">{label}</span>
                <div className={"p-2 rounded-lg " + tones[tone]}>
                    <Icon className="w-4 h-4" />
                </div>
            </div>
            <p className="text-3xl font-bold text-ink tracking-tight">{value}</p>
            {sub && <p className="text-xs text-ink-faint mt-1">{sub}</p>}
        </div>
    );
};

const AdminDashboard = () => {
    const { admin, hasPermission } = useAdminAuth();

    // These used to point at bare "/admin/..." paths, so every click landed on
    // a URL without the admin id and AdminLayout rewrote it afterwards - which
    // is how the cash card ended up on /wallets instead of the payments tab it
    // was actually opening.
    const base = admin?._id ? "/admin/" + admin._id : "/admin";
    const { globalRefreshTrigger } = useAdminData();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [lastUpdated, setLastUpdated] = useState(null);
    const isMountedRef = useRef(true);

    const loadStats = useCallback(async () => {
        try {
            const res = await api.get("/admin/dashboard/stats");
            if (!isMountedRef.current) return;
            setStats(res.data.data);
            setLastUpdated(new Date());
            setError("");
        } catch (err) {
            if (!isMountedRef.current) return;
            setError(getErrorMessage(err, "Could not load dashboard data"));
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        loadStats();


        connectAdminSocket();
        const refresh = () => loadStats();
        adminSocket.on("ticket:new", refresh);
        adminSocket.on("ticket:taken", refresh);
        adminSocket.on("ticket:cancelled", refresh);
        adminSocket.on("ticket:rejected", refresh);
        adminSocket.on("payment:collected", refresh);
        adminSocket.on("tech:status", refresh);

        return () => {
            isMountedRef.current = false;
            adminSocket.off("ticket:new", refresh);
            adminSocket.off("ticket:taken", refresh);
            adminSocket.off("ticket:cancelled", refresh);
            adminSocket.off("ticket:rejected", refresh);
            adminSocket.off("payment:collected", refresh);
            adminSocket.off("tech:status", refresh);
        };
    }, [loadStats, globalRefreshTrigger]);

    const activeJobs = stats ? stats.tickets.assigned + stats.tickets.inProgress : 0;

    return (
        <AdminLayout>
            <div className="mb-6">
                <h1 className="cg-h1">
                    Welcome back, {admin?.name?.split(" ")[0]}
                </h1>
                <p className="cg-sub mt-1">
                    Today's service requests and team status
                    {lastUpdated && (
                        <span className="text-ink-faint">
                            {" "}· updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                    )}
                </p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-danger-tint border border-hairline rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-danger">{error}</p>
                        <p className="text-xs text-danger mt-1">Retrying automatically.</p>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="cg-card p-5 h-32 animate-pulse" />
                    ))}
                </div>
            ) : stats ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <StatCard
                            label="New requests"
                            value={stats.tickets.pending}
                            sub={stats.tickets.rejected > 0
                                ? stats.tickets.rejected + " came back from a vendor"
                                : "Waiting to be assigned"}
                            icon={Clock}
                            tone="amber"
                        />
                        <StatCard
                            label="Active jobs"
                            value={activeJobs}
                            sub={stats.tickets.assigned + " assigned, " + stats.tickets.inProgress + " in progress"}
                            icon={Ticket}
                            tone="blue"
                        />
                        <StatCard
                            label="Scheduled"
                            value={stats.tickets.scheduled || 0}
                            sub="Start on their date, or when free"
                            icon={CalendarDays}
                            tone="gray"
                        />
                        <StatCard
                            label="Vendors free"
                            value={stats.technicians.available}
                            sub={stats.technicians.total + " total, " + stats.technicians.onJob + " on a job"}
                            icon={Users}
                            tone="green"
                        />
                    </div>

                    {stats.tickets.pending > 0 ? (
                        <Link
                            to={base + "/tickets"}
                            className="block bg-warn-tint border border-hairline rounded-xl p-5 hover:bg-warn-tint transition-colors"
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="font-semibold text-warn">
                                        {stats.tickets.pending} request{stats.tickets.pending > 1 ? "s" : ""} waiting
                                    </p>
                                    <p className="text-sm text-warn mt-0.5">
                                        Open the queue to assign a vendor
                                    </p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-warn shrink-0" />
                            </div>
                        </Link>
                    ) : (
                        <div className="cg-card p-8 text-center">
                            <p className="font-semibold text-ink">No requests waiting</p>
                            <p className="text-sm text-ink-soft mt-1">
                                New requests appear here as soon as they arrive.
                            </p>
                        </div>
                    )}

                    {stats.tickets.paymentPending > 0 && (
                        <Link
                            to={base + "/payments?tab=upi"}
                            className="block mt-4 bg-purple-50 border border-purple-200 rounded-xl p-5 hover:bg-info-tint transition-colors"
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="font-semibold text-purple-900">
                                        {stats.tickets.paymentPending} invoice{stats.tickets.paymentPending > 1 ? "s" : ""} awaiting payment
                                    </p>
                                    <p className="text-sm text-purple-700 mt-0.5">Sent to customers, not paid yet</p>
                                </div>
                                <Wallet className="w-5 h-5 text-purple-700 shrink-0" />
                            </div>
                        </Link>
                    )}

                    {hasPermission("VERIFY_PAYMENT") && stats.awaitingReconcile?.count > 0 && (
                        <Link
                            to={base + "/payments"}
                            className="block mt-4 bg-ink text-white rounded-xl p-5 hover:bg-black transition-colors"
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="font-semibold">
                                        Rs {stats.awaitingReconcile.amountDisplay} to verify
                                    </p>
                                    <p className="text-sm text-white/60 mt-0.5">
                                        {stats.awaitingReconcile.count} online payment{stats.awaitingReconcile.count > 1 ? "s" : ""} waiting for confirmation
                                    </p>
                                </div>
                                <ArrowRight className="w-5 h-5 shrink-0" />
                            </div>
                        </Link>
                    )}

                    {/* Cash never reached the company account, so chasing it
                        means settling the technician's balance - the
                        Technicians tab of the same Payments screen */}
                    {hasPermission("VIEW_WALLETS") && stats.cashWithTechnicians?.count > 0 && (
                        <Link
                            to={base + "/payments?tab=wallet"}
                            className="block mt-4 bg-warn-tint border border-hairline rounded-xl p-5 hover:bg-warn-tint transition-colors"
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="font-semibold text-warn">
                                        Rs {stats.cashWithTechnicians.amountDisplay} to collect from vendors
                                    </p>
                                    <p className="text-sm text-warn mt-0.5">
                                        Commission on {stats.cashWithTechnicians.count} cash job{stats.cashWithTechnicians.count > 1 ? "s" : ""}
                                    </p>
                                </div>
                                <Banknote className="w-5 h-5 text-warn shrink-0" />
                            </div>
                        </Link>
                    )}
                </>
            ) : null}
        </AdminLayout>
    );
};

export default AdminDashboard;