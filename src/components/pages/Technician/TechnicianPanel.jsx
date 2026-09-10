import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, getErrorMessage } from "../../services/api";
import { techSocket, connectTechSocket, disconnectTechSocket, onLiveResume } from "../../services/socket";
import { notifyNew, notifyAlert, notifyDone, notifyInfo } from "../../services/notify";
import ActiveJobCard from "./ActiveJobCard";
import NotifyBadge from "../../ui/NotifyBadge";
import CustomDropdown from "../../ui/CustomDropdown";
import {
    MapPin, Wrench, LogOut, User, Layers, Banknote,
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

// Number(null) and Number("") are both 0, and 0 is finite - so checking only
// for a finite number turns a ticket with no coordinates into a link to 0,0
// in the Gulf of Guinea rather than no link at all.
const isCoord = (v) =>
    (typeof v === "number" || (typeof v === "string" && v.trim() !== "")) &&
    Number.isFinite(Number(v));

const buildDirectionsUrl = (lat, lon) => {
    if (!isCoord(lat) || !isCoord(lon)) return null;
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
    // The latest GPS fix, kept here rather than in the job card so the panel
    // runs exactly one watchPosition. Two watchers on one page drain the
    // phone twice as fast for the same coordinates.
    const [techPos, setTechPos] = useState(null);
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

    /**
     * Handlers live for as long as the panel does; the connection itself is
     * decided separately, below. Registering them here and connecting there
     * means a vendor going online and offline all morning re-uses one set of
     * listeners instead of tearing them down and rebuilding them each time.
     */
    useEffect(() => {
        const onAssigned = (p) => {
            loadBootstrap();
            setTab("active");
            notifyNew("New job assigned", (p?.customer?.name || "") + ", " + (p?.customer?.area || ""), {
                panel: "Vendor", tab: "My Job", onOpen: () => setTab("active"),
            });
        };
        const onQueued = (p) => {
            loadBootstrap();
            notifyInfo("Job added to your list", (p?.customerName || "") + ", " + (p?.area || ""), {
                panel: "Vendor", tab: "Next", onOpen: () => setTab("next"),
            });
        };
        const onCashVerified = () => {
            loadBootstrap();
            notifyDone("Cash deposit confirmed", "The office has counted it in", {
                panel: "Vendor", tab: "Wallet", onOpen: () => setTab("wallet"),
            });
        };
        const onClosed = () => {
            loadBootstrap();
            notifyDone("Payment received", "That job is closed", {
                panel: "Vendor", tab: "History", onOpen: () => setTab("history"),
            });
        };
        const onRemoved = () => {
            loadBootstrap();
            notifyInfo("A job was removed", "The office reassigned it", {
                panel: "Vendor", tab: "My Job", onOpen: () => setTab("active"),
            });
        };
        // The server decides arrival from the location ping, so this is how
        // the panel finds out it happened.
        const onArrived = () => {
            loadBootstrap();
            notifyDone("You've reached the customer", "They've been told you're here", {
                panel: "Vendor", tab: "My Job", onOpen: () => setTab("active"),
            });
        };

        const onBalance = () => loadBootstrap();

        // The office switch, or another tab of his own, has put him offline.
        // Disconnecting here rather than letting the server cut the socket is
        // deliberate: a socket the server drops is one socket.io immediately
        // dials back, and the two would fight.
        const onSessionOffline = () => {
            disconnectTechSocket();
            loadBootstrap();
        };

        // He cannot work on a blocked account, so leaving him on a panel that
        // looks normal only means every button he presses fails.
        const onBlocked = (p) => {
            notifyAlert("Account blocked", p?.message || "Contact the office.", {
                panel: "Vendor", duration: 30000,
            });
            navigate("/technician/admin/login");
        };

        // He is standing in the customer's house waiting for this, so it has
        // to arrive on its own rather than on a refresh he has to think of.
        const onRefusalResolved = (p) => {
            loadBootstrap();
            setTab("active");
            if (p?.decision === "customer_agreed") {
                notifyDone("The customer agreed", "Carry on with the job", {
                    panel: "Vendor", tab: "My Job", onOpen: () => setTab("active"),
                });
            } else {
                notifyAlert("The customer is not going ahead", "Take your visit charge and head off", {
                    panel: "Vendor", tab: "My Job", onOpen: () => setTab("active"),
                });
            }
        };

        // On a split the technician cannot take his cash until the customer
        // has paid the office part, so the moment that lands the button he is
        // waiting on has to come alive on its own.
        const onSplitPaid = () => {
            loadBootstrap();
            notifyDone("Customer paid the office part", "You can take your cash now", {
                panel: "Vendor", tab: "My Job", onOpen: () => setTab("active"),
            });
        };

        techSocket.on("wallet:updated", onBalance);
        techSocket.on("split:commission-paid", onSplitPaid);
        techSocket.on("refusal:resolved", onRefusalResolved);
        techSocket.on("ticket:assigned", onAssigned);
        techSocket.on("ticket:queued", onQueued);
        techSocket.on("ticket:removed", onRemoved);
        techSocket.on("ticket:closed", onClosed);
        techSocket.on("cash:verified", onCashVerified);
        techSocket.on("ride:arrived", onArrived);
        techSocket.on("account:blocked", onBlocked);
        techSocket.on("session:offline", onSessionOffline);

        // Nothing above fires for anything that happened while the socket was
        // down, because none of it was replayed. This is what covers that gap.
        const stopResume = onLiveResume(techSocket, loadBootstrap);

        return () => {
            techSocket.off("wallet:updated", onBalance);
            techSocket.off("split:commission-paid", onSplitPaid);
            techSocket.off("refusal:resolved", onRefusalResolved);
            techSocket.off("ticket:assigned", onAssigned);
            techSocket.off("ticket:queued", onQueued);
            techSocket.off("ticket:removed", onRemoved);
            techSocket.off("ticket:closed", onClosed);
            techSocket.off("cash:verified", onCashVerified);
            techSocket.off("ride:arrived", onArrived);
            techSocket.off("account:blocked", onBlocked);
            techSocket.off("session:offline", onSessionOffline);
            stopResume();
        };
    }, [loadBootstrap, navigate]);

    /**
     * A socket only while there is something to hear.
     *
     * An offline vendor is not being assigned work, so holding a live
     * connection for him costs the server a socket and tells it nothing. This
     * follows the same rule the location watcher does: online, or on a job he
     * is already driving to.
     *
     * onLiveResume re-reads the panel whenever the connection comes back, so
     * anything that happened while he was offline is picked up the moment he
     * returns - there is no gap to patch by hand.
     */
    useEffect(() => {
        const shouldConnect =
            data?.profile?.isAvailable ||
            Boolean(data?.profile?.activeTicket) ||
            Boolean(data?.activeTicket?._id);

        if (shouldConnect) connectTechSocket();
        else disconnectTechSocket();
    }, [data?.profile?.isAvailable, data?.profile?.activeTicket, data?.activeTicket?._id]);

    // Leaving the panel always drops the socket, whatever the status was
    useEffect(() => () => disconnectTechSocket(), []);

    // Share location while online. The socket handler throttles DB writes to
    // one every 10 seconds, so leaving watchPosition running is fine.
    useEffect(() => {
        // An assigned job needs the watcher running even if the technician has
        // flipped themselves offline, otherwise the route map on the job they
        // are already driving to goes dark.
        const isOnline =
            data?.profile?.isAvailable ||
            Boolean(data?.profile?.activeTicket) ||
            Boolean(data?.activeTicket?._id);

        if (isOnline && navigator.geolocation && !watchIdRef.current) {
            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    const fix = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                    };
                    techSocket.emit("tech:location", fix);
                    setTechPos(fix);
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
    }, [data?.profile?.isAvailable, data?.profile?.activeTicket, data?.activeTicket?._id]);

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
        // Same as the backoffice: end the connection on the way out rather
        // than leaving it to the unmount that follows.
        disconnectTechSocket();
        try {
            await api.post("/technician/logout");
        } catch {
            // ignore
        }
        navigate("/technician/admin/login");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-canvas">
                <Loader2 className="w-6 h-6 text-ink-faint animate-spin" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
                <div className="cg-lift p-8 max-w-sm text-center">
                    <AlertCircle className="w-8 h-8 text-danger mx-auto mb-3" />
                    <p className="font-semibold text-ink">{error || "Something went wrong"}</p>
                </div>
            </div>
        );
    }

    const { profile, activeTicket, nextJobs = [], scheduledJobs = [], history, pendingCash } = data;
    const onJob = Boolean(profile.activeTicket);
    const hasPendingCash = pendingCash?.count > 0;
    // Money still owed to the company after the office has checked the cash
    // off. Between a job being verified and the settlement being recorded the
    // pending list is empty while he still owes - so the balance itself has to
    // speak, or the tab goes quiet at exactly the wrong moment. A balance the
    // other way is the company's job, not his, so it raises nothing.
    const owesCompany = (profile.walletBalancePaise || 0) < 0;
    const hasLocation = Boolean(profile.location?.coordinates?.length);

    // Every tab that can be carrying work says so. The job in hand counts as
    // one - without it the only tab with nothing on it was the one the
    // technician is actually meant to be looking at.
    const badgeFor = (key) =>
        key === "active" ? (activeTicket ? 1 : 0)
            : key === "next" ? nextJobs.length
                : key === "schedule" ? scheduledJobs.length
                    : key === "wallet" ? (hasPendingCash ? pendingCash.count : owesCompany ? 1 : 0)
                        : 0;

    return (
        <div className="min-h-screen bg-canvas lg:flex">

            {/* DESKTOP SIDEBAR - a bottom bar on a large screen wastes the
                space and puts navigation nowhere near the eye */}
            <aside className="cg-rich-dark hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:h-screen lg:sticky lg:top-0 text-white">
                <div className="px-5 py-6 flex items-center gap-2.5">
                    <img 
                        src="https://ik.imagekit.io/ny6yinyut/cosmosgenLogo/cosmosgen-logo.png?updatedAt=1788413075959" 
                        alt="Cosmosgen Logo"
                        className="h-8 w-8 rounded-full bg-white p-[3px] object-contain"
                    />
                    <div>
                        <p className="font-display font-semibold text-[15px] tracking-tight leading-none text-white">Cosmosgen</p>
                        <p className="text-[9px] text-white/40 tracking-[0.14em] uppercase mt-1">Vendor</p>
                    </div>
                </div>

                <div className="px-4 pb-4 border-b border-panel-line">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-11 h-11 rounded-full bg-white/10 border border-white/15 flex items-center justify-center overflow-hidden shrink-0">
                            {profile.profileImage ? (
                                <img src={profile.profileImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-base font-bold">{profile.name?.[0]?.toUpperCase()}</span>
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-sm truncate text-white">{profile.name}</p>
                            <p className="text-[11px] text-white/45 truncate flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5 shrink-0" />
                                {profile.area || "No location"}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleToggleStatus}
                        disabled={togglingStatus || onJob}
                        title={onJob ? "You cannot go offline while on a job" : ""}
                        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-[10px] bg-white/[0.06] border border-white/10 hover:bg-white/[0.1] transition-colors disabled:cursor-not-allowed disabled:hover:bg-white/[0.06]"
                    >
                        <span className="text-left">
                            <span className="block text-[11px] font-bold tracking-[0.08em] text-white">
                                {onJob ? "ON JOB" : profile.isAvailable ? "ONLINE" : "OFFLINE"}
                            </span>
                            <span className="block text-[10px] text-white/40 mt-0.5">
                                {onJob ? "Finish to change" : profile.isAvailable ? "Taking jobs" : "Not taking jobs"}
                            </span>
                        </span>
                        <span className={"cg-switch " + ((profile.isAvailable || onJob) ? "cg-switch-on" : "")}>
                            <span className="cg-switch-knob" />
                        </span>
                    </button>
                </div>

                <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
                    {TABS.map((t) => {
                        const isActive = tab === t.key;
                        const badge = badgeFor(t.key);

                        return (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={"cg-nav-item w-full text-left " + (isActive ? "cg-nav-item-on" : "")}
                            >
                                <t.icon className={"w-4 h-4 shrink-0 " + (isActive ? "text-accent" : "text-white/40")} />
                                <span className="flex-1 text-left">{t.label}</span>
                                <NotifyBadge count={badge} />
                            </button>
                        );
                    })}
                </nav>

                <div className="p-3 border-t border-panel-line space-y-1">
                    <Link
                        to="/technician/admin/profile"
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-[10px] text-sm font-medium text-white/55 hover:bg-white/5 hover:text-white transition-colors"
                    >
                        <User className="w-4 h-4 text-white/40" /> Profile
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-[10px] text-sm font-medium text-[#ff8b83] hover:bg-[#ff8b83]/10 hover:text-[#ffb0aa] transition-colors"
                    >
                        <LogOut className="w-4 h-4" /> Sign out
                    </button>
                </div>
            </aside>

            <div className="flex-1 min-w-0">

                {/* MOBILE HEADER */}
                <div className="lg:hidden bg-surface/85 backdrop-blur border-b border-hairline px-4 py-3 flex items-center justify-between sticky top-0 z-30">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <img 
                            src="https://ik.imagekit.io/ny6yinyut/cosmosgenLogo/cosmosgen-logo.png?updatedAt=1788413075959" 
                            alt="Cosmosgen" 
                            className="h-6 shrink-0" 
                        />
                        <div className="min-w-0">
                            <p className="cg-h2 leading-tight truncate">
                                {profile.name?.split(" ")[0]}
                            </p>
                            <p className="text-[11px] text-ink-soft flex items-center gap-0.5 truncate">
                                <MapPin className="w-2.5 h-2.5 shrink-0" /> {profile.area || "No location"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => { setRefreshing(true); loadBootstrap(); }}
                            disabled={refreshing}
                            className="p-2 text-ink-faint active:text-ink disabled:opacity-50"
                        >
                            <RefreshCw className={"w-4 h-4 " + (refreshing ? "animate-spin" : "")} />
                        </button>

                        <button
                            onClick={handleToggleStatus}
                            disabled={togglingStatus || onJob}
                            className={"flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-full text-[11px] font-bold border disabled:opacity-70 " + (onJob ? "bg-info-tint border-hairline text-info" : profile.isAvailable ? "bg-brand-tint border-hairline text-brand" : "bg-sunken border-hairline text-ink-soft")}
                        >
                            {onJob ? "ON JOB" : profile.isAvailable ? "ONLINE" : "OFFLINE"}
                            <span className={"cg-switch scale-[0.62] origin-right " + ((profile.isAvailable || onJob) ? "cg-switch-on" : "")}>
                                <span className="cg-switch-knob" />
                            </span>
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setMenuOpen(!menuOpen)}
                                className="w-8 h-8 rounded-full bg-sunken flex items-center justify-center overflow-hidden"
                            >
                                {profile.profileImage ? (
                                    <img src={profile.profileImage} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xs font-bold text-ink-soft">{profile.name?.[0]?.toUpperCase()}</span>
                                )}
                            </button>
                            {menuOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                                    <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-hairline py-1 z-20">
                                        <Link
                                            to="/technician/admin/profile"
                                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink-soft active:bg-sunken"
                                        >
                                            <User className="w-4 h-4" /> Profile
                                        </Link>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-danger active:bg-danger-tint"
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
                            <h1 className="cg-h1">
                                {TABS.find((t) => t.key === tab)?.label}
                            </h1>
                            <p className="text-ink-soft text-sm mt-0.5">{TAB_SUBTITLES[tab]}</p>
                        </div>
                        <button
                            onClick={() => { setRefreshing(true); loadBootstrap(); }}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-ink-soft cg-card hover:bg-sunken disabled:opacity-50"
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
                        <div className="mb-4 p-3.5 bg-warn-tint border border-hairline rounded-xl flex items-start gap-2.5">
                            <MapPin className="w-4 h-4 text-warn shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-warn">Location not set</p>
                                <p className="text-xs text-warn mt-0.5">
                                    Go online and allow location. Jobs near you cannot reach you until then.
                                </p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-3 bg-danger-tint border border-hairline rounded-lg text-sm text-danger">
                            {error}
                        </div>
                    )}

                    {tab === "active" && (
                        <>
                            <ProfileStrip profile={profile} />
                            <ActiveJobCard ticket={activeTicket} onUpdate={loadBootstrap} techPos={techPos} visitChargePaise={data?.visitChargePaise} />
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
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-hairline z-30 pb-[env(safe-area-inset-bottom)]">
                <div className="flex">
                    {TABS.map((t) => {
                        const isActive = tab === t.key;
                        const badge = badgeFor(t.key);

                        return (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={"flex-1 flex flex-col items-center gap-0.5 py-2.5 relative " + (isActive ? "text-brand" : "text-ink-faint")}
                            >
                                <div className="relative">
                                    <t.icon className="w-5 h-5" />
                                    <NotifyBadge count={badge} className="absolute -top-1.5 -right-2" />
                                </div>
                                <span className="text-[10px] font-semibold">{t.label}</span>
                                {isActive && <span className="absolute top-0 w-8 h-0.5 bg-brand rounded-full" />}
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

/*
 * What he opens the app to see.
 *
 * Three separate grey boxes made his own record look like three unrelated
 * readouts on an empty screen. One lit card, split by hairlines, reads as his
 * standing with the company - which is what these three numbers actually are,
 * and the reason he looks at them at all.
 */
const ProfileStrip = ({ profile }) => (
    <div className="cg-rich-light p-4 lg:p-5 mb-4 lg:mb-6 lg:max-w-2xl">
        <p className="cg-label mb-3">Your record</p>
        <div className="grid grid-cols-3 divide-x divide-hairline">
            <MiniStat icon={CheckCircle2} value={profile.completedJobs} label="Jobs done" />
            <MiniStat icon={Star} value={profile.rating?.toFixed(1) || "5.0"} label="Rating" tone="text-warn" />
            <MiniStat icon={Wrench} value={profile.performanceLevel} label="Level" tone="text-brand" />
        </div>
    </div>
);

const MiniStat = ({ icon: Icon, value, label, tone = "text-accent" }) => (
    <div className="px-3 first:pl-0 last:pr-0">
        <div className="flex items-center gap-1.5 mb-1.5">
            <Icon className={"w-3.5 h-3.5 shrink-0 " + tone} />
            <p className="text-[10px] lg:text-xs text-ink-faint truncate">{label}</p>
        </div>
        <p className="cg-figure text-xl lg:text-2xl leading-none truncate">{value}</p>
    </div>
);

const ContactButtons = ({ customer }) => {
    const directionsUrl = buildDirectionsUrl(customer.lat, customer.lon);
    return (
        <div className="flex gap-2">
            {customer.phone && (
                <a
                    href={"tel:" + customer.phone}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-brand border border-hairline rounded-lg active:bg-brand-tint hover:bg-brand-tint"
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
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-info border border-hairline rounded-lg active:bg-info-tint hover:bg-info-tint"
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
                <h3 className="font-bold text-ink mb-1">Can't do this job?</h3>
                <p className="text-sm text-ink-soft mb-4">
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
                        className="flex-1 px-4 py-3 text-sm font-medium text-ink border border-hairline rounded-lg active:bg-sunken hover:bg-sunken"
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
        <div className="cg-card p-4 lg:p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                    <span className="text-[11px] font-mono text-ink-faint">{ticket.ticketNumber}</span>
                    <p className="font-semibold text-ink text-sm lg:text-base truncate mt-0.5">{customer.name}</p>
                    <p className="text-xs lg:text-sm text-ink-soft">{ticket.serviceLabel}</p>
                </div>
                <span className={"shrink-0 text-[10px] font-bold px-2 py-1 rounded-full " + (position === 0 ? "bg-ink text-white" : "bg-sunken text-ink-soft")}>
                    {position === 0 ? "NEXT" : "#" + (position + 1)}
                </span>
            </div>

            {ticket.problemDescription && (
                <p className="text-xs lg:text-sm text-ink-soft bg-sunken rounded-lg p-2.5 lg:p-3 mb-3">
                    {ticket.problemDescription}
                </p>
            )}

            <div className="flex items-center gap-1.5 text-xs lg:text-sm text-ink-soft mb-3">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{customer.address || customer.area || "No address"}</span>
            </div>

            {error && (
                <div className="mb-3 p-2.5 bg-danger-tint border border-hairline rounded-lg text-xs text-danger">
                    {error}
                </div>
            )}

            <ContactButtons customer={customer} />

            {/* No "start now" here - this one starts on its own when the
                current job closes. Declining is the only choice to make. */}
            <button
                onClick={() => setShowDecline(true)}
                className="w-full mt-2 py-2.5 text-sm font-medium text-danger border border-hairline rounded-lg active:bg-danger-tint hover:bg-danger-tint"
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
            <div className="cg-card p-10 lg:p-16 text-center">
                <Layers className="w-8 h-8 text-ink-faint mx-auto mb-2" />
                <p className="font-semibold text-ink">No jobs lined up</p>
                <p className="text-sm text-ink-soft mt-1">Work assigned while you're busy waits here.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="cg-rich-dark text-white rounded-2xl p-5 lg:p-6 mb-4 lg:max-w-md">
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
        <div className="cg-card p-4 lg:p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[11px] font-mono text-ink-faint">{ticket.ticketNumber}</span>
                        {wasRescheduled && (
                            <span className="text-[10px] font-bold text-warn bg-warn-tint px-1.5 py-0.5 rounded">
                                MOVED
                            </span>
                        )}
                    </div>
                    <p className="font-semibold text-ink text-sm lg:text-base truncate">{customer.name}</p>
                    <p className="text-xs lg:text-sm text-ink-soft mt-0.5">{ticket.serviceLabel}</p>
                </div>

                <div className="shrink-0 text-right">
                    {showDate && scheduledFor && (
                        <p className="text-xs lg:text-sm font-bold text-ink">
                            {new Date(scheduledFor).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                    )}
                    {slot && (
                        <p className="text-xs text-ink-soft flex items-center gap-1 justify-end mt-0.5">
                            <Clock className="w-3 h-3" /> {slot}
                        </p>
                    )}
                </div>
            </div>

            {ticket.problemDescription && (
                <p className="text-xs lg:text-sm text-ink-soft bg-sunken rounded-lg p-2.5 lg:p-3 mb-3">
                    {ticket.problemDescription}
                </p>
            )}

            <div className="flex items-center gap-1.5 text-xs lg:text-sm text-ink-soft mb-3">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{customer.address || customer.area || "No address"}</span>
            </div>

            <ContactButtons customer={customer} />

            {/* Free technicians can pull a later job forward. While they're on
                something else the button explains why it's off. */}
            <button
                onClick={handleStartNow}
                disabled={!canStartNow || starting}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3 bg-ink active:bg-ink hover:bg-black disabled:bg-sunken disabled:text-ink-faint text-white font-semibold rounded-lg text-sm"
            >
                {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                {canStartNow ? "Do this job now" : "Finish your current job first"}
            </button>

            <button
                onClick={() => setShowDecline(true)}
                className="w-full mt-2 py-2.5 text-sm font-medium text-danger border border-hairline rounded-lg active:bg-danger-tint hover:bg-danger-tint"
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
            <div className="cg-card p-10 lg:p-16 text-center">
                <CalendarDays className="w-8 h-8 text-ink-faint mx-auto mb-2" />
                <p className="font-semibold text-ink">Nothing scheduled</p>
                <p className="text-sm text-ink-soft mt-1">Jobs booked for a future date show up here.</p>
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
                <div className="mb-4 p-3 bg-danger-tint border border-hairline rounded-lg text-sm text-danger">{error}</div>
            )}

            <div className="space-y-5 lg:space-y-6">
                {sections.map((section) =>
                    section.tickets.length > 0 ? (
                        <div key={section.key}>
                            <h3 className="text-xs font-bold text-ink-faint uppercase tracking-wide mb-2">
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
                <Loader2 className="w-6 h-6 animate-spin text-ink-faint" />
            </div>
        );
    }

    if (error) {
        return <div className="p-4 bg-danger-tint border border-hairline rounded-xl text-sm text-danger">{error}</div>;
    }

    if (!data) return null;

    const youOwe = data.direction === "you_owe";
    // Square with the company. Not a debt in either direction, and it used to
    // be shown as "Office will pay you Rs 0.00".
    const allSquare = data.direction === "settled";

    return (
        <div>
            {/* Two numbers side by side - what you still have to hand in, and what
                you've earned. Technicians ask both questions constantly. */}
            <div className="grid grid-cols-2 gap-3 lg:gap-4 mb-4">
                <div className={"cg-rich-dark rounded-2xl p-4 lg:p-6 text-white " + (youOwe ? "[--color-panel:#5c3208]" : "")}>
                    <p className="text-[11px] lg:text-sm font-medium text-white/70 mb-1">
                        {allSquare ? "Nothing pending" : youOwe ? "To deposit at office" : "Office will pay you"}
                    </p>
                    <p className="text-2xl lg:text-4xl font-bold leading-tight">
                        {allSquare ? "All clear" : "Rs " + data.balanceDisplay}
                    </p>
                    {youOwe && data.nearLimit && (
                        <p className="text-[10px] lg:text-xs text-white/80 mt-1.5">
                            Limit Rs {data.limitDisplay}, settle soon
                        </p>
                    )}
                    {/* The credit appears the moment the customer pays, but the
                        money is still sitting with Razorpay for a few days
                        before the office can send it on. Without the date this
                        number reads as "already paid" and the phone rings. */}
                    {!youOwe && data.payoutExpected && (
                        <p className="text-[10px] lg:text-xs text-white/80 mt-1.5">
                            {data.payoutExpected.overdue
                                ? "Past the usual " + data.payoutExpected.days + " days, ask the office"
                                : "In your bank by " + new Date(data.payoutExpected.expectedBy).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                    )}
                </div>

                <div className="cg-rich-dark rounded-2xl p-4 lg:p-6 text-white [--color-panel:#0d3a1d]">
                    <p className="text-[11px] lg:text-sm font-medium text-white/70 mb-1">You earned</p>
                    <p className="text-2xl lg:text-4xl font-bold leading-tight">Rs {data.period.totalEarnedDisplay}</p>
                    <p className="text-[10px] lg:text-xs text-white/70 mt-1.5">{data.period.jobsCount} jobs</p>
                </div>
            </div>

            {/* Without this the only way to clear dues is a trip to the
                office - which is why the number keeps growing.
                
                The same card carries what happens after he pays. It used to
                be a separate banner, which meant the moment the payment went
                through this card came back reading "Clear your dues online" -
                the due above has not moved yet, because only the office
                recording it moves that - and a man who has just paid reads
                that as the payment having failed. */}
            {youOwe && (
                <PayDuesCard
                    amountDisplay={data.balanceDisplay}
                    canPayOnline={data.canPayOnline}
                    settlementPending={data.settlementPending}
                    onPaid={() => load(days)}
                />
            )}

            {pendingCash?.count > 0 && (
                <div className="mb-4 p-3.5 bg-warn-tint border border-hairline rounded-xl flex items-start gap-2.5">
                    <Banknote className="w-4 h-4 text-warn shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-warn">
                            Rs {pendingCash.amountDisplay} cash collected
                        </p>
                        <p className="text-xs text-warn mt-0.5">
                            {pendingCash.count} job{pendingCash.count === 1 ? "" : "s"}. Already counted in your balance above.
                        </p>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="cg-tabs">
                    {PERIODS.map((p) => (
                        <button
                            key={p.key}
                            onClick={() => setDays(p.key)}
                            className={"cg-tab " + (days === p.key ? "cg-tab-on" : "")}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                <div className="cg-tabs">
                    {["summary", "passbook"].map((v) => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            className={"cg-tab capitalize " + (view === v ? "cg-tab-on" : "")}
                        >
                            {v}
                        </button>
                    ))}
                </div>
            </div>

            {view === "summary" ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
                    <div className="cg-card p-4 lg:p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="w-4 h-4 text-ink-faint" />
                            <h3 className="cg-h2">Last {data.period.days} days</h3>
                        </div>

                        <BreakdownRow label="From online jobs" value={data.period.onlineEarnedDisplay} />
                        <BreakdownRow label="From cash jobs" value={data.period.cashEarnedDisplay} />
                        {data.period.splitEarnedDisplay !== "0.00" && (
                            <BreakdownRow
                                label="Of that, taken on split jobs"
                                value={data.period.splitEarnedDisplay}
                                muted
                            />
                        )}
                        {data.period.visitEarnedDisplay !== "0.00" && (
                            <BreakdownRow
                                label="Of that, visit charges"
                                value={data.period.visitEarnedDisplay}
                                muted
                            />
                        )}
                        <BreakdownRow label="You settled" value={data.period.settledDisplay} muted />
                        <BreakdownRow label="Office paid you" value={data.period.payoutsDisplay} muted />

                        <div className="flex items-center justify-between pt-3 mt-1 border-t border-hairline">
                            <span className="text-sm font-bold text-ink">Total earned</span>
                            <span className="text-lg font-bold text-brand">
                                Rs {data.period.totalEarnedDisplay}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-3 lg:space-y-4">
                        <div className="cg-card p-4 lg:p-5">
                            <h3 className="cg-h2 mb-3">All time</h3>
                            <BreakdownRow label="Jobs completed" value={data.lifetime.completedJobs} plain />
                            <BreakdownRow label="Earned from online jobs" value={data.lifetime.onlineDisplay} />
                        </div>

                        <div className="p-3.5 bg-info-tint border border-hairline rounded-xl">
                            <p className="text-xs lg:text-sm text-info">
                                Cash jobs leave the full amount with you, and what is still to
                                hand over shows in your balance above. When a customer pays online
                                the money reaches the company account in about four days, so your
                                share is transferred to your bank a day or two after that. You get a
                                WhatsApp the moment it is sent. Split jobs are already square: you
                                took your share in cash and the customer paid the office directly,
                                so that job is fully settled.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-1.5 lg:space-y-2">
                    {data.transactions.length === 0 ? (
                        <div className="cg-card p-10 lg:p-16 text-center">
                            <Wallet className="w-8 h-8 text-ink-faint mx-auto mb-2" />
                            <p className="font-semibold text-ink">No transactions yet</p>
                        </div>
                    ) : (
                        data.transactions.map((t) => (
                            <div key={t._id} className="cg-card p-3.5 lg:p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm lg:text-base text-ink leading-snug">{t.description}</p>
                                        <p className="text-[11px] lg:text-xs text-ink-faint mt-1">
                                            {new Date(t.createdAt).toLocaleDateString("en-IN", {
                                                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                                            })}
                                            {t.ticket?.ticketNumber ? " · " + t.ticket.ticketNumber : ""}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={"text-sm lg:text-base font-bold " + (t.type === "credit" ? "text-brand" : "text-danger")}>
                                            {t.type === "credit" ? "+" : "-"} Rs {t.amountDisplay}
                                        </p>
                                        {t.movesBalance === false ? (
                                            <p className="text-[10px] lg:text-xs text-ink-faint">
                                                Fully settled
                                            </p>
                                        ) : (
                                            <p className="text-[10px] lg:text-xs text-ink-faint">
                                                Bal: Rs {t.balanceAfterDisplay}
                                            </p>
                                        )}
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

const PayDuesCard = ({ amountDisplay, canPayOnline, settlementPending, onPaid }) => {
    const [creating, setCreating] = useState(false);
    const [linkId, setLinkId] = useState(null);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState("");
    // Set the instant the gateway says the money is in, so the card changes
    // over without waiting for the wallet to be re-fetched.
    const [justPaid, setJustPaid] = useState(false);

    // He has paid and the office has not recorded it yet. The due above is
    // still standing, because only their recording it moves the balance - so
    // this has to be said in words that stay on the screen. A toast that
    // slides away after eight seconds is not an answer to "did my payment go
    // through", and it is the question he will come back to the app to ask.
    const received = Boolean(settlementPending) || justPaid;
    const receivedDisplay = settlementPending?.amountDisplay || amountDisplay;

    // The server announces the payment the moment the gateway confirms it, so
    // there is nothing to poll for - the panel waits to be told. "Check now"
    // is there for the day the socket does not arrive.
    //
    // Two different announcements end this wait. "settlement:received" means
    // the money reached us and the office still has to record it; the balance
    // itself only moves later, on "wallet:updated". Listening for the balance
    // alone left this card spinning until somebody in the office got round to
    // it.
    useEffect(() => {
        if (!linkId) return undefined;

        const onArrived = () => {
            setLinkId(null);
            setJustPaid(true);
            notifyDone("Payment received", "The office will record it against your jobs", {
                panel: "Vendor", tab: "Wallet",
            });
            onPaid();
        };

        techSocket.on("settlement:received", onArrived);
        techSocket.on("wallet:updated", onArrived);
        return () => {
            techSocket.off("settlement:received", onArrived);
            techSocket.off("wallet:updated", onArrived);
        };
    }, [linkId, onPaid]);

    const checkNow = async () => {
        setChecking(true);
        try {
            const res = await api.get("/technician/wallet/recharge/" + linkId);
            if (res.data.data.isPaid) {
                setLinkId(null);
                setJustPaid(true);
                notifyDone("Payment received", "The office will record it against your jobs", {
                    panel: "Vendor", tab: "Wallet",
                });
                onPaid();
            } else {
                setError("Not received yet. Finish the payment, then check again.");
            }
        } catch {
            setError("Could not reach the gateway. Try again in a moment.");
        } finally {
            setChecking(false);
        }
    };

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

    if (!canPayOnline && !received) {
        return (
            <div className="mb-4 p-3.5 bg-sunken border border-hairline rounded-xl">
                <p className="text-sm text-ink">
                    Deposit Rs {amountDisplay} at the office to clear this.
                </p>
            </div>
        );
    }

    return (
        <div className={"mb-4 p-4 lg:p-5 bg-white border-2 rounded-2xl " + (received ? "border-hairline" : "border-hairline")}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                <div>
                    <p className="font-semibold text-ink text-sm lg:text-base">
                        {received ? "Rs " + receivedDisplay + " received" : "Clear your dues online"}
                    </p>
                    <p className="text-xs lg:text-sm text-ink-soft mt-0.5">
                        {received
                            ? "Nothing more to pay. The office is checking it against your jobs, and your balance clears once they record it."
                            : "Pay by UPI or card instead of carrying cash to the office."}
                    </p>
                </div>

                <div className="shrink-0">
                    <button
                        onClick={handlePay}
                        disabled={received || creating || Boolean(linkId)}
                        className={"w-full flex items-center justify-center gap-2 px-5 py-3 disabled:opacity-100 text-white font-semibold rounded-lg text-sm " + (received ? "bg-blue-600" : "bg-amber-600 hover:bg-amber-700 disabled:opacity-60")}
                    >
                        {received ? <CheckCircle2 className="w-4 h-4" />
                            : creating ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <CreditCard className="w-4 h-4" />}
                        {received ? "Paid Rs " + receivedDisplay
                            : linkId ? "Waiting for payment..."
                                : "Pay Rs " + amountDisplay}
                    </button>

                    {/* Under the button, where he is looking straight after
                        pressing it. The toast says the same thing and then
                        goes away; this stays until the office records it. */}
                    {received && (
                        <p className="mt-1.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-info">
                            <ShieldCheck className="w-3 h-3 shrink-0" />
                            Payment received, waiting for verification
                        </p>
                    )}
                </div>
            </div>

            {linkId && !received && (
                <div className="mt-3 pt-3 border-t border-hairline flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-warn">
                        Payment page opened in a new tab. This updates on its own once it goes through.
                    </p>
                    <button
                        onClick={checkNow}
                        disabled={checking}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-warn border border-amber-300 rounded-lg hover:bg-warn-tint disabled:opacity-50"
                    >
                        <RefreshCw className={"w-3 h-3 " + (checking ? "animate-spin" : "")} />
                        Check now
                    </button>
                </div>
            )}

            {error && (
                <div className="mt-3 p-3 bg-danger-tint border border-hairline rounded-lg text-sm text-danger">
                    {error}
                </div>
            )}
        </div>
    );
};

const BreakdownRow = ({ label, value, negative, muted, plain }) => (
    <div className="flex items-center justify-between py-2 border-b border-hairline last:border-0">
        <span className="text-sm text-ink-soft">{label}</span>
        <span className={"text-sm font-semibold " + (negative ? "text-danger" : muted ? "text-ink-faint" : "text-ink")}>
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
            <div className="cg-card p-10 lg:p-16 text-center">
                <HistoryIcon className="w-8 h-8 text-ink-faint mx-auto mb-2" />
                <p className="font-semibold text-ink">No completed jobs yet</p>
                <p className="text-sm text-ink-soft mt-1">Closed jobs will show up here.</p>
            </div>
        );
    }

    return (
        <div className="space-y-2 lg:space-y-3 lg:max-w-4xl">
            {history.map((t) => (
                <div key={t._id} className="cg-card p-4 lg:p-5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="font-semibold text-ink text-sm lg:text-base truncate">
                            {t.customerSnapshot?.name}
                        </p>
                        <p className="text-xs lg:text-sm text-ink-soft">
                            {t.serviceLabel} · {t.customerSnapshot?.area}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {t.billing?.invoiceNumber && (
                                <span className="text-[10px] text-ink-faint font-mono">{t.billing.invoiceNumber}</span>
                            )}
                            {t.payment?.method && (
                                <span className="text-[10px] font-bold text-ink-soft bg-sunken px-1.5 py-0.5 rounded uppercase">
                                    {t.payment.method}
                                </span>
                            )}
                            {t.payment?.status === "Verified" && (
                                <span className="text-[10px] font-bold text-brand bg-brand-tint px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                    <ShieldCheck className="w-2.5 h-2.5" /> VERIFIED
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="cg-h2 lg:text-lg">
                            Rs {((t.billing?.totalPaise || 0) / 100).toFixed(0)}
                        </p>
                        <p className="text-[11px] lg:text-xs text-ink-faint">
                            {new Date(t.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TechnicianPanel;