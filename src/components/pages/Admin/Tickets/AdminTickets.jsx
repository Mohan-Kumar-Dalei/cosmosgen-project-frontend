import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "../AdminLayout";
import { api, getErrorMessage } from "../../../services/api";
import { adminSocket, connectAdminSocket } from "../../../services/socket";
import { useAdminData } from "../AdminDataContext";
import CustomDropdown from "../../../ui/CustomDropdown";
import LocationMap from "../../../ui/LocationMap";
import MapModal from "../../../ui/MapModal";
import useAreaLookup from "../../../ui/useAreaLookup";
import NotifyBadge from "../../../ui/NotifyBadge";
import {
    Clock, MapPin, Phone, Wrench, X, Search, Loader2,
    CheckCircle2, AlertCircle, Star, Navigation, Calendar,
    CalendarDays, XCircle, RefreshCw, PhoneCall,
} from "lucide-react";

const STATUS_TABS = [
    { key: "Pending", label: "New" },
    // Came back after being assigned. Kept apart from "New" because these
    // need a decision - somebody has already been out to them, or been told
    // no - and buried in with fresh requests they just got reassigned.
    { key: "returned", label: "Pending" },
    { key: "queued", label: "Next up" },
    { key: "scheduled", label: "Scheduled" },
    { key: "active", label: "Active" },
    // "Cancelled" is the raw status, which the list endpoint already filters
    // on directly - no special case needed on the server.
    { key: "Cancelled", label: "Cancelled" },
    { key: "all", label: "All" },
];

const STATUS_STYLES = {
    Pending: "bg-warn-tint text-warn",
    Queued: "bg-sunken text-ink",
    Assigned: "bg-info-tint text-info",
    "In-Progress": "bg-info-tint text-info",
    "Payment-Pending": "bg-info-tint text-info",
    Closed: "bg-brand-tint text-brand",
    Cancelled: "bg-sunken text-ink-soft",
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
    <span className={"text-xs font-semibold px-2 py-1 rounded-full " + (STATUS_STYLES[status] || "bg-sunken text-ink-soft")}>
        {STATUS_LABELS[status] || status}
    </span>
);

// A position older than this is worth flagging: the technician panel only
// reports a location while it is open, so a fix from this morning says where
// they were, not where they are.
const STALE_LOCATION_MS = 6 * 60 * 60 * 1000;
const isStaleLocation = (dateStr) => Date.now() - new Date(dateStr).getTime() > STALE_LOCATION_MS;

const timeAgo = (dateStr) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    return Math.floor(hrs / 24) + "d ago";
};

const EMPTY_TEXT = {
    Pending: "No new requests waiting.",
    returned: "Nothing has come back from a vendor.",
    queued: "Nothing queued behind a current job.",
    scheduled: "Nothing booked for a future date.",
    active: "No jobs in progress.",
    Cancelled: "No cancelled tickets.",
    all: "No tickets yet.",
};

const AdminTickets = () => {
    // The tab lives in the URL so a notification can open the exact one that
    // changed, and so a link to "Cancelled" still lands on Cancelled.
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = searchParams.get("tab") || "Pending";
    const setTab = useCallback(
        (key) => setSearchParams(key === "Pending" ? {} : { tab: key }, { replace: true }),
        [setSearchParams]
    );

    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedId, setSelectedId] = useState(null);
    const [flash, setFlash] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const { counts, refreshCounts, globalRefreshTrigger } = useAdminData();

    // The sidebar shows one number for the whole screen. Splitting it across
    // the tabs is what tells the person on the desk which queue to open.
    //
    // Every figure is counted on the server, so a tab carries its number
    // whether or not it is the one on screen. "Next up" had none at all and
    // "Scheduled" showed both queues added together, because the two share a
    // status and only a date tells them apart.
    const ticketTabCounts = {
        Pending: counts.ticketsNew || 0,
        returned: counts.ticketsReturned || 0,
        queued: counts.ticketsQueued || 0,
        scheduled: counts.ticketsScheduled || 0,
        active: counts.ticketsActive || 0,
    };

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

    // No timer polls this page any more. AdminLayout bumps
    // globalRefreshTrigger on every admin socket event, so listening to it
    // here is what keeps the list current when another admin acts.
    useEffect(() => {
        setLoading(true);
        loadTickets(tab);
    }, [tab, loadTickets, globalRefreshTrigger]);

    useEffect(() => {
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
            setFlash((payload?.technicianName || "A vendor") + " started a scheduled job early");
            setTimeout(() => setFlash(null), 4000);
        };

        const onRefresh = () => loadTickets(tab);

        adminSocket.on("ticket:new", onNewTicket);
        adminSocket.on("ticket:rejected", onRejected);
        adminSocket.on("ticket:started-early", onStartedEarly);
        adminSocket.on("ticket:customer-refused", onRefresh);
        adminSocket.on("ticket:taken", onRefresh);
        adminSocket.on("payment:collected", onRefresh);
        adminSocket.on("call:availability", onRefresh);

        return () => {
            adminSocket.off("ticket:new", onNewTicket);
            adminSocket.off("ticket:rejected", onRejected);
            adminSocket.off("ticket:started-early", onStartedEarly);
            adminSocket.off("ticket:customer-refused", onRefresh);
            adminSocket.off("ticket:taken", onRefresh);
            adminSocket.off("payment:collected", onRefresh);
            adminSocket.off("call:availability", onRefresh);
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
                    <h1 className="cg-h1">Tickets</h1>
                    <p className="cg-sub mt-1">Review requests and assign vendors.</p>
                </div>
                <button
                    onClick={() => { setRefreshing(true); loadTickets(tab); }}
                    disabled={refreshing}
                    className="cg-icon-btn shrink-0"
                >
                    <RefreshCw className={"w-4 h-4 " + (refreshing ? "animate-spin" : "")} />
                </button>
            </div>

            <div className="cg-tabbar cg-tabs mb-6">
                {STATUS_TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={"cg-tab " + (tab === t.key ? "cg-tab-on" : "")}
                    >
                        {t.label}
                        <NotifyBadge count={ticketTabCounts[t.key] || 0} className="ml-1.5" />
                    </button>
                ))}
            </div>

            {flash && (
                <div className="mb-4 p-3 bg-brand-tint border border-hairline rounded-lg text-sm text-brand flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    {flash}
                </div>
            )}

            {error && (
                <div className="mb-4 p-4 bg-danger-tint border border-hairline rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold text-danger">{error}</p>
                </div>
            )}

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="cg-card p-4 h-24 animate-pulse" />
                    ))}
                </div>
            ) : tickets.length === 0 ? (
                <div className="cg-card p-10 text-center">
                    <p className="font-semibold text-ink">Nothing here</p>
                    <p className="text-sm text-ink-soft mt-1">
                        {EMPTY_TEXT[tab] || "Nothing in this view yet."}
                    </p>
                </div>
            ) : (
                <div className="space-y-3 pb-8">
                    {tickets.map((t) => (
                        <button
                            key={t._id}
                            onClick={() => setSelectedId(t._id)}
                            className={"w-full text-left bg-white border rounded-xl p-4 hover:shadow-sm transition-all " + (t.rejection?.reason ? "border-hairline hover:border-red-300" : "border-hairline hover:border-green-300")}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="text-xs font-mono text-ink-faint">{t.ticketNumber}</span>
                                        <StatusBadge status={t.status} />
                                        {/* A job that came back from a technician needs a decision,
                                            not just another assign - so it stands out in the queue */}
                                        {t.rejection?.reason && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-danger bg-danger-tint px-2 py-0.5 rounded-full">
                                                <XCircle className="w-3 h-3" />
                                                DECLINED BY {t.rejection.rejectedByName?.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <p className="font-semibold text-ink truncate">
                                        {t.customerSnapshot?.name || "Unknown customer"} — {t.serviceLabel}
                                    </p>
                                    <p className="text-sm text-ink-soft truncate mt-0.5">
                                        {t.problemDescription || "No description provided"}
                                    </p>
                                    {t.rejection?.reason && (
                                        <p className="text-xs text-danger mt-1 truncate">
                                            Reason: {t.rejection.reason}
                                        </p>
                                    )}
                                    {/* The reason is the whole point of this
                                        view - it is what staff repeat back
                                        when the customer rings to ask why. */}
                                    {t.status === "Cancelled" && t.cancelReason && (
                                        <p className="text-xs text-ink-soft mt-1 truncate">
                                            Cancelled: {t.cancelReason}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-3 mt-1">
                                        {t.technicianSnapshot?.name && (
                                            <span className="text-xs text-info flex items-center gap-1">
                                                <Wrench className="w-3 h-3" /> {t.technicianSnapshot.name}
                                            </span>
                                        )}
                                        {t.scheduling?.scheduledFor && (
                                            <span className="text-xs text-ink-soft flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(t.scheduling.scheduledFor).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="shrink-0 text-right">
                                    <span className="text-xs text-ink-faint flex items-center gap-1 justify-end">
                                        <Clock className="w-3 h-3" /> {timeAgo(t.createdAt)}
                                    </span>
                                    <span className="text-xs text-ink-faint mt-1 flex items-center gap-1 justify-end">
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

/**
 * What the customer said when we rang them, as one line.
 *
 * The office does not want three booleans and a free text field; it wants to
 * glance at a ticket and know whether anyone will be home. So the fields are
 * turned into the sentence a person would say.
 */
const availabilityLine = (check) => {
    if (!check?.calledAt) return null;

    if (check.wantsCancel) {
        return { text: "Customer wants to cancel the ticket", tone: "danger" };
    }

    if (check.available === true) {
        return { text: "Customer available today", tone: "ok" };
    }

    if (check.available === false) {
        const when = [check.preferredDay, check.preferredTime].filter(Boolean).join(", ");
        return {
            text: when
                ? "Customer not available today. Reschedule to " + when
                : "Customer not available today",
            tone: "warn",
        };
    }

    // Dialled, but nobody has answered yet
    return { text: "Calling the customer now", tone: "muted" };
};

const CallResult = ({ check }) => {
    const line = availabilityLine(check);
    if (!line) return null;

    const skin = {
        ok: "bg-success-tint text-success",
        warn: "bg-warn-tint text-warn",
        danger: "bg-danger-tint text-danger",
        muted: "bg-sunken text-ink-soft",
    }[line.tone];

    return (
        <div className={"flex items-start gap-2 rounded-xl p-3 mb-4 text-sm font-medium " + skin}>
            <PhoneCall className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
                <p>{line.text}</p>
                {check.note && <p className="text-xs opacity-80 mt-0.5">{check.note}</p>}
            </div>
        </div>
    );
};

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

    const [calling, setCalling] = useState(false);

    const reload = useCallback(async () => {
        try {
            const res = await api.get("/admin/tickets/" + ticketId);
            setTicket(res.data.data);
        } catch {
            // The list behind this refreshes anyway
        }
    }, [ticketId]);

    /**
     * The answer arrives a minute after the button is pressed, over the
     * socket, because the customer has to actually be spoken to first.
     */
    useEffect(() => {
        const onAnswered = (data) => {
            if (String(data?.ticketId) !== String(ticketId)) return;
            setCalling(false);
            reload();
            onUpdated?.();
        };

        adminSocket.on("call:availability", onAnswered);
        return () => adminSocket.off("call:availability", onAnswered);
    }, [ticketId, reload, onUpdated]);

    const callCustomer = async () => {
        setActionError("");
        setCalling(true);
        try {
            await api.post("/admin/tickets/" + ticketId + "/call");
            await reload();
        } catch (err) {
            setCalling(false);
            setActionError(getErrorMessage(err, "Could not place the call"));
        }
    };

    const onRefusalDone = async () => {
        try {
            const res = await api.get("/admin/tickets/" + ticketId);
            setTicket(res.data.data);
        } catch {
            // The list behind this refreshes anyway
        }
        onUpdated?.();
    };

    const lat = ticket?.customerSnapshot?.lat;
    const lon = ticket?.customerSnapshot?.lon;
    const hasLocation = Number.isFinite(lat) && Number.isFinite(lon);
    const [showMap, setShowMap] = useState(false);
    const { place, loading: placeLoading } = useAreaLookup(lat, lon, hasLocation);
    const isPending = ticket?.status === "Pending";
    const isAssignable = ["Queued", "Assigned", "In-Progress"].includes(ticket?.status);

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-hairline px-6 py-4 flex items-center justify-between z-10">
                    <h2 className="font-bold text-ink">{ticket ? ticket.ticketNumber : "Ticket"}</h2>
                    <button onClick={onClose} className="text-ink-faint hover:text-ink-soft">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="py-10 flex justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-ink-faint" />
                        </div>
                    ) : error ? (
                        <p className="text-sm text-danger">{error}</p>
                    ) : ticket ? (
                        <>
                            <div className="flex items-center gap-2 mb-4">
                                <StatusBadge status={ticket.status} />
                                <span className="text-xs text-ink-faint">{timeAgo(ticket.createdAt)}</span>
                            </div>

                            {/* Shown before anything else - it's the reason this ticket
                                is back in the queue and drives what to do next */}
                            {ticket.refusal?.status === "awaiting_verification" && (
                                <RefusalHold ticket={ticket} onDone={onRefusalDone} />
                            )}

                            {ticket.refusal?.status === "customer_declined" && !ticket.refusal?.visitChargeBilled && (
                                <div className="mb-4 p-4 bg-sunken border border-hairline rounded-xl">
                                    <p className="text-xs font-bold text-ink-soft uppercase mb-1">
                                        Customer confirmed they're not going ahead
                                    </p>
                                    <p className="text-sm text-ink">
                                        {ticket.refusal.verifiedByName} spoke to them
                                        {ticket.refusal.officeNote ? ". " + ticket.refusal.officeNote : "."}
                                        The vendor is taking the visit charge and leaving.
                                    </p>
                                </div>
                            )}

                            {ticket.rejection?.reason && (
                                ticket.rejection.outcome === "customer_refused" ? (
                                    /* The customer said no on the doorstep. Sending
                                       the next technician straight out gets the same
                                       answer and costs another trip - so this asks
                                       for a phone call first. Only this office can
                                       close the job; the technician cannot. */
                                    <div className="mb-4 p-4 bg-warn-tint border border-hairline rounded-xl">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <AlertCircle className="w-4 h-4 text-warn" />
                                            <p className="text-xs font-bold text-warn uppercase">
                                                Customer refused — {ticket.rejection.rejectedByName} had reached them
                                            </p>
                                        </div>
                                        <p className="text-sm text-warn">{ticket.rejection.reason}</p>
                                        <p className="text-xs text-warn mt-1.5">
                                            {ticket.rejection.wasScheduled && "This was a scheduled job. "}
                                            Call them before sending anyone else — they may just want to
                                            talk about the price. Then assign, reschedule, or cancel.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="mb-4 p-4 bg-danger-tint border border-hairline rounded-xl">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <XCircle className="w-4 h-4 text-danger" />
                                            <p className="text-xs font-bold text-danger uppercase">
                                                Declined by {ticket.rejection.rejectedByName}
                                            </p>
                                        </div>
                                        <p className="text-sm text-danger">{ticket.rejection.reason}</p>
                                        <p className="text-xs text-danger mt-1.5">
                                            {ticket.rejection.wasScheduled && "This was a scheduled job. "}
                                            Assign someone else, reschedule, or cancel it.
                                        </p>
                                    </div>
                                )
                            )}

                            {ticket.scheduling?.scheduledFor && (
                                <div className="mb-4 p-3 bg-sunken border border-hairline rounded-xl flex items-center gap-2">
                                    <CalendarDays className="w-4 h-4 text-ink-soft shrink-0" />
                                    <p className="text-sm text-ink">
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

                            <div className="bg-sunken rounded-xl p-4 mb-4">
                                <p className="font-semibold text-ink">{ticket.customerSnapshot?.name}</p>
                                <div className="flex items-center gap-1 text-sm text-ink-soft mt-1">
                                    <Phone className="w-3.5 h-3.5" /> {ticket.customerSnapshot?.phone}
                                </div>
                                <div className="flex items-start gap-1.5 text-sm text-ink-soft mt-1">
                                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                    <span>
                                        {/* A WhatsApp booking arrives as a dropped pin with no
                                            address text, so the area and pincode are resolved
                                            from the coordinate rather than read off the record. */}
                                        {placeLoading ? (
                                            <span className="text-ink-faint">Looking up the area…</span>
                                        ) : place ? (
                                            <>
                                                <span className="font-medium text-ink">
                                                    {[place.area, place.city].filter(Boolean).join(", ") || "Area not identified"}
                                                </span>
                                                {place.pincode && (
                                                    <span className="ml-2 text-xs font-mono text-ink-soft">{place.pincode}</span>
                                                )}
                                                {place.address && (
                                                    <span className="block text-xs text-ink-soft mt-0.5">{place.address}</span>
                                                )}
                                            </>
                                        ) : (
                                            ticket.customerSnapshot?.address || ticket.customerSnapshot?.area || "No address"
                                        )}
                                    </span>
                                </div>
                            </div>

                            {hasLocation ? (
                                /* Clicking used to throw the admin out to a Google tab. It
                                   opens the map here now; the trip to Google is a button
                                   inside the modal, taken only if they want the full site. */
                                <button
                                    onClick={() => setShowMap(true)}
                                    className="relative w-full mb-4 group rounded-xl overflow-hidden"
                                    title="Open the full map"
                                >
                                    <div className="pointer-events-none">
                                        <LocationMap
                                            markers={[{ lat, lon, color: "#15803d", title: "Customer" }]}
                                            className="h-44"
                                            zoom={15}
                                            gestureHandling="none"
                                        />
                                    </div>
                                    <span className="absolute bottom-2 right-2 text-[11px] font-semibold bg-white/95 text-ink px-2.5 py-1 rounded-lg shadow-sm group-hover:bg-white">
                                        Tap to expand
                                    </span>
                                </button>
                            ) : (
                                <div className="bg-warn-tint border border-hairline rounded-xl p-3 mb-4 text-sm text-warn">
                                    No location on this ticket — nearby vendor search will not work.
                                </div>
                            )}

                            <MapModal
                                open={showMap}
                                onClose={() => setShowMap(false)}
                                title={ticket.customerSnapshot?.name || "Customer"}
                                subtitle={ticket.ticketNumber + " · " + ticket.serviceLabel}
                                lat={lat}
                                lon={lon}
                                markerColor="#15803d"
                            />

                            <div className="mb-4">
                                <p className="text-xs font-semibold text-ink-faint uppercase mb-1">Service</p>
                                <p className="text-sm text-ink">{ticket.serviceLabel}</p>
                                {ticket.selectedIssues?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {ticket.selectedIssues.map((issue, i) => (
                                            <span key={i} className="text-xs bg-sunken text-ink px-2 py-1 rounded-full">
                                                {issue}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {ticket.problemDescription && (
                                    <p className="text-sm text-ink-soft mt-2">{ticket.problemDescription}</p>
                                )}
                            </div>

                            {ticket.technicianSnapshot?.name && (
                                <div className="bg-info-tint rounded-xl p-4 mb-4">
                                    <p className="text-xs font-semibold text-blue-500 uppercase mb-1">
                                        {ticket.status === "Queued" ? "Scheduled with" : "Assigned to"}
                                    </p>
                                    <p className="font-semibold text-ink">{ticket.technicianSnapshot.name}</p>
                                    <div className="flex items-center gap-1 text-sm text-ink-soft mt-1">
                                        <Phone className="w-3.5 h-3.5" /> {ticket.technicianSnapshot.phone}
                                    </div>
                                </div>
                            )}

                            <CallResult check={ticket.availabilityCheck} />

                            {actionError && (
                                <div className="mb-4 p-3 bg-danger-tint border border-hairline rounded-lg text-sm text-danger">
                                    {actionError}
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                                {(isPending || isAssignable) && (
                                    <button
                                        onClick={() => setPanel("assign")}
                                        disabled={!hasLocation}
                                        className={"flex-1 min-w-[160px] flex items-center justify-center gap-2 disabled:opacity-40 text-white font-semibold py-2.5 rounded-lg text-sm " + (isPending ? "bg-brand hover:bg-brand-deep" : "bg-blue-600 hover:bg-blue-700")}
                                    >
                                        <Search className="w-4 h-4" />
                                        {isPending ? "Find nearby vendors" : "Reassign"}
                                    </button>
                                )}

                                {(isPending || ticket.status === "Queued" || ticket.status === "Assigned") && (
                                    <button
                                        onClick={() => setPanel("reschedule")}
                                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-ink border border-hairline rounded-lg hover:bg-sunken"
                                    >
                                        <CalendarDays className="w-4 h-4" />
                                        Reschedule
                                    </button>
                                )}

                                {(isPending || ticket.status === "Queued" || ticket.status === "Assigned") && (
                                    <button
                                        onClick={callCustomer}
                                        disabled={calling}
                                        title="Ask the customer whether today suits them"
                                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-ink border border-hairline rounded-lg hover:bg-sunken disabled:opacity-40"
                                    >
                                        {calling
                                            ? <Loader2 className="w-4 h-4 animate-spin" />
                                            : <PhoneCall className="w-4 h-4" />}
                                        {calling ? "Calling" : "Call customer"}
                                    </button>
                                )}

                                {(isPending || isAssignable) && (
                                    <button
                                        onClick={() => setPanel("cancel")}
                                        className="px-4 py-2.5 text-sm font-medium text-danger border border-hairline rounded-lg hover:bg-danger-tint"
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

/**
 * A technician is standing in the customer's house right now, waiting to be
 * told whether to carry on or pack up.
 *
 * Nothing else in this panel is costing money by the minute, so it gets the
 * loudest treatment and the customer's number right there - the whole point
 * is that somebody rings them immediately. The two buttons are the office's
 * decision: the technician can report the refusal but cannot end the job.
 */
const RefusalHold = ({ ticket, onDone }) => {
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");

    const decide = async (decision) => {
        setBusy(decision);
        setError("");
        try {
            await api.post("/admin/tickets/" + ticket._id + "/refusal", { decision, note: note.trim() });
            await onDone();
        } catch (err) {
            setError(getErrorMessage(err, "Could not record that"));
            setBusy("");
        }
    };

    // A clock, not a poll. This alert says how long a technician has been
    // standing in a customer's house waiting for the office to ring back, and
    // a number frozen at whenever the page last rendered is the one thing it
    // must not be.
    const minsSince = () =>
        Math.max(0, Math.floor((Date.now() - new Date(ticket.refusal.raisedAt).getTime()) / 60000));

    const [waitingMins, setWaitingMins] = useState(minsSince);

    useEffect(() => {
        const id = setInterval(() => setWaitingMins(minsSince()), 60000);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ticket.refusal.raisedAt]);

    return (
        <div className="mb-4 p-4 bg-warn-tint border-2 border-amber-400 rounded-xl">
            <div className="flex items-start gap-2.5">
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-50" />
                    <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-warn">
                        <PhoneCall className="h-4 w-4 text-white" />
                    </span>
                </span>

                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-warn uppercase">
                        Call the customer — {ticket.refusal.raisedByName} is waiting on site
                        {waitingMins > 0 ? " (" + waitingMins + " min)" : ""}
                    </p>
                    <p className="text-sm text-warn mt-1">
                        They refused the quote: {ticket.refusal.reason}
                    </p>

                    {ticket.customerSnapshot?.phone && (
                        <a
                            href={"tel:" + ticket.customerSnapshot.phone}
                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-amber-300 rounded-lg text-sm font-semibold text-warn hover:bg-warn-tint"
                        >
                            <Phone className="w-4 h-4" />
                            Call {ticket.customerSnapshot.name || ticket.customerSnapshot.phone}
                        </a>
                    )}

                    <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="What did they say? (optional)"
                        className="w-full mt-3 px-3 py-2 border border-amber-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />

                    {error && <p className="mt-2 text-sm text-danger">{error}</p>}

                    <div className="flex flex-wrap gap-2 mt-3">
                        <button
                            onClick={() => decide("agreed")}
                            disabled={Boolean(busy)}
                            className="cg-btn cg-btn-go flex-1 min-w-[160px]"
                        >
                            {busy === "agreed" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            They'll go ahead — carry on
                        </button>
                        <button
                            onClick={() => decide("declined")}
                            disabled={Boolean(busy)}
                            className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-hairline-strong hover:bg-sunken disabled:opacity-60 text-ink text-sm font-semibold rounded-lg"
                        >
                            {busy === "declined" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            Still no — take the visit charge
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

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

    // Two ways to find someone. The distance search misses a technician who
    // has never opened the app, because they have no coordinates to be near
    // anything; the area search finds them on what they typed at registration.
    const [mode, setMode] = useState("nearby");
    const [areaTerm, setAreaTerm] = useState(
        ticket.customerSnapshot?.area || ticket.customerSnapshot?.state || ""
    );

    const isReassign = ticket.status !== "Pending";

    const search = useCallback(async (params) => {
        setLoading(true);
        setSearchError("");
        try {
            const res = await api.get("/admin/tickets/" + ticket._id + "/nearby-technicians", { params });
            setTechnicians(res.data.data);
            setMeta(res.data.meta);
            // Show the admin the term the server settled on, so the box is
            // never blank and they can edit from it rather than guess.
            if (res.data.meta?.searchTerm) setAreaTerm(res.data.meta.searchTerm);
        } catch (err) {
            setTechnicians([]);
            setSearchError(getErrorMessage(err, "Search failed"));
        } finally {
            setLoading(false);
        }
    }, [ticket._id]);

    const searchNearby = (r) => { setMode("nearby"); setRadius(r); search({ radius: r }); };

    // An empty term is sent on purpose. The server works the city out from the
    // booking pin and answers with what it used, so opening this tab already
    // shows the customer's city instead of an empty box.
    const searchArea = (term) => {
        setMode("area");
        search(term.trim() ? { mode: "area", q: term.trim() } : { mode: "area" });
    };

    useEffect(() => {
        search({ radius });
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
                onError(getErrorMessage(err, "Could not assign this vendor"));
                search(mode === "area" ? { mode: "area", q: areaTerm } : { radius });
            }
            setAssigningId(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col">
                <div className="border-b border-hairline px-6 py-4 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-ink">{isReassign ? "Reassign to" : "Nearby vendors"}</h3>
                        <p className="text-xs text-ink-soft mt-0.5">for {ticket.serviceLabel}</p>
                    </div>
                    <button onClick={onClose} className="text-ink-faint hover:text-ink-soft">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-6 pt-3 flex gap-1 bg-sunken mx-6 mt-3 p-1 rounded-lg w-fit">
                    <button
                        onClick={() => searchNearby(radius)}
                        className={"px-3 py-1.5 text-xs font-semibold rounded-md transition-colors " + (mode === "nearby" ? "cg-tab-on" : "")}
                    >
                        Near the customer
                    </button>
                    <button
                        onClick={() => searchArea(areaTerm)}
                        className={"px-3 py-1.5 text-xs font-semibold rounded-md transition-colors " + (mode === "area" ? "cg-tab-on" : "")}
                    >
                        By city or area
                    </button>
                </div>

                {mode === "nearby" ? (
                    <div className="px-6 py-3 border-b border-hairline flex gap-2">
                        {RADIUS_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => searchNearby(opt.value)}
                                className={"px-3 py-1.5 text-xs font-medium rounded-full border transition-colors " + (radius === opt.value ? "bg-brand text-white border-green-700" : "bg-white text-ink-soft border-hairline hover:border-hairline-strong")}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                ) : (
                    <form
                        onSubmit={(e) => { e.preventDefault(); searchArea(areaTerm); }}
                        className="px-6 py-3 border-b border-hairline flex gap-2"
                    >
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                value={areaTerm}
                                onChange={(e) => setAreaTerm(e.target.value)}
                                placeholder="City, area or pincode"
                                className="cg-input pl-9 pr-3"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!areaTerm.trim() || loading}
                            className="cg-btn cg-btn-go py-2"
                        >
                            Search
                        </button>
                    </form>
                )}

                {meta && !loading && (
                    <div className="px-6 py-2 bg-sunken border-b border-hairline">
                        <p className="text-xs text-ink-soft">
                            {meta.mode === "area"
                                ? "Registered in “" + meta.searchTerm + "” · "
                                : "Within " + meta.searchedRadiusKm + " km · "}
                            {meta.availableNow} free now · {meta.found - meta.availableNow} busy or offline
                            {meta.noLocationSet > 0 && " · " + meta.noLocationSet + " haven't set their location"}
                        </p>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {loading ? (
                        <div className="py-10 flex justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-ink-faint" />
                        </div>
                    ) : searchError ? (
                        <p className="text-sm text-danger">{searchError}</p>
                    ) : technicians.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="font-semibold text-ink">No vendors found</p>
                            <p className="text-sm text-ink-soft mt-1">{mode === "nearby" ? "Try a larger radius, or search by city instead." : "Try a different city, area or pincode."}</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {technicians
                                .filter((t) => String(t._id) !== String(ticket.technician))
                                .map((tech) => (
                                    <div key={tech._id} className="flex items-center gap-3 p-3 border border-hairline rounded-xl">
                                        <div className="w-10 h-10 rounded-full bg-sunken flex items-center justify-center shrink-0 overflow-hidden">
                                            {tech.profileImage ? (
                                                <img src={tech.profileImage} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-sm font-bold text-ink-soft">
                                                    {tech.name?.[0]?.toUpperCase() || "?"}
                                                </span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-ink text-sm truncate">{tech.name}</p>
                                                {tech.liveStatus === "on_job" && (
                                                    <span className="text-[10px] font-bold text-info bg-info-tint px-1.5 py-0.5 rounded shrink-0">
                                                        ON JOB
                                                    </span>
                                                )}
                                                {tech.liveStatus === "offline" && (
                                                    <span className="text-[10px] font-bold text-ink-soft bg-sunken px-1.5 py-0.5 rounded shrink-0">
                                                        OFFLINE
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-ink-soft mt-0.5">
                                                <span className="flex items-center gap-0.5">
                                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                                    {tech.rating?.toFixed(1) || "5.0"}
                                                </span>
                                                {/* Distance is missing whenever the area search
                                                    turned up someone who has never shared a
                                                    position - saying so beats printing "0 km". */}
                                                <span className="flex items-center gap-0.5">
                                                    <Navigation className="w-3 h-3" />
                                                    {tech.distanceKm != null ? tech.distanceKm + " km" : tech.area || "no location"}
                                                </span>
                                                {/* How old that distance is. A technician who
                                                    last opened the panel days ago is not really
                                                    "0.02 km away" any more. */}
                                                {tech.distanceKm != null && tech.lastLocationAt && (
                                                    <span className={"flex items-center gap-0.5 " + (isStaleLocation(tech.lastLocationAt) ? "text-warn" : "")}>
                                                        <Clock className="w-3 h-3" /> {timeAgo(tech.lastLocationAt)}
                                                    </span>
                                                )}
                                                {tech.scheduledJobs > 0 && (
                                                    <span className="flex items-center gap-0.5 text-ink-soft">
                                                        <CalendarDays className="w-3 h-3" /> {tech.scheduledJobs}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => doAssign(tech, false)}
                                            disabled={assigningId !== null || tech.liveStatus === "offline"}
                                            className="cg-btn cg-btn-go shrink-0 px-3 py-2"
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
                        <h3 className="font-bold text-ink mb-1">{queuePrompt.name} is on another job</h3>
                        <p className="text-sm text-ink-soft mb-4">
                            Add this to their list? It starts on its own once their current job is paid and closed.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setQueuePrompt(null)}
                                className="flex-1 px-4 py-2.5 text-sm font-medium text-ink border border-hairline rounded-lg hover:bg-sunken"
                            >
                                Pick someone else
                            </button>
                            <button
                                onClick={() => { const t = queuePrompt; setQueuePrompt(null); doAssign(t, true); }}
                                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-ink hover:bg-black rounded-lg"
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
                    <h3 className="font-bold text-ink">Move to another day</h3>
                    <button onClick={onClose} className="text-ink-faint hover:text-ink-soft">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-sm text-ink-soft mb-4">
                    The customer gets a message with the new date and vendor.
                </p>

                <label className="cg-label block mb-2">New date</label>
                <input
                    type="date"
                    value={date}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setDate(e.target.value)}
                    className="cg-input mb-3"
                />

                <label className="cg-label block mb-2">Time slot</label>
                <select
                    value={slotWindow}
                    onChange={(e) => setSlotWindow(e.target.value)}
                    className="cg-input mb-3"
                >
                    <option value="">Any time</option>
                    <option value="9 AM - 12 PM">9 AM - 12 PM</option>
                    <option value="12 PM - 3 PM">12 PM - 3 PM</option>
                    <option value="3 PM - 6 PM">3 PM - 6 PM</option>
                    <option value="6 PM - 9 PM">6 PM - 9 PM</option>
                </select>

                <label className="cg-label block mb-2">Vendor</label>
                {loadingTechs ? (
                    <div className="py-3 flex justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-ink-faint" />
                    </div>
                ) : (
                    <>
                        <select
                            value={technicianId}
                            onChange={(e) => setTechnicianId(e.target.value)}
                            className="cg-input mb-1"
                        >
                            <option value="">Choose a vendor</option>
                            {technicians.map((t) => (
                                <option key={t._id} value={t._id}>
                                    {t.name} — {t.area}
                                    {t.liveStatus === "on_job" ? " (on a job today)" : ""}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-ink-faint mb-3">
                            Busy vendors are fine here — this job waits for its date.
                        </p>
                    </>
                )}

                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason (optional)"
                    rows={2}
                    className="cg-input"
                />

                <div className="flex gap-2 mt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-ink border border-hairline rounded-lg hover:bg-sunken"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!date || !technicianId || submitting}
                        className="cg-btn cg-btn-go flex-1"
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
                <h3 className="font-bold text-ink mb-1">Cancel this ticket?</h3>
                <p className="text-sm text-ink-soft mb-4">The customer will be notified.</p>

                <CustomDropdown
                    value={reason}
                    onChange={(val) => setReason(val)}
                    options={[
                        { value: "Customer cancelled", label: "Customer cancelled" },
                        { value: "Customer not responding", label: "Customer not responding" },
                        { value: "Not serviceable area", label: "Not serviceable area" },
                        { value: "Duplicate ticket", label: "Duplicate ticket" },
                        { value: "Vendor unavailable", label: "Vendor unavailable" },
                        { value: "Other", label: "Other" }
                    ]}
                    placeholder="Select a reason..."
                    className="mb-4"
                />

                <div className="flex gap-2 mt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-ink border border-hairline rounded-lg hover:bg-sunken"
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