import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, getErrorMessage } from "../../services/api";
import { techSocket, connectTechSocket, disconnectTechSocket } from "../../services/socket";
import { notifyNew, notifyDone, notifyInfo } from "../../services/notify";
import ActiveJobCard from "./ActiveJobCard";
import CustomDropdown from "../../ui/CustomDropdown";
import {
    Hexagon, MapPin, Wrench, LogOut, User, Layers, Banknote,
    Briefcase, History as HistoryIcon, CalendarDays,
    Star, CheckCircle2, Loader2, AlertCircle, PlayCircle, Wallet,
    RefreshCw, ShieldCheck, Navigation, Phone, Clock, TrendingUp, CreditCard
} from "lucide-react";

// Five tabs is the ceiling for a phone bottom bar - past that the targets
// get too narrow to hit reliably
const TABS = [
    { key: "active", label: "My Job", icon: Briefcase },
    { key: "next", label: "Next", icon: Layers },
    { key: "schedule", label: "Schedule", icon: CalendarDays },
    { key: "wallet", label: "Wallet", icon: Wallet },
    { key: "history", label: "History", icon: HistoryIcon },
];

const TAB_SUBTITLES = {
    active: "What you're working on right now",
    next: "Jobs waiting behind your current one",
    schedule: "Booked for a future date",
    wallet: "Your balance and earnings",
    history: "Everything you've completed",
};

const buildDirectionsUrl = (lat, lon) => {
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) return null;
    return "https://www.google.com/maps/dir/?api=1&destination=" + lat + "," + lon + "&travelmode=driving";
};

const TechnicianPanel = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState("active");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [togglingStatus, setTogglingStatus] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const watchIdRef = useRef(null);

    const loadBootstrap = useCallback(async () => {
        try {
            const res = await api.get("/technician/bootstrap");
            setData(res.data.data);
            setRefreshTrigger(Date.now());
            setError("");
        } catch (err) {
            setError(getErrorMessage(err, "Could not load your dashboard"));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadBootstrap();
        // Safety net in case a socket event is missed
        const interval = setInterval(loadBootstrap, 45000);
        return () => clearInterval(interval);
    }, [loadBootstrap]);

    useEffect(() => {
        if (data?.profile?._id) {
            const currentPath = window.location.pathname;
            if (currentPath.startsWith("/technician/admin") && !currentPath.includes(data.profile._id)) {
                const suffix = currentPath.replace("/technician/admin", "");
                navigate(`/technician/admin/${data.profile._id}${suffix}`, { replace: true });
            }
        }
    }, [data, navigate]);

    useEffect(() => {
        connectTechSocket();

        const onAssigned = (p) => {
            loadBootstrap();
            setTab("active");
            notifyNew("New job assigned", (p?.customer?.name || "") + " - " + (p?.customer?.area || ""));
        };
        const onQueued = (p) => {
            loadBootstrap();
            notifyInfo("Job added to your list", (p?.customerName || "") + " - " + (p?.area || ""));
        };
        const onCashVerified = () => {
            loadBootstrap();
            notifyDone("Cash deposit confirmed", "The office has counted it in");
        };
        const onClosed = () => {
            loadBootstrap();
            notifyDone("Payment received", "That job is closed");
        };
        const onRemoved = () => {
            loadBootstrap();
            notifyInfo("A job was removed", "The office reassigned it");
        };

        techSocket.on("ticket:assigned", onAssigned);
        techSocket.on("ticket:queued", onQueued);
        techSocket.on("ticket:removed", onRemoved);
        techSocket.on("ticket:closed", onClosed);
        techSocket.on("cash:verified", onCashVerified);

        return () => {
            techSocket.off("ticket:assigned", onAssigned);
            techSocket.off("ticket:queued", onQueued);
            techSocket.off("ticket:removed", onRemoved);
            techSocket.off("ticket:closed", onClosed);
            techSocket.off("cash:verified", onCashVerified);
            disconnectTechSocket();
        };
    }, [loadBootstrap]);

    // Share location while online. The socket handler throttles DB writes to
    // one every 10 seconds, so leaving watchPosition running is fine.
    useEffect(() => {
        const isOnline = data?.profile?.isAvailable || Boolean(data?.profile?.activeTicket);

        if (isOnline && navigator.geolocation && !watchIdRef.current) {
            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    techSocket.emit("tech:location", {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                    });
                },
                (err) => console.warn("Location watch error:", err.message),
                { enableHighAccuracy: true, maximumAge: 15000 }
            );
        }

        if (!isOnline && watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }

        return () => {
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };
    }, [data?.profile?.isAvailable, data?.profile?.activeTicket]);

    const handleToggleStatus = async () => {
        if (!data?.profile) return;
        setTogglingStatus(true);
        try {
            const res = await api.put("/technician/status", { isAvailable: !data.profile.isAvailable });
            setData((prev) => ({ ...prev, profile: res.data.data }));
        } catch (err) {
            setError(getErrorMessage(err, "Could not update status"));
        } finally {
            setTogglingStatus(false);
        }
    };

    const handleLogout = async () => {
        try {
            await api.post("/technician/logout");
        } catch {
            // ignore
        }
        navigate("/technician/admin/login");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="bg-white rounded-2xl shadow p-8 max-w-sm text-center">
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
                    <p className="font-semibold text-gray-900">{error || "Something went wrong"}</p>
                </div>
            </div>
        );
    }

    const { profile, activeTicket, nextJobs = [], scheduledJobs = [], history, pendingCash } = data;
    const onJob = Boolean(profile.activeTicket);
    const hasPendingCash = pendingCash?.count > 0;
    const hasLocation = Boolean(profile.location?.coordinates?.length);

    const badgeFor = (key) =>
        key === "next" ? nextJobs.length
            : key === "schedule" ? scheduledJobs.length
                : key === "wallet" && hasPendingCash ? pendingCash.count
                    : 0;

    return (
        <div className="min-h-screen bg-gray-50 lg:flex">

            {/* DESKTOP SIDEBAR - a bottom bar on a large screen wastes the
                space and puts navigation nowhere near the eye */}
            <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:h-screen lg:sticky lg:top-0 bg-slate-900 text-white">
                <div className="p-5 border-b border-white/10 flex items-center gap-2.5">
                    <img 
                        src="https://ik.imagekit.io/ny6yinyut/cosmosgenLogo/cosmosgen-logo.png?updatedAt=1788413075959" 
                        alt="Cosmosgen Logo" 
                        className="h-8" 
                    />
                    <div>
                        <p className="font-bold text-sm">Cosmosgen</p>
                        <p className="text-[11px] text-white/50 tracking-wider uppercase">Technician</p>
                    </div>
                </div>

                <div className="p-4 border-b border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                            {profile.profileImage ? (
                                <img src={profile.profileImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-base font-bold">{profile.name?.[0]?.toUpperCase()}</span>
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{profile.name}</p>
                            <p className="text-[11px] text-white/50 truncate flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5 shrink-0" />
                                {profile.area || "No location"}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleToggleStatus}
                        disabled={togglingStatus || onJob}
                        title={onJob ? "You can't go offline while on a job" : ""}
                        className={"w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-70 disabled:cursor-not-allowed " + (onJob ? "bg-blue-500/20 text-blue-300" : profile.isAvailable ? "bg-green-500/20 text-green-300" : "bg-white/10 text-white/50 hover:bg-white/15")}
                    >
                        <span className={"w-2 h-2 rounded-full " + (onJob ? "bg-blue-400" : profile.isAvailable ? "bg-green-400" : "bg-white/30")} />
                        {onJob ? "ON JOB" : profile.isAvailable ? "ONLINE" : "OFFLINE"}
                    </button>
                </div>

                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {TABS.map((t) => {
                        const isActive = tab === t.key;
                        const badge = badgeFor(t.key);

                        return (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={"w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors " + (isActive ? "bg-green-600 text-white" : "text-white/70 hover:bg-white/10 hover:text-white")}
                            >
                                <t.icon className="w-4 h-4 shrink-0" />
                                <span className="flex-1 text-left">{t.label}</span>
                                {badge > 0 && (
                                    <span className={"text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center " + (t.key === "wallet" ? "bg-amber-500 text-slate-900" : "bg-white/20 text-white")}>
                                        {badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                <div className="p-3 border-t border-white/10 space-y-1">
                    <Link
                        to="/technician/admin/profile"
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
                    >
                        <User className="w-4 h-4" /> Profile
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-300 hover:bg-red-500/15"
                    >
                        <LogOut className="w-4 h-4" /> Sign out
                    </button>
                </div>
            </aside>

            <div className="flex-1 min-w-0">

                {/* MOBILE HEADER */}
                <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <img 
                            src="https://ik.imagekit.io/ny6yinyut/cosmosgenLogo/cosmosgen-logo.png?updatedAt=1788413075959" 
                            alt="Cosmosgen" 
                            className="h-6 shrink-0" 
                        />
                        <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-sm leading-tight truncate">
                                {profile.name?.split(" ")[0]}
                            </p>
                            <p className="text-[11px] text-gray-500 flex items-center gap-0.5 truncate">
                                <MapPin className="w-2.5 h-2.5 shrink-0" /> {profile.area || "No location"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => { setRefreshing(true); loadBootstrap(); }}
                            disabled={refreshing}
                            className="p-2 text-gray-400 active:text-gray-700 disabled:opacity-50"
                        >
                            <RefreshCw className={"w-4 h-4 " + (refreshing ? "animate-spin" : "")} />
                        </button>

                        <button
                            onClick={handleToggleStatus}
                            disabled={togglingStatus || onJob}
                            className={"flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold disabled:opacity-70 " + (onJob ? "bg-blue-100 text-blue-700" : profile.isAvailable ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}
                        >
                            <span className={"w-1.5 h-1.5 rounded-full " + (onJob ? "bg-blue-500" : profile.isAvailable ? "bg-green-500" : "bg-gray-400")} />
                            {onJob ? "ON JOB" : profile.isAvailable ? "ONLINE" : "OFFLINE"}
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setMenuOpen(!menuOpen)}
                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden"
                            >
                                {profile.profileImage ? (
                                    <img src={profile.profileImage} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xs font-bold text-gray-600">{profile.name?.[0]?.toUpperCase()}</span>
                                )}
                            </button>
                            {menuOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                                    <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                                        <Link
                                            to="/technician/admin/profile"
                                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 active:bg-gray-50"
                                        >
                                            <User className="w-4 h-4" /> Profile
                                        </Link>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 active:bg-red-50"
                                        >
                                            <LogOut className="w-4 h-4" /> Sign out
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* DESKTOP PAGE HEADER */}
                <div className="hidden lg:block px-8 pt-8 pb-1">
                    <div className="max-w-9xl mx-auto flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                                {TABS.find((t) => t.key === tab)?.label}
                            </h1>
                            <p className="text-gray-500 text-sm mt-0.5">{TAB_SUBTITLES[tab]}</p>
                        </div>
                        <button
                            onClick={() => { setRefreshing(true); loadBootstrap(); }}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                            <RefreshCw className={"w-4 h-4 " + (refreshing ? "animate-spin" : "")} />
                            Refresh
                        </button>
                    </div>
                </div>
                {/* Centred on mobile, left-aligned beside the sidebar on desktop.
                    mx-auto and lg:mx-0 have equal specificity and the winner
                    depends on source order, so the desktop side sets ml and mr
                    separately instead. pb-24 clears the mobile bottom bar. */}
                <div className="w-full max-w-3xl lg:max-w-6xl mx-auto px-4 lg:px-8 pt-4 pb-24 lg:pb-10">
                    {!hasLocation && (
                        <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
                            <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-amber-900">Location not set</p>
                                <p className="text-xs text-amber-700 mt-0.5">
                                    Go online and allow location - jobs near you can't reach you until then.
                                </p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {tab === "active" && (
                        <>
                            <ProfileStrip profile={profile} />
                            <ActiveJobCard ticket={activeTicket} onUpdate={loadBootstrap} />
                        </>
                    )}

                    {tab === "next" && <NextWorkTab tickets={nextJobs} onUpdate={loadBootstrap} />}

                    {tab === "schedule" && (
                        <ScheduleTab
                            tickets={scheduledJobs}
                            canStartNow={!profile.activeTicket}
                            onStarted={() => { loadBootstrap(); setTab("active"); }}
                        />
                    )}

                    {tab === "wallet" && <WalletTab pendingCash={pendingCash} refreshTrigger={refreshTrigger} />}

                    {tab === "history" && <HistoryTab history={history} />}
                </div>
            </div>

            {/* MOBILE BOTTOM BAR - where a thumb naturally sits */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 pb-[env(safe-area-inset-bottom)]">
                <div className="flex">
                    {TABS.map((t) => {
                        const isActive = tab === t.key;
                        const badge = badgeFor(t.key);

                        return (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={"flex-1 flex flex-col items-center gap-0.5 py-2.5 relative " + (isActive ? "text-green-700" : "text-gray-400")}
                            >
                                <div className="relative">
                                    <t.icon className="w-5 h-5" />
                                    {badge > 0 && (
                                        <span className={"absolute -top-1.5 -right-2 text-white text-[9px] font-bold min-w-[15px] h-[15px] px-1 rounded-full flex items-center justify-center " + (t.key === "wallet" ? "bg-amber-500" : "bg-slate-900")}>
                                            {badge}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] font-semibold">{t.label}</span>
                                {isActive && <span className="absolute top-0 w-8 h-0.5 bg-green-700 rounded-full" />}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

/* ================================================================== */
/* SHARED                                                               */
/* ================================================================== */

const ProfileStrip = ({ profile }) => (
    <div className="grid grid-cols-3 gap-2 lg:gap-3 mb-4 lg:mb-6 lg:max-w-2xl">
        <MiniStat icon={CheckCircle2} value={profile.completedJobs} label="Jobs done" />
        <MiniStat icon={Star} value={profile.rating?.toFixed(1) || "5.0"} label="Rating" />
        <MiniStat icon={Wrench} value={profile.performanceLevel} label="Level" />
    </div>
);

const MiniStat = ({ icon: Icon, value, label }) => (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 lg:p-4">
        <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-gray-400 mb-1 lg:mb-2" />
        <p className="text-sm lg:text-xl font-bold text-gray-900 leading-tight truncate">{value}</p>
        <p className="text-[10px] lg:text-xs text-gray-400">{label}</p>
    </div>
);

const ContactButtons = ({ customer }) => {
    const directionsUrl = buildDirectionsUrl(customer.lat, customer.lon);
    return (
        <div className="flex gap-2">
            {customer.phone && (
                <a
                    href={"tel:" + customer.phone}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-green-700 border border-green-200 rounded-lg active:bg-green-50 hover:bg-green-50"
                >
                    <Phone className="w-4 h-4" />
                    Call
                </a>
            )}
            {directionsUrl && (
                <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-blue-700 border border-blue-200 rounded-lg active:bg-blue-50 hover:bg-blue-50"
                >
                    <Navigation className="w-4 h-4" />
                    Directions
                </a>
            )}
        </div>
    );
};

const DeclineModal = ({ ticket, onClose, onDone, onError }) => {
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (reason.trim().length < 5) return;
        setSubmitting(true);
        onError("");
        try {
            await api.post("/technician/tickets/" + ticket._id + "/release", { reason: reason.trim() });
            onDone();
        } catch (err) {
            onError(getErrorMessage(err, "Could not send this back"));
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6">
                <h3 className="font-bold text-gray-900 mb-1">Can't do this job?</h3>
                <p className="text-sm text-gray-500 mb-4">
                    The office will see your reason and sort it out with the customer.
                </p>
                <CustomDropdown
                    value={reason}
                    onChange={(val) => setReason(val)}
                    options={[
                        { value: "Location is too far", label: "Location is too far" },
                        { value: "Customer is not responding", label: "Customer is not responding" },
                        { value: "Vehicle breakdown / Traffic", label: "Vehicle breakdown / Traffic" },
                        { value: "Missing spare parts", label: "Missing spare parts" },
                        { value: "Other", label: "Other" }
                    ]}
                    placeholder="Why can't you take this one?"
                    className="mb-4"
                />
                <div className="flex gap-2 mt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg active:bg-gray-50 hover:bg-gray-50"
                    >
                        Keep it
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={reason.trim().length < 5 || submitting}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-red-600 active:bg-red-700 hover:bg-red-700 disabled:opacity-50 rounded-lg"
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Send back
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ================================================================== */
/* NEXT WORK - queued behind the current job, no date                   */
/* ================================================================== */

const NextWorkCard = ({ ticket, onUpdate, position }) => {
    const [showDecline, setShowDecline] = useState(false);
    const [error, setError] = useState("");
    const customer = ticket.customerSnapshot || {};

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                    <span className="text-[11px] font-mono text-gray-400">{ticket.ticketNumber}</span>
                    <p className="font-semibold text-gray-900 text-sm lg:text-base truncate mt-0.5">{customer.name}</p>
                    <p className="text-xs lg:text-sm text-gray-500">{ticket.serviceLabel}</p>
                </div>
                <span className={"shrink-0 text-[10px] font-bold px-2 py-1 rounded-full " + (position === 0 ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600")}>
                    {position === 0 ? "NEXT" : "#" + (position + 1)}
                </span>
            </div>

            {ticket.problemDescription && (
                <p className="text-xs lg:text-sm text-gray-600 bg-gray-50 rounded-lg p-2.5 lg:p-3 mb-3">
                    {ticket.problemDescription}
                </p>
            )}

            <div className="flex items-center gap-1.5 text-xs lg:text-sm text-gray-500 mb-3">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{customer.address || customer.area || "No address"}</span>
            </div>

            {error && (
                <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                    {error}
                </div>
            )}

            <ContactButtons customer={customer} />

            {/* No "start now" here - this one starts on its own when the
                current job closes. Declining is the only choice to make. */}
            <button
                onClick={() => setShowDecline(true)}
                className="w-full mt-2 py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg active:bg-red-50 hover:bg-red-50"
            >
                Can't do this job
            </button>

            {showDecline && (
                <DeclineModal
                    ticket={ticket}
                    onClose={() => setShowDecline(false)}
                    onDone={() => { setShowDecline(false); onUpdate(); }}
                    onError={setError}
                />
            )}
        </div>
    );
};

const NextWorkTab = ({ tickets, onUpdate }) => {
    if (!tickets || tickets.length === 0) {
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-10 lg:p-16 text-center">
                <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="font-semibold text-gray-900">No jobs lined up</p>
                <p className="text-sm text-gray-500 mt-1">Work assigned while you're busy waits here.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="bg-slate-900 text-white rounded-2xl p-5 lg:p-6 mb-4 lg:max-w-md">
                <div className="flex items-center gap-2 mb-1">
                    <Layers className="w-4 h-4 text-white/60" />
                    <p className="text-sm font-medium text-white/60">Waiting for you</p>
                </div>
                <p className="text-3xl lg:text-4xl font-bold">{tickets.length}</p>
                <p className="text-xs text-white/50 mt-2 pt-2 border-t border-white/10">
                    The first one moves to My Job as soon as your current job is paid.
                </p>
            </div>

            <div className="space-y-2 lg:space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
                {tickets.map((t, i) => (
                    <NextWorkCard key={t._id} ticket={t} onUpdate={onUpdate} position={i} />
                ))}
            </div>
        </div>
    );
};

/* ================================================================== */
/* SCHEDULE - dated work, can be pulled forward                         */
/* ================================================================== */

const groupByDay = (tickets) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);

    const groups = { today: [], tomorrow: [], later: [] };

    tickets.forEach((t) => {
        const date = new Date(t.scheduling.scheduledFor);
        if (date < tomorrow) groups.today.push(t);
        else if (date < dayAfter) groups.tomorrow.push(t);
        else groups.later.push(t);
    });

    return groups;
};

const ScheduleJobCard = ({ ticket, showDate, canStartNow, onStarted, onError }) => {
    const [starting, setStarting] = useState(false);
    const [showDecline, setShowDecline] = useState(false);
    const customer = ticket.customerSnapshot || {};
    const scheduledFor = ticket.scheduling?.scheduledFor;
    const slot = ticket.scheduling?.slotWindow;
    const wasRescheduled = ticket.scheduling?.isRescheduled;

    const handleStartNow = async () => {
        setStarting(true);
        onError("");
        try {
            await api.post("/technician/tickets/" + ticket._id + "/start-now");
            onStarted();
        } catch (err) {
            onError(getErrorMessage(err, "Could not start this job"));
            setStarting(false);
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[11px] font-mono text-gray-400">{ticket.ticketNumber}</span>
                        {wasRescheduled && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                MOVED
                            </span>
                        )}
                    </div>
                    <p className="font-semibold text-gray-900 text-sm lg:text-base truncate">{customer.name}</p>
                    <p className="text-xs lg:text-sm text-gray-500 mt-0.5">{ticket.serviceLabel}</p>
                </div>

                <div className="shrink-0 text-right">
                    {showDate && scheduledFor && (
                        <p className="text-xs lg:text-sm font-bold text-slate-900">
                            {new Date(scheduledFor).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                    )}
                    {slot && (
                        <p className="text-xs text-slate-600 flex items-center gap-1 justify-end mt-0.5">
                            <Clock className="w-3 h-3" /> {slot}
                        </p>
                    )}
                </div>
            </div>

            {ticket.problemDescription && (
                <p className="text-xs lg:text-sm text-gray-600 bg-gray-50 rounded-lg p-2.5 lg:p-3 mb-3">
                    {ticket.problemDescription}
                </p>
            )}

            <div className="flex items-center gap-1.5 text-xs lg:text-sm text-gray-500 mb-3">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{customer.address || customer.area || "No address"}</span>
            </div>

            <ContactButtons customer={customer} />

            {/* Free technicians can pull a later job forward. While they're on
                something else the button explains why it's off. */}
            <button
                onClick={handleStartNow}
                disabled={!canStartNow || starting}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3 bg-slate-900 active:bg-slate-800 hover:bg-slate-800 disabled:bg-gray-100 disabled:text-gray-400 text-white font-semibold rounded-lg text-sm"
            >
                {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                {canStartNow ? "Do this job now" : "Finish your current job first"}
            </button>

            <button
                onClick={() => setShowDecline(true)}
                className="w-full mt-2 py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg active:bg-red-50 hover:bg-red-50"
            >
                Can't do this job
            </button>

            {showDecline && (
                <DeclineModal
                    ticket={ticket}
                    onClose={() => setShowDecline(false)}
                    onDone={() => { setShowDecline(false); onStarted(); }}
                    onError={onError}
                />
            )}
        </div>
    );
};

const ScheduleTab = ({ tickets, canStartNow, onStarted }) => {
    const [error, setError] = useState("");

    if (!tickets || tickets.length === 0) {
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-10 lg:p-16 text-center">
                <CalendarDays className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="font-semibold text-gray-900">Nothing scheduled</p>
                <p className="text-sm text-gray-500 mt-1">Jobs booked for a future date show up here.</p>
            </div>
        );
    }

    const groups = groupByDay(tickets);

    const sections = [
        { key: "today", label: "Today", tickets: groups.today, showDate: false },
        { key: "tomorrow", label: "Tomorrow", tickets: groups.tomorrow, showDate: false },
        { key: "later", label: "Coming up", tickets: groups.later, showDate: true },
    ];

    return (
        <div>
            <div className="bg-blue-600 text-white rounded-2xl p-5 lg:p-6 mb-4 lg:max-w-md">
                <div className="flex items-center gap-2 mb-1">
                    <CalendarDays className="w-4 h-4 text-white/70" />
                    <p className="text-sm font-medium text-white/70">Booked ahead</p>
                </div>
                <p className="text-3xl lg:text-4xl font-bold">{tickets.length}</p>
                <p className="text-xs text-white/60 mt-2 pt-2 border-t border-white/20">
                    {canStartNow
                        ? "Free right now? Start any of these early."
                        : "These start on their date, or when you're free."}
                </p>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
            )}

            <div className="space-y-5 lg:space-y-6">
                {sections.map((section) =>
                    section.tickets.length > 0 ? (
                        <div key={section.key}>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                                {section.label} ({section.tickets.length})
                            </h3>
                            <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
                                {section.tickets.map((t) => (
                                    <ScheduleJobCard
                                        key={t._id}
                                        ticket={t}
                                        showDate={section.showDate}
                                        canStartNow={canStartNow}
                                        onStarted={onStarted}
                                        onError={setError}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : null
                )}
            </div>
        </div>
    );
};

/* ================================================================== */
/* WALLET                                                               */
/* ================================================================== */

const PERIODS = [
    { key: 30, label: "1 month" },
    { key: 90, label: "3 months" },
    { key: 180, label: "6 months" },
    { key: 365, label: "1 year" },
];

const WalletTab = ({ pendingCash, refreshTrigger }) => {
    const [days, setDays] = useState(90);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [view, setView] = useState("summary");

    const load = useCallback(async (period) => {
        try {
            const res = await api.get("/technician/wallet", { params: { days: period } });
            setData(res.data.data);
            setError("");
        } catch (err) {
            setError(getErrorMessage(err, "Could not load your wallet"));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        load(days);
    }, [days, load, refreshTrigger]);

    if (loading) {
        return (
            <div className="py-10 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    if (error) {
        return <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>;
    }

    if (!data) return null;

    const youOwe = data.direction === "you_owe";

    return (
        <div>
            {/* Two numbers side by side - what you owe the office, and what
                you've earned. Technicians ask both questions constantly. */}
            <div className="grid grid-cols-2 gap-3 lg:gap-4 mb-4">
                <div className={"rounded-2xl p-4 lg:p-6 " + (youOwe ? "bg-amber-500 text-white" : "bg-slate-900 text-white")}>
                    <p className="text-[11px] lg:text-sm font-medium text-white/70 mb-1">
                        {youOwe ? "You owe office" : "Office owes you"}
                    </p>
                    <p className="text-2xl lg:text-4xl font-bold leading-tight">Rs {data.balanceDisplay}</p>
                    {youOwe && data.nearLimit && (
                        <p className="text-[10px] lg:text-xs text-white/80 mt-1.5">
                            Limit Rs {data.limitDisplay} - settle soon
                        </p>
                    )}
                </div>

                <div className="rounded-2xl p-4 lg:p-6 bg-green-700 text-white">
                    <p className="text-[11px] lg:text-sm font-medium text-white/70 mb-1">You earned</p>
                    <p className="text-2xl lg:text-4xl font-bold leading-tight">Rs {data.period.totalEarnedDisplay}</p>
                    <p className="text-[10px] lg:text-xs text-white/70 mt-1.5">{data.period.jobsCount} jobs</p>
                </div>
            </div>

            {/* Without this the only way to clear dues is a trip to the
                office - which is why the number keeps growing */}
            {youOwe && (
                <PayDuesCard
                    amountDisplay={data.balanceDisplay}
                    canPayOnline={data.canPayOnline}
                    onPaid={() => load(days)}
                />
            )}

            {pendingCash?.count > 0 && (
                <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
                    <Banknote className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-amber-900">
                            Rs {pendingCash.amountDisplay} cash collected
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                            {pendingCash.count} job{pendingCash.count === 1 ? "" : "s"} - the commission on these is in your balance above
                        </p>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
                    {PERIODS.map((p) => (
                        <button
                            key={p.key}
                            onClick={() => setDays(p.key)}
                            className={"px-3 lg:px-4 py-2 text-xs lg:text-sm font-semibold rounded-md whitespace-nowrap transition-colors " + (days === p.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                    {["summary", "passbook"].map((v) => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            className={"px-4 py-2 text-xs lg:text-sm font-medium rounded-md capitalize transition-colors " + (view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                        >
                            {v}
                        </button>
                    ))}
                </div>
            </div>

            {view === "summary" ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
                    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="w-4 h-4 text-gray-400" />
                            <h3 className="font-bold text-gray-900 text-sm">Last {data.period.days} days</h3>
                        </div>

                        <BreakdownRow label="From online jobs" value={data.period.onlineEarnedDisplay} />
                        <BreakdownRow label="From cash jobs" value={data.period.cashEarnedDisplay} />
                        <BreakdownRow
                            label={"Commission (" + data.commissionRate + "%)"}
                            value={data.period.commissionPaidDisplay}
                            negative
                        />
                        <BreakdownRow label="You settled" value={data.period.settledDisplay} muted />
                        <BreakdownRow label="Office paid you" value={data.period.payoutsDisplay} muted />

                        <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-100">
                            <span className="text-sm font-bold text-gray-900">Total earned</span>
                            <span className="text-lg font-bold text-green-700">
                                Rs {data.period.totalEarnedDisplay}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-3 lg:space-y-4">
                        <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-5">
                            <h3 className="font-bold text-gray-900 text-sm mb-3">All time</h3>
                            <BreakdownRow label="Jobs completed" value={data.lifetime.completedJobs} plain />
                            <BreakdownRow label="Earned from online jobs" value={data.lifetime.onlineDisplay} />
                        </div>

                        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl">
                            <p className="text-xs lg:text-sm text-blue-800">
                                Cash jobs leave the full amount with you and only the commission is
                                charged. Online jobs credit your share here for the office to pay out.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-1.5 lg:space-y-2">
                    {data.transactions.length === 0 ? (
                        <div className="bg-white border border-gray-200 rounded-xl p-10 lg:p-16 text-center">
                            <Wallet className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="font-semibold text-gray-900">No transactions yet</p>
                        </div>
                    ) : (
                        data.transactions.map((t) => (
                            <div key={t._id} className="bg-white border border-gray-200 rounded-xl p-3.5 lg:p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm lg:text-base text-gray-900 leading-snug">{t.description}</p>
                                        <p className="text-[11px] lg:text-xs text-gray-400 mt-1">
                                            {new Date(t.createdAt).toLocaleDateString("en-IN", {
                                                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                                            })}
                                            {t.ticket?.ticketNumber ? " · " + t.ticket.ticketNumber : ""}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={"text-sm lg:text-base font-bold " + (t.type === "credit" ? "text-green-700" : "text-red-600")}>
                                            {t.type === "credit" ? "+" : "-"} Rs {t.amountDisplay}
                                        </p>
                                        <p className="text-[10px] lg:text-xs text-gray-400">
                                            Bal: Rs {t.balanceAfterDisplay}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

const PayDuesCard = ({ amountDisplay, canPayOnline, onPaid }) => {
    const [creating, setCreating] = useState(false);
    const [linkId, setLinkId] = useState(null);
    const [error, setError] = useState("");

    // Poll while the payment window is open. The webhook does the crediting;
    // this just tells the panel when to refresh.
    useEffect(() => {
        if (!linkId) return;

        const interval = setInterval(async () => {
            try {
                const res = await api.get("/technician/wallet/recharge/" + linkId);
                if (res.data.data.isPaid) {
                    clearInterval(interval);
                    setLinkId(null);
                    notifyDone("Payment received", "Your balance has been updated");
                    onPaid();
                }
            } catch {
                // keep polling
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [linkId, onPaid]);

    const handlePay = async () => {
        setCreating(true);
        setError("");
        try {
            const res = await api.post("/technician/wallet/recharge", {});
            setLinkId(res.data.data.linkId);
            window.open(res.data.data.linkUrl, "_blank", "noopener");
        } catch (err) {
            setError(getErrorMessage(err, "Could not start the payment"));
        } finally {
            setCreating(false);
        }
    };

    if (!canPayOnline) {
        return (
            <div className="mb-4 p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="text-sm text-gray-700">
                    Deposit Rs {amountDisplay} at the office to clear this.
                </p>
            </div>
        );
    }

    return (
        <div className="mb-4 p-4 lg:p-5 bg-white border-2 border-amber-200 rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                <div>
                    <p className="font-semibold text-gray-900 text-sm lg:text-base">Clear your dues online</p>
                    <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                        Pay by UPI or card instead of carrying cash to the office.
                    </p>
                </div>

                <button
                    onClick={handlePay}
                    disabled={creating || Boolean(linkId)}
                    className="shrink-0 flex items-center justify-center gap-2 px-5 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm"
                >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                    {linkId ? "Waiting for payment..." : "Pay Rs " + amountDisplay}
                </button>
            </div>

            {linkId && (
                <p className="text-xs text-amber-700 mt-3 pt-3 border-t border-amber-100">
                    Payment page opened in a new tab. This updates on its own once it goes through.
                </p>
            )}

            {error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                </div>
            )}
        </div>
    );
};

const BreakdownRow = ({ label, value, negative, muted, plain }) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
        <span className="text-sm text-gray-600">{label}</span>
        <span className={"text-sm font-semibold " + (negative ? "text-red-600" : muted ? "text-gray-400" : "text-gray-900")}>
            {plain ? value : (negative ? "- Rs " : "Rs ") + value}
        </span>
    </div>
);

/* ================================================================== */
/* HISTORY                                                              */
/* ================================================================== */

const HistoryTab = ({ history }) => {
    if (!history || history.length === 0) {
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-10 lg:p-16 text-center">
                <HistoryIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="font-semibold text-gray-900">No completed jobs yet</p>
                <p className="text-sm text-gray-500 mt-1">Closed jobs will show up here.</p>
            </div>
        );
    }

    return (
        <div className="space-y-2 lg:space-y-3 lg:max-w-4xl">
            {history.map((t) => (
                <div key={t._id} className="bg-white border border-gray-200 rounded-xl p-4 lg:p-5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm lg:text-base truncate">
                            {t.customerSnapshot?.name}
                        </p>
                        <p className="text-xs lg:text-sm text-gray-500">
                            {t.serviceLabel} · {t.customerSnapshot?.area}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {t.billing?.invoiceNumber && (
                                <span className="text-[10px] text-gray-400 font-mono">{t.billing.invoiceNumber}</span>
                            )}
                            {t.payment?.method && (
                                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded uppercase">
                                    {t.payment.method}
                                </span>
                            )}
                            {t.payment?.status === "Verified" && (
                                <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                    <ShieldCheck className="w-2.5 h-2.5" /> VERIFIED
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="font-bold text-gray-900 text-sm lg:text-lg">
                            Rs {((t.billing?.totalPaise || 0) / 100).toFixed(0)}
                        </p>
                        <p className="text-[11px] lg:text-xs text-gray-400">
                            {new Date(t.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TechnicianPanel;