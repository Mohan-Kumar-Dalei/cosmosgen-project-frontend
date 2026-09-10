import { useEffect, useState, useCallback } from "react";
import AdminLayout from "./AdminLayout";
import { useAdminAuth } from "../Admin/adminAuthContext";
import { api, getErrorMessage } from "../../services/api";
import { adminSocket } from "../../services/socket";
import MapModal from "../../ui/MapModal";
import NotifyBadge from "../../ui/NotifyBadge";
import { useAdminData } from "./AdminDataContext";
import {
    Loader2, AlertCircle, Search, MapPin, Phone,
    X, Banknote, Wrench, CalendarClock, Ban, CheckCircle2,
    Clock, ShieldOff, UserCheck, RefreshCw, BadgeCheck, ChevronRight, MessageCircle,
    Briefcase, Star,
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
    available: "bg-brand-tint text-brand",
    on_job: "bg-info-tint text-info",
    offline: "bg-sunken text-ink-soft",
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
    // pendingCount used to come off this page's own list response, so the
    // sidebar knew nothing about an application and the tab only knew once
    // the page had loaded. It is one server figure now, like every other
    // badge in the panel.
    const { counts, globalRefreshTrigger } = useAdminData();
    const pendingCount = counts.techniciansPending || 0;
    const [view, setView] = useState("roster");
    const [status, setStatus] = useState("");
    const [search, setSearch] = useState("");
    const [technicians, setTechnicians] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [flash, setFlash] = useState("");
    const [selectedId, setSelectedId] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async (viewKey, statusFilter, searchTerm) => {
        try {
            const params = { search: searchTerm || undefined };
            if (viewKey === "roster") params.status = statusFilter || undefined;
            else params.approval = viewKey;

            const res = await api.get("/admin/technicians", { params });
            setTechnicians(res.data.data);
            setError("");
        } catch (err) {
            setError(getErrorMessage(err, "Could not load vendors"));
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
        const timer = setTimeout(() => load(view, status, search), search ? 400 : 0);
        return () => clearTimeout(timer);
    }, [view, status, search, load, globalRefreshTrigger]);

    useEffect(() => {
        
        const onTechStatus = () => load(view, status, search);
        adminSocket.on("tech:status", onTechStatus);
        
        return () => {
            adminSocket.off("tech:status", onTechStatus);
        };
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
                    <h1 className="cg-h1">Vendors</h1>
                    <p className="cg-sub mt-1">
                        Review applications and see who's working right now.
                    </p>
                </div>
                <button
                    onClick={() => { setRefreshing(true); load(view, status, search); }}
                    disabled={refreshing}
                    className="cg-icon-btn shrink-0"
                >
                    <RefreshCw className={"w-4 h-4 " + (refreshing ? "animate-spin" : "")} />
                </button>
            </div>

            {/* New applications are easy to miss, so they get a banner not just a tab */}
            {pendingCount > 0 && view !== "pending" && (
                <button
                    onClick={() => setView("pending")}
                    className="w-full mb-5 p-4 bg-warn-tint border border-hairline rounded-xl flex items-center justify-between gap-3 hover:bg-warn-tint transition-colors text-left"
                >
                    <div className="flex items-center gap-2.5">
                        <Clock className="w-5 h-5 text-warn shrink-0" />
                        <div>
                            <p className="font-semibold text-warn text-sm">
                                {pendingCount} application{pendingCount > 1 ? "s" : ""} waiting for review
                            </p>
                            <p className="text-xs text-warn">They can't sign in until you approve them.</p>
                        </div>
                    </div>
                    <span className="text-sm font-semibold text-warn shrink-0">Review</span>
                </button>
            )}

            {flash && (
                <div className="mb-4 p-3 bg-brand-tint border border-hairline rounded-lg text-sm text-brand flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    {flash}
                </div>
            )}

            <div className="cg-tabbar cg-tabs mb-5">
                {VIEW_TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setView(t.key)}
                        className={"cg-tab " + (view === t.key ? "cg-tab-on" : "")}
                    >
                        {t.label}
                        {t.key === "pending" && <NotifyBadge count={pendingCount} />}
                    </button>
                ))}
            </div>

            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, phone or area"
                    className="cg-input pl-9 pr-3"
                />
            </div>

            {view === "roster" && (
                <div className="cg-tabs mb-6">
                    {STATUS_TABS.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setStatus(t.key)}
                            className={"cg-tab " + (status === t.key ? "cg-tab-on" : "")}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            )}

            {error && (
                <div className="mb-4 p-4 bg-danger-tint border border-hairline rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold text-danger">{error}</p>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="cg-card p-4 h-36 animate-pulse" />
                    ))}
                </div>
            ) : technicians.length === 0 ? (
                <div className="cg-card p-10 text-center">
                    <Wrench className="w-8 h-8 text-ink-faint mx-auto mb-2" />
                    <p className="font-semibold text-ink">
                        {view === "pending" ? "No applications waiting"
                            : view === "blocked" ? "No blocked accounts"
                            : view === "rejected" ? "No rejected applications"
                            : "No vendors found"}
                    </p>
                    <p className="text-sm text-ink-soft mt-1">
                        {view === "pending"
                            ? "New sign-ups appear here for review."
                            : "Try a different filter or search term."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-8">
                    {technicians.map((t) => (
                        <VendorCard key={t._id} t={t} view={view} onOpen={() => setSelectedId(t._id)} />
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
/* ONE VENDOR                                                           */
/* ================================================================== */

const STATUS_TAG = {
    pending: { label: "New application", cls: "bg-warn-tint text-warn" },
    blocked: { label: "Blocked", cls: "bg-danger-tint text-danger" },
    rejected: { label: "Rejected", cls: "bg-sunken text-ink-soft" },
};

const LIVE_TAG = {
    available: "bg-brand-tint text-brand",
    on_job: "bg-accent-tint text-accent",
    offline: "bg-sunken text-ink-soft",
};

const RoundAction = ({ href, label, children }) => (
    <a
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
        onClick={(e) => e.stopPropagation()}
        aria-label={label}
        title={label}
        className="w-11 h-11 rounded-full border border-hairline-strong bg-surface text-ink-soft flex items-center justify-center shrink-0 transition-all hover:bg-accent hover:border-accent hover:text-white hover:scale-105"
    >
        {children}
    </a>
);

/**
 * A vendor.
 *
 * One card at every width, in a grid rather than stacked one per row: a
 * roster of forty full-width rows is a page nobody scrolls to the bottom of.
 *
 * The three facts along the middle - work done, how it went, where they are -
 * carry icons and a larger figure because they are what the office is reading
 * the card for. Everything else on it is identity.
 */
const VendorCard = ({ t, view, onOpen }) => {
    const onRoster = view === "roster";
    const tag = STATUS_TAG[view];
    const action = view === "pending" ? "Review" : "Open";
    const waNumber = String(t.phone || "").replace(/\D/g, "");

    return (
        // The spacer is what the portrait hangs into. Without it the row above
        // clips the top of every face in the grid.
        <div className="pt-7">
            <div
                role="button"
                tabIndex={0}
                onClick={onOpen}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
                className="cg-vcard group cursor-pointer px-5 pb-5 pt-5"
            >
                <div className="relative z-10 flex items-start gap-3.5">
                    <div className="-mt-[52px] shrink-0">
                        <div className="cg-vcard-face w-[72px] h-[72px] rounded-full overflow-hidden flex items-center justify-center bg-accent-tint">
                            {t.profileImage ? (
                                <img src={t.profileImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="font-display text-2xl font-semibold text-accent">
                                    {t.name?.[0]?.toUpperCase()}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className="font-display text-lg font-semibold tracking-tight text-ink truncate flex items-center gap-1.5">
                            {t.name}
                            {onRoster && <BadgeCheck className="w-4 h-4 text-accent shrink-0" />}
                        </p>

                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {t.skills?.[0] && (
                                <span className="cg-pill bg-accent-tint text-accent font-medium normal-case">
                                    {t.skills[0]}
                                </span>
                            )}
                            <span className={"cg-pill font-medium normal-case " + (onRoster ? LIVE_TAG[t.liveStatus] : tag?.cls)}>
                                {onRoster ? LIVE_LABELS[t.liveStatus] : tag?.label}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 flex items-center gap-x-5 gap-y-2 flex-wrap mt-5">
                    {onRoster ? (
                        <>
                            <span className="cg-fact">
                                <Briefcase className="w-4 h-4 text-accent shrink-0" />
                                <strong>{t.completedJobs || 0}</strong> jobs
                            </span>
                            <span className="cg-fact">
                                <Star className="w-4 h-4 text-warn shrink-0 fill-current" />
                                <strong>{t.rating?.toFixed(1) || "5.0"}</strong> rating
                            </span>
                        </>
                    ) : (
                        <span className="cg-fact">
                            <Clock className="w-4 h-4 text-ink-faint shrink-0" />
                            {view === "pending" ? "Applied " + timeAgo(t.createdAt) : "Not on the roster"}
                        </span>
                    )}
                </div>

                <p className="relative z-10 cg-fact mt-2 w-full">
                    <MapPin className="w-4 h-4 text-brand shrink-0" />
                    <span className="truncate">{t.area || "No area set"}</span>
                </p>

                <div className="relative z-10 flex items-center gap-2.5 mt-5">
                    <span className="cg-btn cg-btn-primary rounded-full flex-1 py-3 transition-transform group-hover:scale-[1.01]">
                        {action}
                        <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </span>

                    {/* The office rings and messages vendors all day. Stopped
                        from bubbling, or dialling would open the panel too. */}
                    {t.phone && (
                        <>
                            <RoundAction href={"tel:" + t.phone} label={"Call " + t.name}>
                                <Phone className="w-4 h-4" />
                            </RoundAction>
                            <RoundAction href={"https://wa.me/91" + waNumber} label={"WhatsApp " + t.name}>
                                <MessageCircle className="w-4 h-4" />
                            </RoundAction>
                        </>
                    )}
                </div>

                {onRoster && !t.hasLocation && (
                    <p className="relative z-10 text-[11px] text-warn mt-3 font-medium">
                        No location set, so they will not show in nearby search
                    </p>
                )}
            </div>
        </div>
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
    const [showMap, setShowMap] = useState(false);

    const canBlock = hasPermission("BLOCK_TECHNICIAN");

    useEffect(() => {
        const load = async () => {
            try {
                const res = await api.get("/admin/technicians/" + technicianId);
                setTech(res.data.data);
            } catch (err) {
                setError(getErrorMessage(err, "Could not load this vendor"));
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
                <div className="sticky top-0 bg-white border-b border-hairline px-5 py-4 flex items-center justify-between z-10">
                    <h2 className="font-bold text-ink">
                        {isPending ? "Review application" : "Vendor"}
                    </h2>
                    <button onClick={onClose} className="text-ink-faint hover:text-ink-soft">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5">
                    {loading ? (
                        <div className="py-10 flex justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-ink-faint" />
                        </div>
                    ) : error && !tech ? (
                        <p className="text-sm text-danger">{error}</p>
                    ) : tech ? (
                        <>
                            {isBlocked && (
                                <div className="mb-4 p-3 bg-danger-tint border border-hairline rounded-xl flex items-start gap-2">
                                    <ShieldOff className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-red-900">Account blocked</p>
                                        {tech.blacklistReason && (
                                            <p className="text-xs text-danger mt-0.5">{tech.blacklistReason}</p>
                                        )}
                                        <p className="text-xs text-danger mt-1">
                                            This phone number can't sign in or register again.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {isRejected && !isBlocked && (
                                <div className="mb-4 p-3 bg-sunken border border-hairline rounded-xl">
                                    <p className="text-sm font-semibold text-ink">Application rejected</p>
                                    {tech.rejectionReason && (
                                        <p className="text-xs text-ink-soft mt-0.5">{tech.rejectionReason}</p>
                                    )}
                                </div>
                            )}

                            {isPending && (
                                <div className="mb-4 p-3 bg-warn-tint border border-hairline rounded-xl flex items-start gap-2">
                                    <Clock className="w-4 h-4 text-warn shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-warn">Waiting for approval</p>
                                        <p className="text-xs text-warn mt-0.5">
                                            Check their details and skills before letting them in.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-start gap-4 mb-5">
                                <div className="w-16 h-16 rounded-full bg-sunken flex items-center justify-center shrink-0 overflow-hidden">
                                    {tech.profileImage ? (
                                        <img src={tech.profileImage} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xl font-bold text-ink-soft">{tech.name?.[0]?.toUpperCase()}</span>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-bold text-ink">{tech.name}</h3>
                                        {!isPending && !isBlocked && !isRejected && (
                                            <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full " + LIVE_STYLES[tech.liveStatus]}>
                                                {LIVE_LABELS[tech.liveStatus]}
                                            </span>
                                        )}
                                    </div>
                                    <a href={"tel:" + tech.phone} className="text-sm text-ink-soft flex items-center gap-1 mt-1 hover:text-brand">
                                        <Phone className="w-3.5 h-3.5" /> {tech.phone}
                                    </a>
                                    <p className="text-xs text-ink-soft mt-0.5">
                                        {tech.area}, {tech.state} — {tech.pincode}
                                    </p>
                                    <p className="text-xs text-ink-faint mt-0.5">
                                        Signed up {new Date(tech.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                    </p>
                                </div>
                            </div>

                            {tech.skills?.length > 0 && (
                                <div className="mb-5">
                                    <p className="text-xs font-bold text-ink-faint uppercase mb-2">Services they handle</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {tech.skills.map((s, i) => (
                                            <span key={i} className="text-xs bg-sunken text-ink px-2.5 py-1 rounded-full">{s}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-2 mb-5">
                                <div className="bg-sunken rounded-xl p-3 text-center">
                                    <p className="text-lg font-bold text-ink">{tech.completedJobs}</p>
                                    <p className="text-[10px] text-ink-soft">Jobs done</p>
                                </div>
                                <div className="bg-sunken rounded-xl p-3 text-center">
                                    <p className="text-lg font-bold text-ink">{tech.rating?.toFixed(1) || "5.0"}</p>
                                    <p className="text-[10px] text-ink-soft">Rating</p>
                                </div>
                                <div className="bg-sunken rounded-xl p-3 text-center">
                                    <p className="text-sm font-bold text-ink">{tech.hasVehicle ? "Yes" : "No"}</p>
                                    <p className="text-[10px] text-ink-soft">Own vehicle</p>
                                </div>
                            </div>

                            {tech.financials && (
                                <div className="mb-5 border border-hairline rounded-xl overflow-hidden">
                                    <div className="bg-sunken px-4 py-2 border-b border-hairline flex justify-between items-center">
                                        <p className="text-xs font-bold text-ink uppercase">Financials</p>
                                        <span className="text-[10px] font-bold bg-white border border-hairline text-ink-soft px-2 py-0.5 rounded-full">
                                            {tech.financials.commissionRate}% Commission
                                        </span>
                                    </div>
                                    <div className="p-4 grid grid-cols-2 gap-4 bg-white">
                                        <div>
                                            <p className="text-xs text-ink-soft mb-0.5">Total earned by tech</p>
                                            <p className="text-lg font-bold text-brand">Rs {tech.financials.totalEarned}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-ink-soft mb-0.5">Company profit from tech</p>
                                            <p className="text-lg font-bold text-ink">Rs {tech.financials.companyProfit}</p>
                                        </div>
                                        <div className="col-span-2 pt-3 border-t border-hairline flex items-center justify-between">
                                            <div>
                                                <p className="text-xs text-ink-soft mb-0.5">Current Wallet Balance</p>
                                                <p className="text-sm font-bold text-ink">Rs {tech.financials.walletBalance}</p>
                                            </div>
                                            <span className={"text-xs font-bold px-2 py-1 rounded-md " + (
                                                tech.financials.walletBalance === "0.00" ? "bg-sunken text-ink-soft" :
                                                tech.financials.walletDirection === "technician_owes" ? "bg-warn-tint text-warn" : "bg-info-tint text-info"
                                            )}>
                                                {tech.financials.walletBalance === "0.00" ? "Settled" : 
                                                 tech.financials.walletDirection === "technician_owes" ? "To collect from them" : "To pay them"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {tech.cashHeld?.count > 0 && (
                                <div className="bg-warn-tint border border-hairline rounded-xl p-4 mb-5 flex items-center gap-2">
                                    <Banknote className="w-4 h-4 text-warn shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-warn">
                                            Rs {tech.cashHeld.amountDisplay} not deposited
                                        </p>
                                        <p className="text-xs text-warn">{tech.cashHeld.count} cash jobs</p>
                                    </div>
                                </div>
                            )}

                            {/* Bank Details */}
                            {tech.bankDetails?.ifsc ? (
                                <div className="mb-5 border border-hairline rounded-xl overflow-hidden">
                                    <div className="bg-sunken px-4 py-2 border-b border-hairline flex items-center gap-2">
                                        <Banknote className="w-3.5 h-3.5 text-ink-soft" />
                                        <p className="text-xs font-bold text-ink uppercase">Bank Details</p>
                                    </div>
                                    <div className="p-4 space-y-3 bg-white">
                                        <BankRow label="Account holder" value={tech.bankDetails.accountHolderName} />
                                        <BankRow label="Account number" value={tech.bankDetails.accountNumber || tech.bankDetails.accountLast4} mono />
                                        <BankRow label="IFSC" value={tech.bankDetails.ifsc} mono />
                                        {tech.bankDetails.bankName && (
                                            <div className="pt-2 border-t border-hairline">
                                                <p className="text-xs text-ink-soft mb-0.5">Bank & Branch</p>
                                                <p className="text-sm font-semibold text-ink">{tech.bankDetails.bankName}</p>
                                                {tech.bankDetails.branch && (
                                                    <p className="text-xs text-ink-soft">{tech.bankDetails.branch}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-5 p-3 bg-warn-tint border border-hairline rounded-xl flex items-center gap-2">
                                    <Banknote className="w-4 h-4 text-warn shrink-0" />
                                    <p className="text-xs text-warn font-medium">No bank details provided</p>
                                </div>
                            )}

                            {tech.activeTicket && (
                                <div className="mb-5">
                                    <p className="text-xs font-bold text-ink-faint uppercase mb-2">Working on now</p>
                                    <div className="bg-info-tint border border-hairline rounded-xl p-4">
                                        <p className="font-semibold text-ink text-sm">{tech.activeTicket.customerSnapshot?.name}</p>
                                        <p className="text-xs text-ink-soft mt-0.5">
                                            {tech.activeTicket.serviceLabel} · {tech.activeTicket.ticketNumber}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {tech.scheduledTickets?.length > 0 && (
                                <div className="mb-5">
                                    <p className="text-xs font-bold text-ink-faint uppercase mb-2">
                                        Scheduled next ({tech.scheduledTickets.length})
                                    </p>
                                    <div className="space-y-2">
                                        {tech.scheduledTickets.map((t) => (
                                            <div key={t._id} className="border border-hairline rounded-xl p-3 flex items-center justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-ink text-sm truncate">{t.customerSnapshot?.name}</p>
                                                    <p className="text-xs text-ink-soft">{t.serviceLabel}</p>
                                                </div>
                                                {t.scheduling?.scheduledFor && (
                                                    <span className="text-xs text-ink-soft flex items-center gap-1 shrink-0">
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
                                <div className="mb-4 p-3 bg-danger-tint border border-hairline rounded-lg text-sm text-danger">
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
                                            className="cg-btn cg-btn-go flex-1 min-w-[140px]"
                                        >
                                            {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => setDialog("reject")}
                                            disabled={working}
                                            className="px-4 py-2.5 text-sm font-medium text-danger border border-hairline rounded-lg hover:bg-danger-tint disabled:opacity-50"
                                        >
                                            Reject
                                        </button>
                                    </>
                                )}

                                {isBlocked && canBlock && (
                                    <button
                                        onClick={handleUnblock}
                                        disabled={working}
                                        className="flex-1 flex items-center justify-center gap-2 bg-ink hover:bg-black disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm"
                                    >
                                        {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                                        Unblock
                                    </button>
                                )}

                                {isRejected && !isBlocked && (
                                    <button
                                        onClick={handleApprove}
                                        disabled={working}
                                        className="cg-btn cg-btn-go flex-1"
                                    >
                                        {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                                        Approve after all
                                    </button>
                                )}

                                {!isPending && !isBlocked && tech.hasLocation && (
                                    <button
                                        onClick={() => setShowMap(true)}
                                        className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm"
                                    >
                                        <MapPin className="w-4 h-4" />
                                        {tech.liveStatus === "offline" ? "Last location" : "Where they are"}
                                    </button>
                                )}

                                {!isBlocked && !isPending && canBlock && (
                                    <button
                                        onClick={() => setDialog("block")}
                                        disabled={working}
                                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-danger border border-hairline rounded-lg hover:bg-danger-tint disabled:opacity-50"
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

            {/* Coordinates only say where; the office needs the area name and
                pincode, which are looked up inside the modal. Offline reads
                differently from online - one is where they are, the other is
                where they were when they stopped sharing. */}
            <MapModal
                open={showMap}
                onClose={() => setShowMap(false)}
                title={tech?.name || "Vendor"}
                subtitle={
                    tech?.liveStatus === "offline"
                        ? "Offline" + (tech?.lastLocationAt ? ", last seen " + timeAgo(tech.lastLocationAt) : "")
                        : (tech?.liveStatus === "on_job" ? "On a job" : "Free") +
                          (tech?.lastLocationAt ? ", updated " + timeAgo(tech.lastLocationAt) : "")
                }
                lat={tech?.location?.coordinates?.[1]}
                lon={tech?.location?.coordinates?.[0]}
                markerColor={tech?.liveStatus === "offline" ? "#6b7280" : "#15803d"}
                note={
                    tech?.liveStatus === "offline"
                        ? "This is the last position they shared before going offline."
                        : "Updated while they are online and moving."
                }
            />
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
                <h3 className="font-bold text-ink mb-1">{title}</h3>
                <p className="text-sm text-ink-soft mb-4">{body}</p>

                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={placeholder}
                    rows={3}
                    autoFocus
                    className="w-full px-3.5 py-2.5 border border-hairline-strong rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
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

/* ================================================================== */
/* BANK ROW with Copy                                                   */
/* ================================================================== */
const BankRow = ({ label, value, mono }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (!value) return;
        navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="flex justify-between items-center gap-2">
            <span className="text-xs text-ink-soft shrink-0">{label}</span>
            <div className="flex items-center gap-1.5 min-w-0">
                <span className={"text-sm font-semibold text-ink truncate " + (mono ? "font-mono" : "")}>
                    {value || "—"}
                </span>
                {value && (
                    <button
                        onClick={handleCopy}
                        title="Copy"
                        className="shrink-0 text-ink-faint hover:text-brand transition-colors"
                    >
                        {copied
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-brand" />
                            : <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                        }
                    </button>
                )}
            </div>
        </div>
    );
};

export default AdminTechnicians;