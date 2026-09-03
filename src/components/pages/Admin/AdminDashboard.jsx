import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import { useAdminAuth } from "../Admin/adminAuthContext";
import { api, getErrorMessage } from "../../services/api";
import { adminSocket, connectAdminSocket } from "../../services/socket";
import {
    Ticket, Users, Clock, AlertCircle, ArrowRight,
    CalendarDays, Banknote, Wallet,
} from "lucide-react";

const StatCard = ({ label, value, sub, icon: Icon, tone = "gray" }) => {
    const tones = {
        gray: "bg-gray-100 text-gray-700",
        amber: "bg-amber-100 text-amber-700",
        green: "bg-green-100 text-green-700",
        blue: "bg-blue-100 text-blue-700",
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium text-gray-500">{label}</span>
                <div className={"p-2 rounded-lg " + tones[tone]}>
                    <Icon className="w-4 h-4" />
                </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
    );
};

const AdminDashboard = () => {
    const { admin, hasPermission } = useAdminAuth();
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

        const interval = setInterval(loadStats, 30000);

        connectAdminSocket();
        const refresh = () => loadStats();
        adminSocket.on("ticket:new", refresh);
        adminSocket.on("ticket:taken", refresh);
        adminSocket.on("ticket:cancelled", refresh);
        adminSocket.on("ticket:rejected", refresh);
        adminSocket.on("payment:collected", refresh);

        return () => {
            isMountedRef.current = false;
            clearInterval(interval);
            adminSocket.off("ticket:new", refresh);
            adminSocket.off("ticket:taken", refresh);
            adminSocket.off("ticket:cancelled", refresh);
            adminSocket.off("ticket:rejected", refresh);
            adminSocket.off("payment:collected", refresh);
        };
    }, [loadStats]);

    const activeJobs = stats ? stats.tickets.assigned + stats.tickets.inProgress : 0;

    return (
        <AdminLayout>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                    Welcome back, {admin?.name?.split(" ")[0]}
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                    Today's service requests and team status
                    {lastUpdated && (
                        <span className="text-gray-400">
                            {" "}· updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                    )}
                </p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-red-800">{error}</p>
                        <p className="text-xs text-red-600 mt-1">Retrying automatically.</p>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-32 animate-pulse" />
                    ))}
                </div>
            ) : stats ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <StatCard
                            label="New requests"
                            value={stats.tickets.pending}
                            sub={stats.tickets.rejected > 0
                                ? stats.tickets.rejected + " came back from a technician"
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
                            label="Technicians free"
                            value={stats.technicians.available}
                            sub={stats.technicians.total + " total, " + stats.technicians.onJob + " on a job"}
                            icon={Users}
                            tone="green"
                        />
                    </div>

                    {stats.tickets.pending > 0 ? (
                        <Link
                            to="/admin/tickets"
                            className="block bg-amber-50 border border-amber-200 rounded-xl p-5 hover:bg-amber-100 transition-colors"
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="font-semibold text-amber-900">
                                        {stats.tickets.pending} request{stats.tickets.pending > 1 ? "s" : ""} waiting
                                    </p>
                                    <p className="text-sm text-amber-700 mt-0.5">
                                        Open the queue to assign a technician
                                    </p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-amber-700 shrink-0" />
                            </div>
                        </Link>
                    ) : (
                        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                            <p className="font-semibold text-gray-900">No requests waiting</p>
                            <p className="text-sm text-gray-500 mt-1">
                                New requests appear here as soon as they arrive.
                            </p>
                        </div>
                    )}

                    {stats.tickets.paymentPending > 0 && (
                        <Link
                            to="/admin/payments"
                            className="block mt-4 bg-purple-50 border border-purple-200 rounded-xl p-5 hover:bg-purple-100 transition-colors"
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
                            to="/admin/payments"
                            className="block mt-4 bg-slate-900 text-white rounded-xl p-5 hover:bg-slate-800 transition-colors"
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

                    {/* Cash never reached the company account, so chasing it is a
                        Wallets job - the Payments page has nothing to do with it */}
                    {hasPermission("VIEW_WALLETS") && stats.cashWithTechnicians?.count > 0 && (
                        <Link
                            to="/admin/wallets"
                            className="block mt-4 bg-amber-50 border border-amber-200 rounded-xl p-5 hover:bg-amber-100 transition-colors"
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="font-semibold text-amber-900">
                                        Rs {stats.cashWithTechnicians.amountDisplay} collected in cash
                                    </p>
                                    <p className="text-sm text-amber-700 mt-0.5">
                                        Commission on {stats.cashWithTechnicians.count} job{stats.cashWithTechnicians.count > 1 ? "s" : ""} still with technicians
                                    </p>
                                </div>
                                <Banknote className="w-5 h-5 text-amber-700 shrink-0" />
                            </div>
                        </Link>
                    )}
                </>
            ) : null}
        </AdminLayout>
    );
};

export default AdminDashboard;