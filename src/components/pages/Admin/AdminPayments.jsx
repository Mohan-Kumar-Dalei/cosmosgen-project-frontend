import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import WalletsPanel from "./WalletsPanel";
import SettlementsPanel from "./SettlementsPanel";
import { useAdminAuth } from "../Admin/adminAuthContext";
import { useAdminData } from "./AdminDataContext";
import { api, getErrorMessage } from "../../services/api";
import { adminSocket, connectAdminSocket } from "../../services/socket";
import MapModal from "../../ui/MapModal";
import CopyText from "../../ui/CopyText";
import NotifyBadge from "../../ui/NotifyBadge";
import {
    Loader2, AlertCircle, CheckCircle2, Receipt,
    ShieldCheck, Banknote, RefreshCw, X, MapPin, Phone, Wallet, Landmark,
    Smartphone, HandCoins, Search, Footprints, SearchCheck, XCircle,
} from "lucide-react";

/**
 * Money, in one place: the bills technicians raised, whether the money behind
 * each one has been accounted for, and what is still to collect or pay.
 *
 * These were two screens. Checking a cash bill here and then navigating to a
 * separate Wallets page to record the commission that came back for it is one
 * job, and splitting it across two pages is part of why every settlement in
 * the ledger reads "Razorpay" with no reference against it.
 */
const STATUS_STYLES = {
    pending: "bg-warn-tint text-warn",
    collected: "bg-info-tint text-info",
    verified: "bg-brand-tint text-brand",
    failed: "bg-danger-tint text-danger",
};

const STATUS_LABELS = {
    pending: "awaiting payment",
    collected: "to verify",
    verified: "verified",
    failed: "failed",
};

const AdminPayments = () => {
    const { hasPermission } = useAdminAuth();
    const { counts, refreshCounts, globalRefreshTrigger } = useAdminData();

    const canSeePayments = hasPermission("VIEW_PAYMENTS");
    const canSeeWallets = hasPermission("VIEW_WALLETS");
    const canVerify = hasPermission("VERIFY_PAYMENT");

    const sections = useMemo(() => [
        ...(canSeePayments ? [
            { key: "verify", label: "To verify", icon: ShieldCheck },
            { key: "cash", label: "Cash", icon: Banknote },
            { key: "upi", label: "UPI", icon: Smartphone },
            { key: "visits", label: "Visits only", icon: Footprints },
        ] : []),
        ...(canSeeWallets ? [
            { key: "settlements", label: "Vendor paid", icon: HandCoins },
            { key: "wallet", label: "Wallet", icon: Wallet },
        ] : []),
        ...(canSeePayments ? [{ key: "history", label: "History", icon: Receipt }] : []),
    ], [canSeePayments, canSeeWallets]);

    // The tab lives in the URL, so a notification card can open the exact one
    // that changed and a link to "Wallet" still lands on Wallet.
    const [searchParams, setSearchParams] = useSearchParams();
    const { pathname } = useLocation();

    // /admin/wallets is the old address and the one a wallets-only role is
    // sent to, so it opens on the wallet tab rather than whatever happens to
    // come first.
    const onWalletsRoute = pathname.endsWith("/wallets");
    const fallback = (onWalletsRoute && sections.some((s) => s.key === "wallet"))
        ? "wallet"
        : sections[0]?.key || "verify";
    const requested = searchParams.get("tab");
    const section = sections.some((s) => s.key === requested) ? requested : fallback;
    const setSection = useCallback(
        (key) => setSearchParams(key === fallback ? {} : { tab: key }, { replace: true }),
        [setSearchParams, fallback]
    );

    const [statusFilter, setStatusFilter] = useState("all");
    const [search, setSearch] = useState("");

    const [payments, setPayments] = useState([]);
    const [summary, setSummary] = useState({});
    const [earnings, setEarnings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [verifyingId, setVerifyingId] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [invoice, setInvoice] = useState(null);
    const [walletSignal, setWalletSignal] = useState(0);
    const [focusTechnician, setFocusTechnician] = useState(null);
    const [searched, setSearched] = useState(false);

    // Two sections fetch their own data rather than the payment list
    const onWallets = section === "wallet";
    const onSettlements = section === "settlements";
    const onLedger = onWallets || onSettlements;

    const load = useCallback(async () => {
        setLoading(true);
        try {
            // The queue is every bill whose money is not yet accounted for,
            // cash included. Cash is settled under Wallet rather than matched
            // against a statement, but filtering it out of this list meant
            // nobody could see what was still outstanding.
            //
            // Cash and UPI are the same list split by how the customer paid.
            // "online" is anything the gateway handled - a card payment comes
            // back from Razorpay as "card", not "upi", so filtering on the
            // literal method would quietly drop it.
            const params = { status: "all" };
            if (section === "verify") params.status = "collected";
            else if (section === "cash") params.method = "cash";
            else if (section === "upi") params.method = "online";
            else if (section === "visits") params.kind = "visit";
            else if (section === "history") params.status = statusFilter;

            if (search.trim().length >= 2) params.search = search.trim();

            const res = await api.get("/admin/payments", { params });
            setPayments(res.data.data);
            setSummary(res.data.summary || {});
            setEarnings(res.data.earnings || null);
            setSearched(Boolean(res.data.searched));
            setError("");
        } catch (err) {
            setError(getErrorMessage(err, "Could not load payments"));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [section, statusFilter, search]);

    // Waiting a beat before firing means typing a name does not put one
    // request per keystroke on the server.
    useEffect(() => {
        if (onLedger) return;
        const timer = setTimeout(load, search ? 350 : 0);
        return () => clearTimeout(timer);
    }, [load, onLedger, globalRefreshTrigger, search]);

    useEffect(() => {
        connectAdminSocket();
        const refresh = () => { load(); setWalletSignal((n) => n + 1); };
        adminSocket.on("payment:collected", refresh);
        adminSocket.on("payment:reconciled", refresh);
        return () => {
            adminSocket.off("payment:collected", refresh);
            adminSocket.off("payment:reconciled", refresh);
        };
    }, [load]);

    const handleVerify = async (id) => {
        setVerifyingId(id);
        try {
            await api.post("/admin/payments/" + id + "/verify");
            await load();
            await refreshCounts();
        } catch (err) {
            setError(getErrorMessage(err, "Could not verify this payment"));
        } finally {
            setVerifyingId(null);
        }
    };

    const refreshAll = () => {
        setRefreshing(true);
        setWalletSignal((n) => n + 1);
        if (onLedger) setRefreshing(false);
        else load();
    };

    // The sidebar badge is one number for the whole screen, which told nobody
    // which tab it came from. Each tab carries its own share of it, so whoever
    // is on the desk can see where the work actually is.
    //
    // These come from the panel-wide counts rather than from the list this
    // screen has loaded. Working them out of the list meant a tab only knew
    // its number once it was open: a cash bill arriving in To verify also
    // leaves a settlement to record under Wallet, and the wallet tab kept
    // that to itself until somebody thought to look.
    const tabCounts = {
        verify: counts.paymentsToVerify || 0,
        cash: counts.paymentsCash || 0,
        upi: counts.paymentsOnline || 0,
        visits: counts.paymentsVisits || 0,
        wallet: counts.wallets || 0,
    };

    return (
        <AdminLayout>
            <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                    <h1 className="cg-h1">Payments</h1>
                    <p className="cg-sub mt-1">
                        Every bill, what the company kept from it, and what is still to collect or pay.
                    </p>
                </div>
                <button
                    onClick={refreshAll}
                    disabled={refreshing}
                    className="cg-icon-btn shrink-0"
                >
                    <RefreshCw className={"w-4 h-4 " + (refreshing ? "animate-spin" : "")} />
                </button>
            </div>

            {/* Commission is what the company charged; this is what it kept,
                once the gateway has taken its cut on whichever side of the
                job it applied to. */}
            {earnings && <EarningsStrip earnings={earnings} />}

            {/* One box for every tab. On the two ledger tabs it searches
                technicians; on the bill lists it also takes an invoice, a
                ticket number or a Razorpay reference, because a box that
                ignores a number pasted into it is worse than none. */}
            <div className="relative w-full sm:max-w-md mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={onLedger
                        ? "Search a vendor by name"
                        : "Search vendor, customer, invoice or ticket"}
                    className="cg-input pl-9 pr-9"
                />
                {search && (
                    <button
                        onClick={() => setSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
                        aria-label="Clear search"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="cg-tabbar cg-tabs mb-6">
                {sections.map((s) => (
                    <button
                        key={s.key}
                        onClick={() => setSection(s.key)}
                        className={"cg-tab " + (section === s.key ? "cg-tab-on" : "")}
                    >
                        <s.icon className="w-3.5 h-3.5" />
                        {s.label}
                        <NotifyBadge count={tabCounts[s.key] || 0} />
                    </button>
                ))}
            </div>

            {error && (
                <div className="mb-4 p-4 bg-danger-tint border border-hairline rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold text-danger">{error}</p>
                </div>
            )}

            {onSettlements ? (
                <SettlementsPanel refreshSignal={walletSignal} search={search} />
            ) : onWallets ? (
                <WalletsPanel
                    refreshSignal={walletSignal}
                    search={search}
                    focusTechnicianId={focusTechnician}
                    onFocusHandled={() => setFocusTechnician(null)}
                    onSettled={() => { refreshCounts(); load(); }}
                />
            ) : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                        <SummaryCard
                            label="Online, to verify"
                            value={summary.online?.collected?.amountDisplay}
                            count={summary.online?.collected?.count}
                            tone="blue"
                        />
                        <SummaryCard
                            label="Cash with vendors"
                            value={summary.cash?.collected?.amountDisplay}
                            count={summary.cash?.collected?.count}
                            tone="amber"
                            hint="settle under Wallet"
                        />
                        <SummaryCard
                            label="Verified"
                            value={summary.online?.verified?.amountDisplay}
                            count={summary.online?.verified?.count}
                            tone="green"
                        />
                        <SummaryCard
                            label="Awaiting payment"
                            value={summary.online?.pending?.amountDisplay}
                            count={summary.online?.pending?.count}
                            tone="gray"
                        />
                    </div>

                    {searched && (
                        <p className="text-xs text-ink-soft mb-3">
                            {payments.length} result{payments.length === 1 ? "" : "s"} for
                            <span className="font-semibold text-ink"> "{search.trim()}"</span>
                            <span className="text-ink-faint"> · the totals above still cover everything</span>
                        </p>
                    )}

                    {section === "visits" && (
                        <div className="mb-4 p-3.5 bg-sunken border border-hairline rounded-xl">
                            <p className="text-sm text-ink">
                                Trips where the customer refused after the quote and only the visit
                                was charged. No commission is taken on these, so there is nothing to
                                verify — they are here so you can see who keeps coming back with
                                only a visit charge.
                            </p>
                        </div>
                    )}

                    {section === "history" && (
                        <div className="flex gap-1 mb-4 flex-wrap">
                            {["all", "verified", "collected", "pending", "failed"].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s)}
                                    className={"px-3 py-1 text-xs font-semibold rounded-full border capitalize " + (statusFilter === s ? "bg-ink text-white border-ink" : "bg-white text-ink-soft border-hairline hover:border-hairline-strong")}
                                >
                                    {s === "all" ? "All" : STATUS_LABELS[s]}
                                </button>
                            ))}
                        </div>
                    )}

                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="cg-card p-4 h-32 animate-pulse" />
                            ))}
                        </div>
                    ) : payments.length === 0 ? (
                        <div className="cg-card p-10 text-center">
                            <Receipt className="w-8 h-8 text-ink-faint mx-auto mb-2" />
                            <p className="font-semibold text-ink">
                                {searched ? "No match" : "Nothing here"}
                            </p>
                            <p className="text-sm text-ink-soft mt-1">
                                {searched
                                    ? "Nothing matches \"" + search.trim() + "\" in this tab."
                                    : section === "verify"
                                    ? "Every bill has been accounted for."
                                    : section === "cash"
                                        ? "No cash bills yet."
                                        : section === "upi"
                                            ? "No online payments yet."
                                    : section === "visits"
                                            ? "No visit-only trips yet — every job that got quoted went ahead."
                                            : "Invoices show up as vendors generate them."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3 pb-8">
                            {payments.map((p) => (
                                <PaymentCard
                                    key={p._id}
                                    payment={p}
                                    canVerify={canVerify}
                                    verifying={verifyingId === p._id}
                                    onVerify={() => handleVerify(p._id)}
                                    onOpenBill={() => setInvoice(p)}
                                    onSettle={canSeeWallets ? () => {
                                        setFocusTechnician(p.technicianId || null);
                                        setSection("wallet");
                                    } : null}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            <InvoiceModal payment={invoice} onClose={() => setInvoice(null)} />
        </AdminLayout>
    );
};

/* ================================================================== */
/* EARNINGS - commission is not the same thing as profit                */
/* ================================================================== */

const EarningsStrip = ({ earnings }) => (
    <div className="cg-rich-dark text-white rounded-2xl p-5 mb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
                <p className="text-sm text-white/60">Total earnings</p>
                <p className="text-3xl font-bold mt-0.5">Rs {earnings.netDisplay}</p>
                <p className="text-xs text-white/50 mt-1">
                    Commission Rs {earnings.commissionDisplay}, less Rs {earnings.gatewayTotalDisplay} of gateway charges
                </p>
            </div>

            {/* Two possible gateway hits, never both on the same job: the fee
                on a customer's online bill, or the fee on the commission a
                technician sends back after a cash job. */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                <span className="text-white/50">Gateway · customer side</span>
                <span className="text-right font-semibold tabular-nums">Rs {earnings.customerGatewayDisplay}</span>
                <span className="text-white/50">Gateway · vendor side</span>
                <span className="text-right font-semibold tabular-nums">Rs {earnings.technicianGatewayDisplay}</span>
                <span className="text-white/40 col-span-2 pt-1 border-t border-white/10">
                    Razorpay {earnings.gatewayPercent}% + 18% GST on the fee
                </span>
            </div>
        </div>
    </div>
);

/* ================================================================== */
/* ONE BILL                                                             */
/* ================================================================== */

/**
 * What Razorpay said about this row's money.
 *
 * An earlier version of this had a box for the payment id, which was wrong:
 * it meant the office had to ring the technician and ask him to read out an
 * eighteen-character reference before they could check whether he had paid.
 * The server already knows which Razorpay payment belongs to the row - an
 * online bill carries its own id, a cash job is cleared by the settlement
 * that technician sent - so it looks the id up itself and the button is just
 * a button.
 *
 * There is no clock on it and nothing runs on its own. A four-minute window
 * was worse than useless here: the technician often pays hours later, and by
 * then the window had closed and the answer on screen was stale. One button,
 * pressed whenever anyone wants to know, is the honest version.
 */
const GatewayCheck = ({ state, onRecheck }) => (
    <div className="border-t border-hairline bg-sunken px-4 py-3">
        {state.loading && !state.note && !state.error ? (
            <p className="text-xs text-ink-soft flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Asking Razorpay…
            </p>
        ) : state.error ? (
            <p className="text-xs text-danger flex items-start gap-1.5">
                <XCircle className="w-3.5 h-3.5 shrink-0 mt-px" /> {state.error}
            </p>
        ) : (
            <p className={"text-xs font-medium flex items-start gap-1.5 " + (state.settled ? "text-brand" : "text-warn")}>
                {state.settled
                    ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-px" />
                    : <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />}
                <span>{state.note}</span>
            </p>
        )}

        {/* The reference is shown after the fact, not asked for before it */}
        {state.reference && (
            <CopyText
                value={state.reference}
                className="text-[11px] text-ink-faint mt-1 min-w-0"
                textClass="font-mono"
                title="Copy this Razorpay reference"
            />
        )}

        {state.checkedByName && (
            <p className="text-[11px] text-ink-faint mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Checked by {state.checkedByName}
                {state.checkedAt
                    ? " · " + new Date(state.checkedAt).toLocaleString("en-IN", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })
                    : ""}
            </p>
        )}

        {/* Press it again whenever - tomorrow morning, or in a minute */}
        {!state.settled && (
            <button
                type="button"
                onClick={onRecheck}
                disabled={state.loading}
                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ink bg-white border border-hairline-strong rounded-lg hover:bg-sunken disabled:opacity-50"
            >
                <RefreshCw className={"w-3.5 h-3.5 " + (state.loading ? "animate-spin" : "")} />
                {state.loading ? "Checking" : "Check again"}
            </button>
        )}
    </div>
);

const PaymentCard = ({ payment: p, canVerify, verifying, onVerify, onOpenBill, onSettle }) => {
    const [check, setCheck] = useState(null);
    const isCash = p.method === "cash";

    // Nothing was owed on this one, so no commission is coming back and there
    // is nothing at the gateway to look for. That is a visit charge today -
    // the trip is entirely the technician's money. It keys off the commission
    // rather than off the trip, so if the company ever charges a commission on
    // visits these buttons come back on their own.
    const nothingOwed = !(p.commissionPaise > 0);

    // Returns whether the money is there, so the timer inside stops on its own
    const runCheck = async () => {
        setCheck((c) => ({ ...(c || {}), loading: true }));
        try {
            const res = await api.post("/admin/payments/" + p._id + "/check");
            const d = res.data.data || {};
            setCheck({
                loading: false,
                note: res.data.message,
                reference: d.reference || null,
                settled: Boolean(d.settled),
                checkedByName: d.checkedByName || null,
                checkedAt: d.checkedAt || null,
            });
            return Boolean(d.settled);
        } catch (err) {
            setCheck({ loading: false, error: getErrorMessage(err, "Could not check this payment") });
            return false;
        }
    };
    const s = p.settlement || {};

    return (
        <div className="cg-card overflow-hidden">
            <div className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-mono text-ink-faint">{p.invoiceNumber}</span>
                        <span className={"text-xs font-semibold px-2 py-0.5 rounded-full " + STATUS_STYLES[p.status]}>
                            {STATUS_LABELS[p.status] || p.status}
                        </span>
                        <span className={"text-[10px] font-bold px-1.5 py-0.5 rounded uppercase " + (isCash ? "bg-warn-tint text-warn" : "bg-info-tint text-info")}>
                            {p.method}
                        </span>
                        {p.isVisitCharge && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-sunken text-ink-soft">
                                visit only
                            </span>
                        )}
                    </div>

                    <p className="font-semibold text-ink">
                        {p.customer?.name || "Unknown customer"}
                        <span className="font-normal text-ink-faint"> · Ticket {p.ticketNumber}</span>
                    </p>

                    {p.serviceLabel && <p className="text-xs text-ink-soft mt-0.5">{p.serviceLabel}</p>}

                    <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs">
                        {/* Falls back to the ticket's snapshot, so an online
                            payment - which no technician collected - still
                            names who did the work. */}
                        {p.technicianName && <span className="text-ink-soft">By {p.technicianName}</span>}
                        {p.razorpayPaymentId && (
                            <CopyText
                                value={p.razorpayPaymentId}
                                className="text-ink-faint min-w-0"
                                textClass="font-mono"
                                title="Copy this Razorpay reference"
                            />
                        )}
                    </div>

                    {p.verifiedBy?.name && (
                        <p className="text-xs text-brand mt-1 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Verified by {p.verifiedBy.name}
                        </p>
                    )}

                    {/* A tick next to a reference nobody looked at and a tick
                        next to one the gateway confirmed look identical
                        afterwards. This says which of the two it was. */}
                    {p.gatewayCheck?.checkedAt && (
                        <p className={"text-xs mt-0.5 " + (p.gatewayCheck.matched ? "text-ink-soft" : "text-danger font-medium")}>
                            {p.gatewayCheck.matched
                                ? "Razorpay confirmed Rs " + (p.gatewayCheck.amountPaise / 100).toFixed(2)
                                  + (p.gatewayCheck.methodUsed ? " by " + p.gatewayCheck.methodUsed : "")
                                : "Razorpay said \"" + p.gatewayCheck.status + "\" - not verified"}
                        </p>
                    )}

                    {/* Otherwise the only buttons on the row are a gateway
                        check and a settlement, and neither of them applies -
                        which reads as a screen with nothing to do on it. */}
                    {isCash && nothingOwed && p.status === "collected" && (
                        <p className="text-xs text-ink-soft mt-1.5">
                            The whole amount is the vendor's. The company takes nothing on this
                            one, so there is nothing to check with Razorpay; confirm the figure
                            under Wallet.
                        </p>
                    )}
                </div>

                <div className="shrink-0 text-right">
                    <p className="text-lg font-bold text-ink">Rs {p.amountDisplay}</p>
                    <p className="text-xs text-ink-faint">
                        {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>

                    <button
                        onClick={onOpenBill}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-ink-soft hover:text-ink"
                    >
                        <Receipt className="w-3 h-3" />
                        View bill
                    </button>

                    {/* Cash never entered the company account, so there is
                        nothing here to match against a statement. What matters
                        there is whether the technician sent the commission. */}
                    {canVerify && p.status === "collected" && !isCash && (
                        <button
                            onClick={onVerify}
                            disabled={verifying}
                            className="cg-btn cg-btn-go mt-2 px-3 py-1.5 text-xs"
                        >
                            {verifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            {verifying ? "Checking" : "Check ref"}
                        </button>
                    )}

                    {/* Cash carries no gateway id - the money the office is
                        waiting for is the commission transfer that comes
                        afterwards, so the check runs against that reference
                        rather than against this row. With nothing owed there
                        is no such transfer, and asking Razorpay about one
                        turned up an old payment of his and offered it as
                        though it had just arrived. */}
                    {canVerify && isCash && !nothingOwed && p.status === "collected" && (
                        <button
                            onClick={() => (check ? setCheck(null) : runCheck())}
                            className={"mt-2 ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg " + (check ? "bg-sunken text-ink" : "bg-ink hover:bg-black text-white")}
                        >
                            <SearchCheck className="w-3 h-3" />
                            {check ? "Close check" : "Check payment"}
                        </button>
                    )}

                    {isCash && p.status === "collected" && onSettle && (
                        <button
                            onClick={onSettle}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-warn hover:text-warn"
                        >
                            <Landmark className="w-3 h-3" />
                            {nothingOwed ? "Confirm the amount" : "Settle commission"}
                        </button>
                    )}
                </div>
            </div>

            {check && <GatewayCheck state={check} onRecheck={runCheck} />}

            {s.commissionDisplay && s.commissionDisplay !== "0.00" && <SettlementBreakdown settlement={s} />}
        </div>
    );
};

/**
 * The whole arithmetic of one job on one strip: what came in, what the
 * company charged, what the gateway took, and what is genuinely left.
 */
const SettlementBreakdown = ({ settlement: s }) => {
    const inCash = s.collectedIn === "cash";

    return (
        <div className="border-t border-hairline bg-sunken/70 px-4 py-3">
            <div className="flex flex-wrap items-start gap-x-5 gap-y-2 text-xs">
                <Figure label={inCash ? "Cash collected" : "Paid online"} value={s.grossDisplay} />
                <Arrow />
                <Figure
                    label={"Commission" + (s.commissionPercent != null ? " " + s.commissionPercent + "%" : "")}
                    value={s.commissionDisplay}
                    note={s.gstInCommissionDisplay !== "0.00" ? "Rs " + s.gstInCommissionDisplay + " of it is tax" : null}
                />
                <Arrow />
                <Figure
                    label={"Razorpay " + s.gatewayPercent + "% + GST"}
                    value={"-" + s.gatewayTotalDisplay}
                    tone="red"
                    note={s.technicianGatewayIsEstimate ? "when the commission comes in" : null}
                />
                <Arrow />
                <Figure label="Total earning" value={s.netEarningDisplay} tone="green" strong />

                <span className="ml-auto text-[11px] text-ink-faint self-center">
                    Vendor's share Rs {s.technicianShareDisplay}
                </span>
            </div>

            {/* Which side of the job the gateway charge landed on. */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 pt-2 border-t border-hairline text-[11px] text-ink-faint">
                <span>
                    Gateway · customer side{" "}
                    <span className="font-semibold text-ink-soft tabular-nums">Rs {s.customerGatewayDisplay}</span>
                </span>
                <span>
                    Gateway · vendor side{" "}
                    <span className="font-semibold text-ink-soft tabular-nums">Rs {s.technicianGatewayDisplay}</span>
                </span>
                <span className="text-ink-faint">
                    {inCash
                        ? "Cash job — the fee applies to the commission the vendor sends back"
                        : "Online job — the fee already came off the customer's payment"}
                </span>
            </div>
        </div>
    );
};

const Arrow = () => <span className="text-ink-faint select-none self-center">→</span>;

const Figure = ({ label, value, note, tone, strong }) => {
    const tones = { red: "text-danger", green: "text-brand" };

    return (
        <span className="inline-block">
            <span className="block text-[10px] uppercase tracking-wide text-ink-faint">{label}</span>
            <span className={"block tabular-nums " + (strong ? "text-sm font-bold " : "font-semibold ") + (tones[tone] || "text-ink")}>
                Rs {value}
            </span>
            {note && <span className="block text-[10px] text-ink-faint">{note}</span>}
        </span>
    );
};

/* ================================================================== */
/* THE BILL ITSELF                                                      */
/* ================================================================== */

/**
 * The bill exactly as the technician built it, for the office to check before
 * verifying. The payment row alone is only an amount - this is what that
 * amount was actually for, and what the company is left with afterwards.
 */
const InvoiceModal = ({ payment, onClose }) => {
    const [showMap, setShowMap] = useState(false);
    if (!payment) return null;

    const c = payment.customer || {};
    const bill = payment.bill || {};
    const s = payment.settlement || {};
    const isCash = payment.method === "cash";
    const hasCoords = Number.isFinite(Number(c.lat)) && Number.isFinite(Number(c.lon));

    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
                <div
                    className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[88vh] flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="border-b border-hairline px-5 py-4 flex items-start justify-between gap-3 shrink-0">
                        <div className="min-w-0">
                            <p className="font-bold text-ink">Invoice {payment.invoiceNumber}</p>
                            <p className="text-xs text-ink-soft mt-0.5">
                                Ticket {payment.ticketNumber}
                                {payment.serviceLabel ? " · " + payment.serviceLabel : ""}
                            </p>
                        </div>
                        <button onClick={onClose} className="shrink-0 text-ink-faint hover:text-ink-soft" aria-label="Close">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

                        {/* who paid, who did the work */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider mb-1">Customer</p>
                                <p className="text-sm font-semibold text-ink">{c.name || "Unknown"}</p>
                                {c.phone && (
                                    <a href={"tel:" + c.phone} className="text-xs text-ink-soft flex items-center gap-1 mt-0.5 hover:text-ink">
                                        <Phone className="w-3 h-3" /> {c.phone}
                                    </a>
                                )}
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider mb-1">Vendor</p>
                                <p className="text-sm font-semibold text-ink">{payment.technicianName || "Not recorded"}</p>
                                {payment.technicianPhone && (
                                    <p className="text-xs text-ink-soft mt-0.5">{payment.technicianPhone}</p>
                                )}
                            </div>
                        </div>

                        {/* where the job was */}
                        <div>
                            <p className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider mb-1">Location</p>
                            {hasCoords ? (
                                <button onClick={() => setShowMap(true)} className="flex items-start gap-2 text-left group">
                                    <MapPin className="w-4 h-4 text-ink-faint shrink-0 mt-0.5" />
                                    <span className="min-w-0">
                                        <span className="block text-sm text-ink group-hover:underline">
                                            {c.address || c.area || "Open on the map"}
                                        </span>
                                        {c.landmark && <span className="block text-xs text-ink-faint">Near {c.landmark}</span>}
                                        <span className="block text-[11px] font-mono text-ink-faint mt-0.5">
                                            {Number(c.lat).toFixed(5)}, {Number(c.lon).toFixed(5)}
                                        </span>
                                    </span>
                                </button>
                            ) : (
                                <p className="text-sm text-ink-soft">No location recorded on this ticket</p>
                            )}
                        </div>

                        {/* what was charged */}
                        <div>
                            <p className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider mb-2">What the vendor charged for</p>
                            {bill.lineItems?.length ? (
                                <div className="rounded-xl border border-hairline overflow-hidden">
                                    {bill.lineItems.map((item, i) => (
                                        <div
                                            key={i}
                                            className={"flex items-baseline justify-between gap-4 px-3.5 py-2.5 text-sm " + (i > 0 ? "border-t border-hairline" : "")}
                                        >
                                            <span className="text-ink">{item.description}</span>
                                            <span className="font-semibold text-ink shrink-0 tabular-nums">Rs {item.amountDisplay}</span>
                                        </div>
                                    ))}

                                    <div className="border-t border-hairline bg-sunken px-3.5 py-2.5 space-y-1">
                                        <div className="flex justify-between text-xs text-ink-soft">
                                            <span>Subtotal</span>
                                            <span className="tabular-nums">Rs {bill.subtotalDisplay}</span>
                                        </div>
                                        {bill.gstPercent > 0 && (
                                            <div className="flex justify-between text-xs text-ink-soft">
                                                <span>GST {bill.gstPercent}%</span>
                                                <span className="tabular-nums">Rs {bill.gstDisplay}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-sm font-bold text-ink pt-1 border-t border-hairline">
                                            <span>Total</span>
                                            <span className="tabular-nums">Rs {bill.totalDisplay}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-ink-soft">No itemised bill was recorded.</p>
                            )}

                            {bill.workDone && (
                                <div className="mt-3">
                                    <p className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider mb-1">Work recorded</p>
                                    <p className="text-sm text-ink">{bill.workDone}</p>
                                </div>
                            )}
                        </div>

                        {/* what the company is left with */}
                        {s.commissionDisplay && s.commissionDisplay !== "0.00" && (
                            <div>
                                <p className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider mb-2">What the company keeps</p>
                                <div className="rounded-xl border border-hairline overflow-hidden text-sm">
                                    <Line label={isCash ? "Cash collected" : "Paid online"} value={s.grossDisplay} />
                                    <Line
                                        label={"Company commission" + (s.commissionPercent != null ? " (" + s.commissionPercent + "%)" : "")}
                                        value={s.commissionDisplay}
                                    />
                                    {s.gstInCommissionDisplay !== "0.00" && (
                                        <Line
                                            label="Tax collected, payable to the government"
                                            value={s.gstInCommissionDisplay}
                                            muted
                                        />
                                    )}
                                    <Line label="Vendor's share" value={s.technicianShareDisplay} muted />
                                    <Line
                                        label={"Razorpay fee (" + s.gatewayPercent + "% + 18% GST)"}
                                        value={"-" + s.gatewayTotalDisplay}
                                        tone="red"
                                    />
                                    <div className="flex justify-between px-3.5 py-2.5 bg-sunken border-t border-hairline font-bold text-ink">
                                        <span>Total earning</span>
                                        <span className="tabular-nums">Rs {s.netEarningDisplay}</span>
                                    </div>
                                </div>

                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-ink-faint">
                                    <span>Gateway · customer side <span className="text-ink-soft font-semibold">Rs {s.customerGatewayDisplay}</span></span>
                                    <span>Gateway · vendor side <span className="text-ink-soft font-semibold">Rs {s.technicianGatewayDisplay}</span></span>
                                </div>
                                {s.technicianGatewayIsEstimate && (
                                    <p className="mt-1 text-[11px] text-ink-faint">
                                        The vendor's side is an estimate until their commission transfer clears.
                                    </p>
                                )}

                                {/* The commission is a share of the GST-inclusive
                                    total, so part of what looks like margin is tax
                                    the company has to hand over. */}
                                {bill.gstPercent > 0 && (
                                    <p className="mt-2 text-[11px] text-ink-soft bg-warn-tint border border-hairline rounded-lg px-2.5 py-2">
                                        Commission is taken on the total after GST. Rs {bill.gstDisplay} of GST was
                                        charged on this bill and the company hands all of it to the government, but
                                        only Rs {s.gstInCommissionDisplay} of that sits inside the commission. The
                                        rest left with the vendor’s share.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* corrections, if the technician made any */}
                        {payment.billEdits?.length > 0 && (
                            <div>
                                <p className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider mb-2">
                                    Corrections ({payment.billEdits.length})
                                </p>
                                <div className="rounded-xl border border-hairline bg-warn-tint/60 overflow-hidden">
                                    {payment.billEdits.map((e, i) => (
                                        <div key={i} className={"px-3.5 py-2.5 text-sm " + (i > 0 ? "border-t border-hairline" : "")}>
                                            <div className="flex items-baseline justify-between gap-3">
                                                <span className="text-ink">{e.reason}</span>
                                                <span className="shrink-0 text-xs tabular-nums text-ink-soft">
                                                    Rs {e.fromDisplay} to Rs {e.toDisplay}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-ink-soft mt-0.5">
                                                {new Date(e.at).toLocaleString("en-IN", {
                                                    day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
                                                })}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* how it was paid */}
                        <div>
                            <p className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider mb-2">Payment</p>
                            <div className="flex flex-wrap gap-2 mb-2">
                                <span className={"text-xs font-bold px-2 py-1 rounded uppercase " + (isCash ? "bg-warn-tint text-warn" : "bg-info-tint text-info")}>
                                    {isCash ? "Cash" : payment.method}
                                </span>
                                <span className={"text-xs font-semibold px-2 py-1 rounded-full " + (STATUS_STYLES[payment.status] || "bg-sunken text-ink-soft")}>
                                    {STATUS_LABELS[payment.status] || payment.status}
                                </span>
                            </div>
                            <div className="text-sm space-y-1">
                                {/* A split bill lands in two places, so one amount
                                    on its own does not say whether it all arrived. */}
                                {payment.split && (
                                    <>
                                        <div className="flex justify-between gap-4">
                                            <span className="text-ink-soft shrink-0">Cash to the vendor</span>
                                            <span className="text-ink tabular-nums">
                                                Rs {payment.split.technicianCashDisplay}
                                                {payment.split.cashConfirmedAt ? " (confirmed)" : " (not confirmed)"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                            <span className="text-ink-soft shrink-0">Paid online to the company</span>
                                            <span className="text-ink tabular-nums">
                                                Rs {payment.split.companyOnlineDisplay}
                                                {payment.split.onlinePaidAt ? " (received)" : " (not received)"}
                                            </span>
                                        </div>
                                    </>
                                )}

                                {/* Copyable, because this is the number the office
                                    pastes into the settlement record. */}
                                {payment.razorpayPaymentId && (
                                    <div className="flex justify-between gap-4">
                                        <span className="text-ink-soft shrink-0">Razorpay ref</span>
                                        <CopyText
                                            value={payment.razorpayPaymentId}
                                            className="text-ink-soft min-w-0"
                                            textClass="font-mono text-xs"
                                            title="Copy this Razorpay reference"
                                        />
                                    </div>
                                )}
                                {/* Cash has no gateway reference, so what the technician
                                    typed when they collected it is the only record of
                                    how the money changed hands. */}
                                {payment.note && (
                                    <div className="flex justify-between gap-4">
                                        <span className="text-ink-soft shrink-0">{isCash ? "Cash record" : "Note"}</span>
                                        <span className="text-ink text-right">{payment.note}</span>
                                    </div>
                                )}
                                {isCash && !payment.note && payment.status !== "pending" && (
                                    <div className="flex justify-between gap-4">
                                        <span className="text-ink-soft shrink-0">Cash record</span>
                                        <span className="text-ink-faint">Nothing was noted</span>
                                    </div>
                                )}
                                {payment.collectedAt && (
                                    <div className="flex justify-between gap-4">
                                        <span className="text-ink-soft shrink-0">{isCash ? "Cash taken on" : "Paid on"}</span>
                                        <span className="text-ink">
                                            {new Date(payment.collectedAt).toLocaleString("en-IN", {
                                                day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
                                            })}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between pt-1 border-t border-hairline">
                                    <span className="text-ink-soft">Billed on</span>
                                    <span className="text-ink">
                                        {new Date(payment.createdAt).toLocaleString("en-IN", {
                                            day: "numeric", month: "short", year: "numeric",
                                            hour: "numeric", minute: "2-digit",
                                        })}
                                    </span>
                                </div>
                                {payment.verifiedBy?.name && (
                                    <div className="flex justify-between text-brand">
                                        <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Verified by</span>
                                        <span className="font-semibold">{payment.verifiedBy.name}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <MapModal
                open={showMap}
                onClose={() => setShowMap(false)}
                title={c.name || "Job location"}
                subtitle={"Invoice " + payment.invoiceNumber + " · Ticket " + payment.ticketNumber}
                lat={c.lat}
                lon={c.lon}
                markerColor="#15803d"
            />
        </>
    );
};

const Line = ({ label, value, tone, muted }) => (
    <div className="flex justify-between gap-4 px-3.5 py-2 border-b border-hairline last:border-b-0">
        <span className={muted ? "text-ink-faint" : "text-ink-soft"}>{label}</span>
        <span className={"tabular-nums font-semibold " + (tone === "red" ? "text-danger" : muted ? "text-ink-soft" : "text-ink")}>
            Rs {value}
        </span>
    </div>
);

const SummaryCard = ({ label, value, count, tone, hint }) => {
    const tones = {
        blue: "text-info",
        green: "text-brand",
        amber: "text-warn",
        gray: "text-ink",
    };

    return (
        <div className="cg-card p-4">
            <div className="flex items-center gap-1.5 mb-1">
                {tone === "amber" && <Banknote className="w-3.5 h-3.5 text-amber-500" />}
                <p className="text-xs font-medium text-ink-soft">{label}</p>
            </div>
            <p className={"text-xl font-bold " + tones[tone]}>Rs {value || "0.00"}</p>
            <p className="text-xs text-ink-faint">
                {count || 0} invoice{count === 1 ? "" : "s"}{hint ? " · " + hint : ""}
            </p>
        </div>
    );
};

export default AdminPayments;
