import React, { useEffect, useState, useCallback } from "react";
import AdminLayout from "../AdminLayout";
import { api, getErrorMessage } from "../../../services/api";
import { adminSocket, connectAdminSocket } from "../../../services/socket";
import { useAdminData } from "../AdminDataContext";
import {
    Clock, MapPin, Phone, Wrench, X, Search, Loader2,
    CheckCircle2, AlertCircle, Star, Navigation, Calendar,
    CalendarDays, XCircle, RefreshCw,
} from "lucide-react";

const STATUS_TABS = [
    { key: "Pending", label: "New" },
    { key: "queued", label: "Next up" },
    { key: "scheduled", label: "Scheduled" },
    { key: "active", label: "Active" },
    { key: "all", label: "All" },
];

const STATUS_STYLES = {
    Pending: "bg-amber-100 text-amber-800",
    Queued: "bg-slate-100 text-slate-700",
    Assigned: "bg-blue-100 text-blue-800",
    "In-Progress": "bg-indigo-100 text-indigo-800",
    "Payment-Pending": "bg-purple-100 text-purple-800",
    Closed: "bg-green-100 text-green-800",
    Cancelled: "bg-gray-100 text-gray-600",
};

// "Queued" is an internal state name - staff read "Scheduled"
const STATUS_LABELS = {
    Pending: "New",
    Queued: "Scheduled",
    Assigned: "Assigned",
    "In-Progress": "In progress",
    "Payment-Pending": "Awaiting payment",
    Closed: "Closed",
    Cancelled: "Cancelled",
};

const StatusBadge = ({ status }) => (
    <span className={"text-xs font-semibold px-2 py-1 rounded-full " + (STATUS_STYLES[status] || "bg-gray-100 text-gray-600")}>
        {STATUS_LABELS[status] || status}
    </span>
);

const timeAgo = (dateStr) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    return Math.floor(hrs / 24) + "d ago";
};

const AdminTickets = () => {
    const [tab, setTab] = useState("Pending");
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [selectedId, setSelectedId] = useState(null);
    const [flash, setFlash] = useState(null);
    const { refreshCounts } = useAdminData();

    const loadTickets = useCallback(async (status) => {
        try {
            const res = await api.get("/admin/tickets", { params: { status } });
            setTickets(res.data.data);
            setError("");
        } catch (err) {
            setError(getErrorMessage(err, "Could not load tickets"));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        loadTickets(tab);
    }, [tab, loadTickets]);

    useEffect(() => {
        // Auto-refresh so the queue is never stale
        const interval = setInterval(() => loadTickets(tab), 30000);

        connectAdminSocket();

        const onNewTicket = (payload) => {
            loadTickets(tab);
            setFlash("New request from " + (payload?.customerName || "a customer"));
            setTimeout(() => setFlash(null), 4000);
        };

        const onRejected = (payload) => {
            loadTickets(tab);
            setFlash(payload.technicianName + " declined a job: " + payload.reason);
            setTimeout(() => setFlash(null), 5000);
        };

        const onStartedEarly = (payload) => {
            loadTickets(tab);
            setFlash((payload?.technicianName || "A technician") + " started a scheduled job early");
            setTimeout(() => setFlash(null), 4000);
        };

        const onRefresh = () => loadTickets(tab);

        adminSocket.on("ticket:new", onNewTicket);
        adminSocket.on("ticket:rejected", onRejected);
        adminSocket.on("ticket:started-early", onStartedEarly);
        adminSocket.on("ticket:taken", onRefresh);
        adminSocket.on("payment:collected", onRefresh);

        return () => {
            clearInterval(interval);
            adminSocket.off("ticket:new", onNewTicket);
            adminSocket.off("ticket:rejected", onRejected);
            adminSocket.off("ticket:started-early", onStartedEarly);
            adminSocket.off("ticket:taken", onRefresh);
            adminSocket.off("payment:collected", onRefresh);
        };
    }, [tab, loadTickets]);
    const handleUpdated = () => {
        setSelectedId(null);
        loadTickets(tab);
        // The badge updates from here, not from the socket - waiting for the
        // round trip is what left it stale until you switched tabs
        refreshCounts();
    };

    return (
        <AdminLayout>
            <div className="flex items-start justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Tickets</h1>
                    <p className="text-gray-500 text-sm mt-1">Review requests and assign technicians.</p>
                </div>
                <button
                    onClick={() => { setRefreshing(true); loadTickets(tab); }}
                    disabled={refreshing}
                    className="shrink-0 p-2.5 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                    <RefreshCw className={"w-4 h-4 " + (refreshing ? "animate-spin" : "")} />
                </button>
            </div>

            <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit overflow-x-auto max-w-full">
                {STATUS_TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={"px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors " + (tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {flash && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    {flash}
                </div>
            )}

            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold text-red-800">{error}</p>
                </div>
            )}

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-24 animate-pulse" />
                    ))}
                </div>
            ) : tickets.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
                    <p className="font-semibold text-gray-900">No tickets here</p>
                    <p className="text-sm text-gray-500 mt-1">
                        {tab === "Pending" ? "New requests appear here automatically." : "Nothing in this view yet."}
                    </p>
                </div>
            ) : (
                <div className="space-y-3 pb-8">
                    {tickets.map((t) => (
                        <button
                            key={t._id}
                            onClick={() => setSelectedId(t._id)}
                            className={"w-full text-left bg-white border rounded-xl p-4 hover:shadow-sm transition-all " + (t.rejection?.reason ? "border-red-200 hover:border-red-300" : "border-gray-200 hover:border-green-300")}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="text-xs font-mono text-gray-400">{t.ticketNumber}</span>
                                        <StatusBadge status={t.status} />
                                        {/* A job that came back from a technician needs a decision,
                                            not just another assign - so it stands out in the queue */}
                                        {t.rejection?.reason && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                                                <XCircle className="w-3 h-3" />
                                                DECLINED BY {t.rejection.rejectedByName?.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <p className="font-semibold text-gray-900 truncate">
                                        {t.customerSnapshot?.name || "Unknown customer"} — {t.serviceLabel}
                                    </p>
                                    <p className="text-sm text-gray-500 truncate mt-0.5">
                                        {t.problemDescription || "No description provided"}
                                    </p>
                                    {t.rejection?.reason && (
                                        <p className="text-xs text-red-600 mt-1 truncate">
                                            Reason: {t.rejection.reason}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-3 mt-1">
                                        {t.technicianSnapshot?.name && (
                                            <span className="text-xs text-blue-600 flex items-center gap-1">
                                                <Wrench className="w-3 h-3" /> {t.technicianSnapshot.name}
                                            </span>
                                        )}
                                        {t.scheduling?.scheduledFor && (
                                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(t.scheduling.scheduledFor).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="shrink-0 text-right">
                                    <span className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                                        <Clock className="w-3 h-3" /> {timeAgo(t.createdAt)}
                                    </span>
                                    <span className="text-xs text-gray-400 mt-1 flex items-center gap-1 justify-end">
                                        <MapPin className="w-3 h-3" /> {t.customerSnapshot?.area || "—"}
                                    </span>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {selectedId && (
                <TicketDetailModal ticketId={selectedId} onClose={() => setSelectedId(null)} onUpdated={handleUpdated} />
            )}
        </AdminLayout>
    );
};

/* ================================================================== */
/* DETAIL MODAL                                                        */
/* ================================================================== */

const TicketDetailModal = ({ ticketId, onClose, onUpdated }) => {
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionError, setActionError] = useState("");
    const [panel, setPanel] = useState(null); // assign | reschedule | cancel

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await api.get("/admin/tickets/" + ticketId);
                setTicket(res.data.data);
            } catch (err) {
                setError(getErrorMessage(err, "Could not load ticket"));
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [ticketId]);

    const lat = ticket?.customerSnapshot?.lat;
    const lon = ticket?.customerSnapshot?.lon;
    const hasLocation = Number.isFinite(lat) && Number.isFinite(lon);
    const isPending = ticket?.status === "Pending";
    const isAssignable = ["Queued", "Assigned", "In-Progress"].includes(ticket?.status);

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
                    <h2 className="font-bold text-gray-900">{ticket ? ticket.ticketNumber : "Ticket"}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="py-10 flex justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    ) : error ? (
                        <p className="text-sm text-red-600">{error}</p>
                    ) : ticket ? (
                        <>
                            <div className="flex items-center gap-2 mb-4">
                                <StatusBadge status={ticket.status} />
                                <span className="text-xs text-gray-400">{timeAgo(ticket.createdAt)}</span>
                            </div>

                            {/* Shown before anything else - it's the reason this ticket
                                is back in the queue and drives what to do next */}
                            {ticket.rejection?.reason && (
                                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <XCircle className="w-4 h-4 text-red-600" />
                                        <p className="text-xs font-bold text-red-700 uppercase">
                                            Declined by {ticket.rejection.rejectedByName}
                                        </p>
                                    </div>
                                    <p className="text-sm text-red-800">{ticket.rejection.reason}</p>
                                    <p className="text-xs text-red-600 mt-1.5">
                                        {ticket.rejection.wasScheduled && "This was a scheduled job. "}
                                        Assign someone else, reschedule, or cancel it.
                                    </p>
                                </div>
                            )}

                            {ticket.scheduling?.scheduledFor && (
                                <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
                                    <CalendarDays className="w-4 h-4 text-slate-500 shrink-0" />
                                    <p className="text-sm text-slate-700">
                                        Scheduled for{" "}
                                        <span className="font-semibold">
                                            {new Date(ticket.scheduling.scheduledFor).toLocaleDateString("en-IN", {
                                                day: "numeric", month: "short", year: "numeric",
                                            })}
                                        </span>
                                        {ticket.scheduling.slotWindow && " (" + ticket.scheduling.slotWindow + ")"}
                                    </p>
                                </div>
                            )}

                            <div className="bg-gray-50 rounded-xl p-4 mb-4">
                                <p className="font-semibold text-gray-900">{ticket.customerSnapshot?.name}</p>
                                <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                                    <Phone className="w-3.5 h-3.5" /> {ticket.customerSnapshot?.phone}
                                </div>
                                <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {ticket.customerSnapshot?.address || ticket.customerSnapshot?.area || "No address"}
                                </div>
                            </div>

                            {hasLocation ? (
                                <div className="rounded-xl overflow-hidden border border-gray-200 mb-4 h-48">
                                    <iframe
                                        title="Customer location"
                                        width="100%"
                                        height="100%"
                                        style={{ border: 0 }}
                                        loading="lazy"
                                        src={"https://maps.google.com/maps?q=" + lat + "," + lon + "&z=15&output=embed"}
                                    />
                                </div>
                            ) : (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800">
                                    No location on this ticket — nearby technician search will not work.
                                </div>
                            )}

                            <div className="mb-4">
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Service</p>
                                <p className="text-sm text-gray-900">{ticket.serviceLabel}</p>
                                {ticket.selectedIssues?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {ticket.selectedIssues.map((issue, i) => (
                                            <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                                                {issue}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {ticket.problemDescription && (
                                    <p className="text-sm text-gray-600 mt-2">{ticket.problemDescription}</p>
                                )}
                            </div>

                            {ticket.technicianSnapshot?.name && (
                                <div className="bg-blue-50 rounded-xl p-4 mb-4">
                                    <p className="text-xs font-semibold text-blue-500 uppercase mb-1">
                                        {ticket.status === "Queued" ? "Scheduled with" : "Assigned to"}
                                    </p>
                                    <p className="font-semibold text-gray-900">{ticket.technicianSnapshot.name}</p>
                                    <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                                        <Phone className="w-3.5 h-3.5" /> {ticket.technicianSnapshot.phone}
                                    </div>
                                </div>
                            )}

                            {actionError && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                    {actionError}
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                                {(isPending || isAssignable) && (
                                    <button
                                        onClick={() => setPanel("assign")}
                                        disabled={!hasLocation}
                                        className={"flex-1 min-w-[160px] flex items-center justify-center gap-2 disabled:opacity-40 text-white font-semibold py-2.5 rounded-lg text-sm " + (isPending ? "bg-green-700 hover:bg-green-800" : "bg-blue-600 hover:bg-blue-700")}
                                    >
                                        <Search className="w-4 h-4" />
                                        {isPending ? "Find nearby technicians" : "Reassign"}
                                    </button>
                                )}

                                {(isPending || ticket.status === "Queued" || ticket.status === "Assigned") && (
                                    <button
                                        onClick={() => setPanel("reschedule")}
                                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                                    >
                                        <CalendarDays className="w-4 h-4" />
                                        Reschedule
                                    </button>
                                )}

                                {(isPending || isAssignable) && (
                                    <button
                                        onClick={() => setPanel("cancel")}
                                        className="px-4 py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </>
                    ) : null}
                </div>
            </div>

            {panel === "assign" && ticket && (
                <AssignPanel ticket={ticket} onClose={() => setPanel(null)} onDone={onUpdated} onError={setActionError} />
            )}
            {panel === "reschedule" && ticket && (
                <ReschedulePanel ticket={ticket} onClose={() => setPanel(null)} onDone={onUpdated} onError={setActionError} />
            )}
            {panel === "cancel" && ticket && (
                <CancelDialog ticket={ticket} onClose={() => setPanel(null)} onDone={onUpdated} onError={setActionError} />
            )}
        </div>
    );
};

/* ================================================================== */
/* ASSIGN / REASSIGN                                                   */
/* ================================================================== */

const RADIUS_OPTIONS = [
    { label: "5 km", value: 5000 },
    { label: "15 km", value: 15000 },
    { label: "30 km", value: 30000 },
    { label: "50 km", value: 50000 },
];

const AssignPanel = ({ ticket, onClose, onDone, onError }) => {
    const [radius, setRadius] = useState(15000);
    const [loading, setLoading] = useState(true);
    const [technicians, setTechnicians] = useState([]);
    const [meta, setMeta] = useState(null);
    const [assigningId, setAssigningId] = useState(null);
    const [searchError, setSearchError] = useState("");
    const [queuePrompt, setQueuePrompt] = useState(null);

    const isReassign = ticket.status !== "Pending";

    const search = useCallback(async (r) => {
        setLoading(true);
        setSearchError("");
        try {
            const res = await api.get("/admin/tickets/" + ticket._id + "/nearby-technicians", { params: { radius: r } });
            setTechnicians(res.data.data);
            setMeta(res.data.meta);
        } catch (err) {
            setSearchError(getErrorMessage(err, "Search failed"));
        } finally {
            setLoading(false);
        }
    }, [ticket._id]);

    useEffect(() => {
        search(radius);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const doAssign = async (tech, allowQueue) => {
        setAssigningId(tech._id);
        onError("");

        const endpoint = isReassign
            ? "/admin/tickets/" + ticket._id + "/reassign"
            : "/admin/tickets/" + ticket._id + "/assign";

        const payload = isReassign
            ? { technicianId: tech._id, reason: "Reassigned from ticket detail", allowQueue }
            : { technicianId: tech._id, distanceInMeters: tech.distanceInMeters, allowQueue };

        try {
            await api.post(endpoint, payload);
            onDone();
        } catch (err) {
            // The server offers to queue when the technician is already busy
            if (err.response?.data?.canQueue) {
                setQueuePrompt(tech);
            } else {
                onError(getErrorMessage(err, "Could not assign this technician"));
                search(radius);
            }
            setAssigningId(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col">
                <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-gray-900">{isReassign ? "Reassign to" : "Nearby technicians"}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">for {ticket.serviceLabel}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-6 py-3 border-b border-gray-100 flex gap-2">
                    {RADIUS_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => { setRadius(opt.value); search(opt.value); }}
                            className={"px-3 py-1.5 text-xs font-medium rounded-full border transition-colors " + (radius === opt.value ? "bg-green-700 text-white border-green-700" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300")}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                {meta && !loading && (
                    <div className="px-6 py-2 bg-gray-50 border-b border-gray-100">
                        <p className="text-xs text-gray-500">
                            {meta.availableNow} free now · {meta.found - meta.availableNow} busy or offline
                            {meta.noLocationSet > 0 && " · " + meta.noLocationSet + " haven't set their location"}
                        </p>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {loading ? (
                        <div className="py-10 flex justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    ) : searchError ? (
                        <p className="text-sm text-red-600">{searchError}</p>
                    ) : technicians.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="font-semibold text-gray-900">No technicians found</p>
                            <p className="text-sm text-gray-500 mt-1">Try a larger radius.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {technicians
                                .filter((t) => String(t._id) !== String(ticket.technician))
                                .map((tech) => (
                                    <div key={tech._id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                                            {tech.profileImage ? (
                                                <img src={tech.profileImage} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-sm font-bold text-gray-500">
                                                    {tech.name?.[0]?.toUpperCase() || "?"}
                                                </span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-gray-900 text-sm truncate">{tech.name}</p>
                                                {tech.liveStatus === "on_job" && (
                                                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded shrink-0">
                                                        ON JOB
                                                    </span>
                                                )}
                                                {tech.liveStatus === "offline" && (
                                                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                                                        OFFLINE
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                                <span className="flex items-center gap-0.5">
                                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                                    {tech.rating?.toFixed(1) || "5.0"}
                                                </span>
                                                <span className="flex items-center gap-0.5">
                                                    <Navigation className="w-3 h-3" /> {tech.distanceKm} km
                                                </span>
                                                {tech.scheduledJobs > 0 && (
                                                    <span className="flex items-center gap-0.5 text-slate-600">
                                                        <CalendarDays className="w-3 h-3" /> {tech.scheduledJobs}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => doAssign(tech, false)}
                                            disabled={assigningId !== null || tech.liveStatus === "offline"}
                                            className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-green-700 hover:bg-green-800 disabled:opacity-40 text-white text-sm font-semibold rounded-lg"
                                        >
                                            {assigningId === tech._id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assign"}
                                        </button>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            </div>

            {queuePrompt && (
                <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                        <h3 className="font-bold text-gray-900 mb-1">{queuePrompt.name} is on another job</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Add this to their list? It starts on its own once their current job is paid and closed.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setQueuePrompt(null)}
                                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                                Pick someone else
                            </button>
                            <button
                                onClick={() => { const t = queuePrompt; setQueuePrompt(null); doAssign(t, true); }}
                                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                            >
                                Add to their list
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ================================================================== */
/* RESCHEDULE                                                          */
/* ================================================================== */

const ReschedulePanel = ({ ticket, onClose, onDone, onError }) => {
    const [date, setDate] = useState("");
    const [slotWindow, setSlotWindow] = useState("");
    const [reason, setReason] = useState("");
    const [technicianId, setTechnicianId] = useState(ticket.technician || "");
    const [technicians, setTechnicians] = useState([]);
    const [loadingTechs, setLoadingTechs] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                // Everyone with the right skill - a future date doesn't care
                // whether they're busy today
                const res = await api.get("/admin/technicians", { params: { skill: ticket.serviceKey } });
                setTechnicians(res.data.data);
            } catch {
                // picker just stays empty
            } finally {
                setLoadingTechs(false);
            }
        };
        load();
    }, [ticket.serviceKey]);

    const handleSubmit = async () => {
        if (!date || !technicianId) return;
        setSubmitting(true);
        onError("");
        try {
            await api.post("/admin/tickets/" + ticket._id + "/reschedule", {
                scheduledFor: date,
                slotWindow: slotWindow || undefined,
                reason: reason.trim() || undefined,
                technicianId,
            });
            onDone();
        } catch (err) {
            onError(getErrorMessage(err, "Could not reschedule this ticket"));
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-gray-900">Move to another day</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                    The customer gets a message with the new date and technician.
                </p>

                <label className="block text-sm font-semibold text-gray-700 mb-1.5">New date</label>
                <input
                    type="date"
                    value={date}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700 mb-3"
                />

                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Time slot</label>
                <select
                    value={slotWindow}
                    onChange={(e) => setSlotWindow(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700 mb-3"
                >
                    <option value="">Any time</option>
                    <option value="9 AM - 12 PM">9 AM - 12 PM</option>
                    <option value="12 PM - 3 PM">12 PM - 3 PM</option>
                    <option value="3 PM - 6 PM">3 PM - 6 PM</option>
                    <option value="6 PM - 9 PM">6 PM - 9 PM</option>
                </select>

                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Technician</label>
                {loadingTechs ? (
                    <div className="py-3 flex justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <>
                        <select
                            value={technicianId}
                            onChange={(e) => setTechnicianId(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700 mb-1"
                        >
                            <option value="">Choose a technician</option>
                            {technicians.map((t) => (
                                <option key={t._id} value={t._id}>
                                    {t.name} — {t.area}
                                    {t.liveStatus === "on_job" ? " (on a job today)" : ""}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-400 mb-3">
                            Busy technicians are fine here — this job waits for its date.
                        </p>
                    </>
                )}

                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason (optional)"
                    rows={2}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700"
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
                        disabled={!date || !technicianId || submitting}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-green-700 hover:bg-green-800 disabled:opacity-50 rounded-lg"
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Reschedule
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ================================================================== */
/* CANCEL                                                              */
/* ================================================================== */

const CancelDialog = ({ ticket, onClose, onDone, onError }) => {
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (reason.trim().length < 3) return;
        setSubmitting(true);
        onError("");
        try {
            await api.post("/admin/tickets/" + ticket._id + "/cancel", { reason: reason.trim() });
            onDone();
        } catch (err) {
            onError(getErrorMessage(err, "Could not cancel this ticket"));
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                <h3 className="font-bold text-gray-900 mb-1">Cancel this ticket?</h3>
                <p className="text-sm text-gray-500 mb-4">The customer will be notified.</p>

                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason for cancellation"
                    rows={3}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                />

                <div className="flex gap-2 mt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                        Keep ticket
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={reason.trim().length < 3 || submitting}
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg"
                    >
                        {submitting ? "Cancelling..." : "Cancel ticket"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminTickets;