import React, { useEffect, useState, useCallback } from "react";
import AdminLayout from "./AdminLayout";
import { useAdminAuth } from "../Admin/adminAuthContext";
import { api, getErrorMessage } from "../../services/api";
import {
    Loader2, AlertCircle, RefreshCw, Search, Star, MapPin, Phone,
    X, Banknote, Wrench, Navigation, CalendarClock, Ban, CheckCircle2,
    Clock, ShieldOff, UserCheck,
} from "lucide-react";

const VIEW_TABS = [
    { key: "roster", label: "Team" },
    { key: "pending", label: "Applications" },
    { key: "rejected", label: "Rejected" },
    { key: "blocked", label: "Blocked" },
];

const STATUS_TABS = [
    { key: "", label: "All" },
    { key: "available", label: "Free" },
    { key: "busy", label: "On job" },
    { key: "offline", label: "Offline" },
];

const LIVE_STYLES = {
    available: "bg-green-100 text-green-700",
    on_job: "bg-blue-100 text-blue-700",
    offline: "bg-gray-100 text-gray-600",
};

const LIVE_LABELS = { available: "Free", on_job: "On job", offline: "Offline" };

const timeAgo = (dateStr) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 60) return mins + "m ago";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    return Math.floor(hrs / 24) + "d ago";
};

const AdminTechnicians = () => {
    const [view, setView] = useState("roster");
    const [status, setStatus] = useState("");
    const [search, setSearch] = useState("");
    const [technicians, setTechnicians] = useState([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [flash, setFlash] = useState("");
    const [selectedId, setSelectedId] = useState(null);

    const load = useCallback(async (viewKey, statusFilter, searchTerm) => {
        try {
            const params = { search: searchTerm || undefined };
            if (viewKey === "roster") params.status = statusFilter || undefined;
            else params.approval = viewKey;

            const res = await api.get("/admin/technicians", { params });
            setTechnicians(res.data.data);
            setPendingCount(res.data.pendingCount || 0);
            setError("");
        } catch (err) {
            setError(getErrorMessage(err, "Could not load technicians"));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        const timer = setTimeout(() => load(view, status, search), search ? 400 : 0);
        return () => clearTimeout(timer);
    }, [view, status, search, load]);

    useEffect(() => {
        const interval = setInterval(() => load(view, status, search), 30000);
        return () => clearInterval(interval);
    }, [view, status, search, load]);

    const handleChanged = (message) => {
        setSelectedId(null);
        setFlash(message);
        setTimeout(() => setFlash(""), 4000);
        load(view, status, search);
    };

    return (
        <AdminLayout>
            <div className="flex items-start justify-between gap-3 mb-6">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Technicians</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Review applications and see who's working right now.
                    </p>
                </div>
                <button
                    onClick={() => { setRefreshing(true); load(view, status, search); }}
                    disabled={refreshing}
                    className="shrink-0 p-2.5 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                    <RefreshCw className={"w-4 h-4 " + (refreshing ? "animate-spin" : "")} />
                </button>
            </div>

            {/* New applications are easy to miss, so they get a banner not just a tab */}
            {pendingCount > 0 && view !== "pending" && (
                <button
                    onClick={() => setView("pending")}
                    className="w-full mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 hover:bg-amber-100 transition-colors text-left"
                >
                    <div className="flex items-center gap-2.5">
                        <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                        <div>
                            <p className="font-semibold text-amber-900 text-sm">
                                {pendingCount} application{pendingCount > 1 ? "s" : ""} waiting for review
                            </p>
                            <p className="text-xs text-amber-700">They can't sign in until you approve them.</p>
                        </div>
                    </div>
                    <span className="text-sm font-semibold text-amber-800 shrink-0">Review</span>
                </button>
            )}

            {flash && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    {flash}
                </div>
            )}

            <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit overflow-x-auto max-w-full">
                {VIEW_TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setView(t.key)}
                        className={"flex items-center gap-1.5 px-3 sm:px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors " + (view === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                    >
                        {t.label}
                        {t.key === "pending" && pendingCount > 0 && (
                            <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 rounded-full">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, phone or area"
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700"
                />
            </div>

            {view === "roster" && (
                <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit overflow-x-auto max-w-full">
                    {STATUS_TABS.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setStatus(t.key)}
                            className={"px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors " + (status === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            )}

            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold text-red-800">{error}</p>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-36 animate-pulse" />
                    ))}
                </div>
            ) : technicians.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
                    <Wrench className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900">
                        {view === "pending" ? "No applications waiting"
                            : view === "blocked" ? "No blocked accounts"
                            : view === "rejected" ? "No rejected applications"
                            : "No technicians found"}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                        {view === "pending"
                            ? "New sign-ups appear here for review."
                            : "Try a different filter or search term."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-8">
                    {technicians.map((t) => (
                        <button
                            key={t._id}
                            onClick={() => setSelectedId(t._id)}
                            className="text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-green-300 hover:shadow-sm transition-all"
                        >
                            <div className="flex items-start gap-3 mb-3">
                                <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                                    {t.profileImage ? (
                                        <img src={t.profileImage} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-base font-bold text-gray-500">{t.name?.[0]?.toUpperCase()}</span>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-gray-900 text-sm truncate">{t.name}</p>
                                    <p className="text-xs text-gray-500 truncate">{t.skills?.[0] || "No skill set"}</p>
                                </div>
                                {view === "roster" ? (
                                    <span className={"text-[10px] font-bold px-2 py-1 rounded-full shrink-0 " + LIVE_STYLES[t.liveStatus]}>
                                        {LIVE_LABELS[t.liveStatus]}
                                    </span>
                                ) : view === "pending" ? (
                                    <span className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0 bg-amber-100 text-amber-700">
                                        NEW
                                    </span>
                                ) : view === "blocked" ? (
                                    <span className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0 bg-red-100 text-red-700">
                                        BLOCKED
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0 bg-gray-100 text-gray-600">
                                        REJECTED
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                                <span className="flex items-center gap-0.5">
                                    <Phone className="w-3 h-3" /> {t.phone}
                                </span>
                                <span className="flex items-center gap-0.5 truncate">
                                    <MapPin className="w-3 h-3 shrink-0" /> {t.area}
                                </span>
                            </div>

                            {view === "roster" && (
                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1.5">
                                    <span className="flex items-center gap-0.5">
                                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                        {t.rating?.toFixed(1) || "5.0"}
                                    </span>
                                    <span>{t.completedJobs} jobs</span>
                                </div>
                            )}

                            {view === "pending" && (
                                <p className="text-xs text-gray-400 mt-2">Applied {timeAgo(t.createdAt)}</p>
                            )}

                            {view === "roster" && !t.hasLocation && (
                                <p className="text-[10px] text-amber-600 mt-2 font-medium">
                                    No location set — won't show in nearby search
                                </p>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {selectedId && (
                <TechnicianDetail
                    technicianId={selectedId}
                    onClose={() => setSelectedId(null)}
                    onChanged={handleChanged}
                />
            )}
        </AdminLayout>
    );
};

/* ================================================================== */
/* DETAIL                                                               */
/* ================================================================== */

const TechnicianDetail = ({ technicianId, onClose, onChanged }) => {
    const { hasPermission } = useAdminAuth();
    const [tech, setTech] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [working, setWorking] = useState(false);
    const [dialog, setDialog] = useState(null); // reject | block

    const canBlock = hasPermission("BLOCK_TECHNICIAN");

    useEffect(() => {
        const load = async () => {
            try {
                const res = await api.get("/admin/technicians/" + technicianId);
                setTech(res.data.data);
            } catch (err) {
                setError(getErrorMessage(err, "Could not load this technician"));
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [technicianId]);

    const handleApprove = async () => {
        setWorking(true);
        setError("");
        try {
            const res = await api.post("/admin/technicians/" + technicianId + "/approve");
            onChanged(res.data.message);
        } catch (err) {
            setError(getErrorMessage(err, "Could not approve this account"));
            setWorking(false);
        }
    };

    const handleUnblock = async () => {
        setWorking(true);
        setError("");
        try {
            const res = await api.post("/admin/technicians/" + technicianId + "/unblock");
            onChanged(res.data.message);
        } catch (err) {
            setError(getErrorMessage(err, "Could not unblock this account"));
            setWorking(false);
        }
    };

    const isPending = tech?.approvalStatus === "pending";
    const isRejected = tech?.approvalStatus === "rejected";
    const isBlocked = tech?.isBlacklisted;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
                    <h2 className="font-bold text-gray-900">
                        {isPending ? "Review application" : "Technician"}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5">
                    {loading ? (
                        <div className="py-10 flex justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    ) : error && !tech ? (
                        <p className="text-sm text-red-600">{error}</p>
                    ) : tech ? (
                        <>
                            {isBlocked && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                                    <ShieldOff className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-red-900">Account blocked</p>
                                        {tech.blacklistReason && (
                                            <p className="text-xs text-red-700 mt-0.5">{tech.blacklistReason}</p>
                                        )}
                                        <p className="text-xs text-red-600 mt-1">
                                            This phone number can't sign in or register again.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {isRejected && !isBlocked && (
                                <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                                    <p className="text-sm font-semibold text-gray-900">Application rejected</p>
                                    {tech.rejectionReason && (
                                        <p className="text-xs text-gray-600 mt-0.5">{tech.rejectionReason}</p>
                                    )}
                                </div>
                            )}

                            {isPending && (
                                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                                    <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-amber-900">Waiting for approval</p>
                                        <p className="text-xs text-amber-700 mt-0.5">
                                            Check their details and skills before letting them in.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-start gap-4 mb-5">
                                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                                    {tech.profileImage ? (
                                        <img src={tech.profileImage} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xl font-bold text-gray-500">{tech.name?.[0]?.toUpperCase()}</span>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-bold text-gray-900">{tech.name}</h3>
                                        {!isPending && !isBlocked && !isRejected && (
                                            <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full " + LIVE_STYLES[tech.liveStatus]}>
                                                {LIVE_LABELS[tech.liveStatus]}
                                            </span>
                                        )}
                                    </div>
                                    <a href={"tel:" + tech.phone} className="text-sm text-gray-600 flex items-center gap-1 mt-1 hover:text-green-700">
                                        <Phone className="w-3.5 h-3.5" /> {tech.phone}
                                    </a>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {tech.area}, {tech.state} — {tech.pincode}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Signed up {new Date(tech.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                    </p>
                                </div>
                            </div>

                            {tech.skills?.length > 0 && (
                                <div className="mb-5">
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Services they handle</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {tech.skills.map((s, i) => (
                                            <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">{s}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-2 mb-5">
                                <div className="bg-gray-50 rounded-xl p-3 text-center">
                                    <p className="text-lg font-bold text-gray-900">{tech.completedJobs}</p>
                                    <p className="text-[10px] text-gray-500">Jobs done</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3 text-center">
                                    <p className="text-lg font-bold text-gray-900">{tech.rating?.toFixed(1) || "5.0"}</p>
                                    <p className="text-[10px] text-gray-500">Rating</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3 text-center">
                                    <p className="text-sm font-bold text-gray-900">{tech.hasVehicle ? "Yes" : "No"}</p>
                                    <p className="text-[10px] text-gray-500">Own vehicle</p>
                                </div>
                            </div>

                            {tech.financials && (
                                <div className="mb-5 border border-gray-200 rounded-xl overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                                        <p className="text-xs font-bold text-gray-700 uppercase">Financials</p>
                                        <span className="text-[10px] font-bold bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                                            {tech.financials.commissionRate}% Commission
                                        </span>
                                    </div>
                                    <div className="p-4 grid grid-cols-2 gap-4 bg-white">
                                        <div>
                                            <p className="text-xs text-gray-500 mb-0.5">Total earned by tech</p>
                                            <p className="text-lg font-bold text-green-700">Rs {tech.financials.totalEarned}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-0.5">Company profit from tech</p>
                                            <p className="text-lg font-bold text-gray-900">Rs {tech.financials.companyProfit}</p>
                                        </div>
                                        <div className="col-span-2 pt-3 border-t border-gray-100 flex items-center justify-between">
                                            <div>
                                                <p className="text-xs text-gray-500 mb-0.5">Current Wallet Balance</p>
                                                <p className="text-sm font-bold text-gray-900">Rs {tech.financials.walletBalance}</p>
                                            </div>
                                            <span className={"text-xs font-bold px-2 py-1 rounded-md " + (
                                                tech.financials.walletBalance === "0.00" ? "bg-gray-100 text-gray-600" :
                                                tech.financials.walletDirection === "technician_owes" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                                            )}>
                                                {tech.financials.walletBalance === "0.00" ? "Settled" : 
                                                 tech.financials.walletDirection === "technician_owes" ? "Tech owes company" : "Company owes tech"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {tech.cashHeld?.count > 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-center gap-2">
                                    <Banknote className="w-4 h-4 text-amber-700 shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-amber-900">
                                            Rs {tech.cashHeld.amountDisplay} not deposited
                                        </p>
                                        <p className="text-xs text-amber-700">{tech.cashHeld.count} cash jobs</p>
                                    </div>
                                </div>
                            )}

                            {tech.activeTicket && (
                                <div className="mb-5">
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Working on now</p>
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                        <p className="font-semibold text-gray-900 text-sm">{tech.activeTicket.customerSnapshot?.name}</p>
                                        <p className="text-xs text-gray-600 mt-0.5">
                                            {tech.activeTicket.serviceLabel} · {tech.activeTicket.ticketNumber}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {tech.scheduledTickets?.length > 0 && (
                                <div className="mb-5">
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">
                                        Scheduled next ({tech.scheduledTickets.length})
                                    </p>
                                    <div className="space-y-2">
                                        {tech.scheduledTickets.map((t) => (
                                            <div key={t._id} className="border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-gray-900 text-sm truncate">{t.customerSnapshot?.name}</p>
                                                    <p className="text-xs text-gray-500">{t.serviceLabel}</p>
                                                </div>
                                                {t.scheduling?.scheduledFor && (
                                                    <span className="text-xs text-slate-600 flex items-center gap-1 shrink-0">
                                                        <CalendarClock className="w-3 h-3" />
                                                        {new Date(t.scheduling.scheduledFor).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            {/* Actions change with where the account stands */}
                            <div className="flex flex-wrap gap-2">
                                {isPending && (
                                    <>
                                        <button
                                            onClick={handleApprove}
                                            disabled={working}
                                            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm"
                                        >
                                            {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => setDialog("reject")}
                                            disabled={working}
                                            className="px-4 py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                                        >
                                            Reject
                                        </button>
                                    </>
                                )}

                                {isBlocked && canBlock && (
                                    <button
                                        onClick={handleUnblock}
                                        disabled={working}
                                        className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm"
                                    >
                                        {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                                        Unblock
                                    </button>
                                )}

                                {isRejected && !isBlocked && (
                                    <button
                                        onClick={handleApprove}
                                        disabled={working}
                                        className="flex-1 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm"
                                    >
                                        {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                                        Approve after all
                                    </button>
                                )}

                                {!isPending && !isBlocked && tech.mapsUrl && (
                                    <a
                                        href={tech.mapsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm"
                                    >
                                        <Navigation className="w-4 h-4" />
                                        Last location
                                    </a>
                                )}

                                {!isBlocked && !isPending && canBlock && (
                                    <button
                                        onClick={() => setDialog("block")}
                                        disabled={working}
                                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                                    >
                                        <Ban className="w-4 h-4" />
                                        Block
                                    </button>
                                )}
                            </div>
                        </>
                    ) : null}
                </div>
            </div>

            {dialog === "reject" && (
                <ReasonDialog
                    title="Reject this application?"
                    body="They'll see your reason when they try to sign in."
                    placeholder="Why are you rejecting this application?"
                    confirmLabel="Reject"
                    tone="red"
                    minLength={5}
                    onClose={() => setDialog(null)}
                    onConfirm={async (reason) => {
                        const res = await api.post("/admin/technicians/" + technicianId + "/reject", { reason });
                        onChanged(res.data.message);
                    }}
                    onError={setError}
                />
            )}

            {dialog === "block" && (
                <ReasonDialog
                    title="Block this account?"
                    body="This phone number will never be able to sign in or register again. Their job history stays intact."
                    placeholder="Why are you blocking this account?"
                    confirmLabel="Block permanently"
                    tone="red"
                    minLength={5}
                    onClose={() => setDialog(null)}
                    onConfirm={async (reason) => {
                        const res = await api.post("/admin/technicians/" + technicianId + "/block", { reason });
                        onChanged(res.data.message);
                    }}
                    onError={setError}
                />
            )}
        </div>
    );
};

/* ================================================================== */
/* REASON DIALOG                                                        */
/* ================================================================== */

const ReasonDialog = ({ title, body, placeholder, confirmLabel, minLength = 5, onClose, onConfirm, onError }) => {
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (reason.trim().length < minLength) return;
        setSubmitting(true);
        try {
            await onConfirm(reason.trim());
        } catch (err) {
            onError(getErrorMessage(err, "That didn't work"));
            setSubmitting(false);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-500 mb-4">{body}</p>

                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={placeholder}
                    rows={3}
                    autoFocus
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                />

                <div className="flex gap-2 mt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={reason.trim().length < minLength || submitting}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg"
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminTechnicians;