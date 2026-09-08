import { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "../Admin/adminAuthContext";
import { api, getErrorMessage } from "../../services/api";
import CustomDropdown from "../../ui/CustomDropdown";
import CopyText from "../../ui/CopyText";
import {
    Loader2, AlertCircle, X, Wallet, Phone,
    ArrowUpRight, ArrowDownLeft, CheckCircle2, MapPin, Footprints, CalendarClock,
    SearchCheck, XCircle,
} from "lucide-react";

/** "3 Sep" - short enough to sit on a row without wrapping it. */
const shortDate = (value) =>
    new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/**
 * Balances and settlement, embedded as a tab of the Payments page rather than
 * living on its own screen.
 *
 * Verifying a payment and settling the commission behind it are one job done
 * by one person - splitting them across two pages meant checking a cash bill
 * here and then navigating away to record the money that came back for it.
 */
const WalletsPanel = ({ refreshSignal, onSettled, focusTechnicianId, onFocusHandled, search = "" }) => {
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [flash, setFlash] = useState("");
    const [selectedId, setSelectedId] = useState(focusTechnicianId || null);

    const load = useCallback(async () => {
        try {
            const params = {};
            if (search.trim().length >= 2) params.search = search.trim();

            const res = await api.get("/admin/wallets", { params });
            setRows(res.data.data);
            setSummary(res.data.summary);
            setError("");
        } catch (err) {
            setError(getErrorMessage(err, "Could not load wallet balances"));
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        const timer = setTimeout(load, search ? 350 : 0);
        return () => clearTimeout(timer);
    }, [load, refreshSignal, search]);

    const closeDetail = () => {
        setSelectedId(null);
        onFocusHandled?.();
    };

    const handleDone = async (message) => {
        closeDetail();
        setFlash(message);
        setTimeout(() => setFlash(""), 4000);
        await load();
        onSettled?.();
    };

    const owed = rows.filter((r) => r.direction === "company_owes");
    const owes = rows.filter((r) => r.direction === "technician_owes");

    return (
        <div>
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

            {summary && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
                    <div className="cg-rich-dark text-white rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-1">
                            <ArrowUpRight className="w-4 h-4 text-white/60" />
                            <p className="text-sm font-medium text-white/60">To pay vendors</p>
                        </div>
                        <p className="text-2xl font-bold">Rs {summary.owedToTechniciansDisplay}</p>
                        <p className="text-xs text-white/50 mt-1">{owed.length} people</p>
                    </div>

                    <div className="cg-card p-5">
                        <div className="flex items-center gap-2 mb-1">
                            <ArrowDownLeft className="w-4 h-4 text-warn" />
                            <p className="text-sm font-medium text-ink-soft">To collect from vendors</p>
                        </div>
                        <p className="cg-h1">Rs {summary.owedByTechniciansDisplay}</p>
                        <p className="text-xs text-ink-faint mt-1">{owes.length} people, mostly cash jobs</p>
                    </div>

                    <div className="cg-card p-5">
                        <p className="text-sm font-medium text-ink-soft mb-1">Net position</p>
                        <p className="cg-h1">Rs {summary.netDisplay}</p>
                        <p className="text-xs text-ink-faint mt-1">After settling everything</p>
                    </div>

                    {/* Not money owed - money already taken, waiting for
                        someone to confirm the figure was right. It sits apart
                        from the other three for exactly that reason. */}
                    <div className={"rounded-xl border p-5 " + (summary.visitsPendingCount > 0 ? "bg-sunken border-hairline-strong" : "bg-white border-hairline")}>
                        <div className="flex items-center gap-2 mb-1">
                            <Footprints className={"w-4 h-4 " + (summary.visitsPendingCount > 0 ? "text-ink-soft" : "text-ink-faint")} />
                            <p className="text-sm font-medium text-ink-soft">Visit charges to check</p>
                        </div>
                        <p className="cg-h1">Rs {summary.visitsPendingDisplay}</p>
                        <p className="text-xs text-ink-faint mt-1">
                            {summary.visitsPendingCount > 0
                                ? summary.visitsPendingCount + " trip" + (summary.visitsPendingCount === 1 ? "" : "s") + ", nothing owed, just confirm the amount"
                                : "All checked"}
                        </p>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="cg-card p-4 h-20 animate-pulse" />
                    ))}
                </div>
            ) : rows.length === 0 ? (
                <div className="cg-card p-10 text-center">
                    <Wallet className="w-8 h-8 text-ink-faint mx-auto mb-2" />
                    <p className="font-semibold text-ink">
                        {search.trim() ? "No vendor matches that" : "Everything is settled"}
                    </p>
                    <p className="text-sm text-ink-soft mt-1">
                        {search.trim()
                            ? "Try part of their name, phone number or area."
                            : "Nothing to collect, and nothing to pay."}
                    </p>
                </div>
            ) : (
                <div className="space-y-6 pb-8">
                    {owes.length > 0 && (
                        <div>
                            <h2 className="text-xs font-bold text-ink-faint uppercase tracking-wide mb-2">
                                To collect from them ({owes.length})
                            </h2>
                            <div className="space-y-2">
                                {owes.map((r) => (
                                    <WalletRow key={r._id} row={r} onOpen={() => setSelectedId(r._id)} />
                                ))}
                            </div>
                        </div>
                    )}

                    {owed.length > 0 && (
                        <div>
                            <h2 className="text-xs font-bold text-ink-faint uppercase tracking-wide mb-2">
                                To pay them ({owed.length})
                            </h2>
                            <div className="space-y-2">
                                {owed.map((r) => (
                                    <WalletRow key={r._id} row={r} onOpen={() => setSelectedId(r._id)} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {selectedId && (
                <WalletDetail
                    technicianId={selectedId}
                    onClose={closeDetail}
                    onDone={handleDone}
                />
            )}
        </div>
    );
};

const WalletRow = ({ row, onOpen }) => {
    const companyOwes = row.direction === "company_owes";

    return (
        <button
            onClick={onOpen}
            className={"w-full text-left bg-white border rounded-xl p-4 hover:shadow-sm transition-all " + (row.settled ? "border-hairline hover:border-hairline-strong" : companyOwes ? "border-hairline hover:border-green-300" : "border-hairline hover:border-amber-300")}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="font-semibold text-ink text-sm truncate">{row.name}</p>
                    <div className="flex items-center gap-3 text-xs text-ink-soft mt-0.5 flex-wrap">
                        <span className="flex items-center gap-0.5">
                            <Phone className="w-3 h-3" /> {row.phone}
                        </span>
                        {row.area && (
                            <span className="flex items-center gap-0.5 truncate">
                                <MapPin className="w-3 h-3 shrink-0" /> {row.area}
                            </span>
                        )}
                        {/* An older technician record can predate the field entirely,
                            and a blank rate is worth seeing rather than hiding. */}
                        {Number.isFinite(row.commissionRate) ? (
                            <span className="text-ink-faint">{row.commissionRate}% commission</span>
                        ) : (
                            <span className="text-warn font-medium">No commission rate set</span>
                        )}
                        {row.visitsPending > 0 && (
                            <span className="flex items-center gap-0.5 text-ink-soft font-medium">
                                <Footprints className="w-3 h-3 shrink-0" />
                                Rs {row.visitsPendingDisplay} visit charge to check
                            </span>
                        )}
                        {/* Only on the ones we are holding money for. The
                            gateway settles the customer's payment to us a few
                            days later, so a fresh credit is not late - this
                            says which ones actually are. */}
                        {companyOwes && row.payoutDueOn && (
                            <span className={"flex items-center gap-0.5 font-medium " + (new Date(row.payoutDueOn) < new Date() ? "text-danger" : "text-ink-faint")}>
                                <CalendarClock className="w-3 h-3 shrink-0" />
                                {new Date(row.payoutDueOn) < new Date()
                                    ? "Due since " + shortDate(row.payoutDueOn)
                                    : "Send by " + shortDate(row.payoutDueOn)}
                            </span>
                        )}
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <p className={"text-lg font-bold " + (row.settled ? "text-ink-faint" : companyOwes ? "text-ink" : "text-warn")}>
                        Rs {row.balanceDisplay}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">
                        {row.settled
                            ? (row.visitsPending > 0 ? "Check visits" : "Settled")
                            : companyOwes ? "To pay" : "To collect"}
                    </p>
                </div>
            </div>
        </button>
    );
};

/* ================================================================== */
/* DETAIL - passbook plus settle actions                                */
/* ================================================================== */

const WalletDetail = ({ technicianId, onClose, onDone }) => {
    const { hasPermission } = useAdminAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [panel, setPanel] = useState(null); // payout | collect

    const canSettle = hasPermission("SETTLE_WALLET");

    const load = useCallback(async () => {
        try {
            const res = await api.get("/admin/wallets/" + technicianId);
            setData(res.data.data);
        } catch (err) {
            setError(getErrorMessage(err, "Could not load this wallet"));
        } finally {
            setLoading(false);
        }
    }, [technicianId]);

    useEffect(() => { load(); }, [load]);

    const companyOwes = (data?.balancePaise || 0) > 0;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-hairline px-5 py-4 flex items-center justify-between z-10">
                    <h2 className="font-bold text-ink">
                        {data?.technician?.name || "Wallet"}
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
                    ) : error ? (
                        <p className="text-sm text-danger">{error}</p>
                    ) : data ? (
                        <>
                            <div className={"rounded-2xl p-5 mb-5 " + (companyOwes ? "cg-rich-dark text-white" : "bg-warn-tint border border-hairline")}>
                                <p className={"text-sm font-medium " + (companyOwes ? "text-white/60" : "text-warn")}>
                                    {companyOwes ? "To pay them" : "To collect from them"}
                                </p>
                                <p className={"text-3xl font-bold mt-1 " + (companyOwes ? "text-white" : "text-warn")}>
                                    Rs {data.balanceDisplay}
                                </p>
                                <p className={"text-xs mt-2 pt-2 border-t " + (companyOwes ? "text-white/50 border-white/10" : "text-warn border-hairline")}>
                                    {companyOwes
                                        ? "Online jobs credit their share here. Send the money by bank transfer, then record it below. They get a WhatsApp with the reference."
                                        : "Cash jobs leave the commission with them. Collect it, then record it below."}
                                </p>
                            </div>

                            <div className="flex gap-2 mb-6">
                                {/* Recording a settlement moves real money, so it stays with
                                    the owner. Everyone else sees the numbers only. */}
                                {canSettle ? (
                                    companyOwes ? (
                                        <button
                                            onClick={() => setPanel("payout")}
                                            className="cg-btn cg-btn-go flex-1"
                                        >
                                            <ArrowUpRight className="w-4 h-4" />
                                            Record payout
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setPanel("collect")}
                                            className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 rounded-lg text-sm"
                                        >
                                            <ArrowDownLeft className="w-4 h-4" />
                                            {(data.balancePaise || 0) === 0 && data.visitsPending > 0
                                                ? "Check visit charges"
                                                : "Record collection"}
                                        </button>
                                    )
                                ) : (
                                    <div className="flex-1 flex items-center justify-center bg-sunken border border-hairline text-ink-soft py-2.5 rounded-lg text-sm">
                                        Settlement is done by the owner
                                    </div>
                                )}

                                <a
                                    href={"tel:" + data.technician?.phone}
                                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-ink border border-hairline rounded-lg hover:bg-sunken"
                                >
                                    <Phone className="w-4 h-4" />
                                    Call
                                </a>
                            </div>

                            {data.visitsPending > 0 && (
                                <div className="mb-5 rounded-xl border border-hairline-strong bg-sunken p-4">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Footprints className="w-4 h-4 text-ink-soft" />
                                        <p className="text-sm font-semibold text-ink">
                                            Rs {data.visitsPendingDisplay} of visit charges to check
                                        </p>
                                    </div>
                                    <p className="text-xs text-ink-soft">
                                        He already has this money and the company takes nothing on it.
                                        Confirm the amount is right and these get marked checked — his
                                        balance does not move.
                                    </p>
                                    <div className="mt-2 space-y-1">
                                        {data.visits.map((v) => (
                                            <div key={v.ticketNumber} className="flex justify-between text-xs">
                                                <span className="text-ink-soft">{v.ticketNumber}</span>
                                                <span className="font-semibold text-ink tabular-nums">Rs {v.amountDisplay}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <h3 className="text-xs font-bold text-ink-faint uppercase tracking-wide mb-2">
                                Passbook
                            </h3>

                            {data.transactions.length === 0 ? (
                                <p className="text-sm text-ink-soft py-4 text-center">No transactions yet.</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {data.transactions.map((t) => (
                                        <div key={t._id} className="flex items-start justify-between gap-3 py-2.5 border-b border-hairline last:border-0">
                                            <div className="min-w-0">
                                                <p className="text-sm text-ink">{t.description}</p>
                                                <p className="text-xs text-ink-faint mt-0.5">
                                                    {new Date(t.createdAt).toLocaleDateString("en-IN", {
                                                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                                                    })}
                                                    {t.ticket?.ticketNumber ? " · " + t.ticket.ticketNumber : ""}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className={"text-sm font-bold " + (t.type === "credit" ? "text-brand" : "text-danger")}>
                                                    {t.type === "credit" ? "+" : "-"} Rs {t.amountDisplay}
                                                </p>
                                                <p className="text-[10px] text-ink-faint">
                                                    Bal: Rs {t.balanceAfterDisplay}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : null}
                </div>
            </div>

            {panel && data && (
                <SettleDialog
                    mode={panel}
                    technicianId={technicianId}
                    technicianName={data.technician.name}
                    technicianPhone={data.technician.phone}
                    maxDisplay={data.balanceDisplay}
                    maxPaise={Math.abs(data.balancePaise)}
                    visitsPending={data.visitsPending || 0}
                    visitsPendingDisplay={data.visitsPendingDisplay}
                    onClose={() => setPanel(null)}
                    onDone={onDone}
                />
            )}
        </div>
    );
};

/* ================================================================== */
/* SETTLE - who, how, and the reference                                 */
/* ================================================================== */

/**
 * How the money reached the company - except for the last one.
 *
 * "Visit charge" moves nothing. The technician took it straight from the
 * customer and the company's cut of it is zero, so all the office does is
 * confirm the figure was right and the trips are marked checked. An earlier
 * version ran it through the balance like a real collection, which credited
 * him for money he was already holding and then offered to pay him out for
 * it. The balance is left alone now.
 */
const METHOD_OPTIONS = [
    { value: "Razorpay", label: "Razorpay" },
    { value: "UPI", label: "UPI" },
    { value: "Bank Transfer", label: "Bank Transfer" },
    { value: "Cash", label: "Cash at the office" },
    { value: "Visit charge", label: "Visit charge (just check the amount)" },
];

/** Nothing to quote for cash, and nothing to quote for a visit charge. */
const NO_REFERENCE = ["Cash", "Visit charge"];

const NEEDS_REFERENCE = ["Razorpay", "UPI", "Bank Transfer"];

const SettleDialog = ({ mode, technicianId, technicianName, technicianPhone, maxDisplay, maxPaise, visitsPending, visitsPendingDisplay, onClose, onDone }) => {
    const isPayout = mode === "payout";
    const [amount, setAmount] = useState((maxPaise / 100).toFixed(2));
    const [method, setMethod] = useState(isPayout ? "Bank Transfer" : "Razorpay");
    const [reference, setReference] = useState("");
    const [refEdited, setRefEdited] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    // A Razorpay id is eighteen characters of noise. Offer the real ones off
    // this technician's own record instead of asking anyone to retype one.
    const [refs, setRefs] = useState([]);
    const [refsLoading, setRefsLoading] = useState(true);

    // The jobs the money is for, and which of them this settlement covers
    const [jobs, setJobs] = useState([]);
    const [chosenJobs, setChosenJobs] = useState([]);
    // Starts true because the background sync is fired the moment this
    // dialog opens - there is no moment when it is mounted and not syncing.
    const [syncing, setSyncing] = useState(true);

    // Asking Razorpay before writing anything, rather than after
    const [checking, setChecking] = useState(false);
    const [checked, setChecked] = useState(null);
    const [checkError, setCheckError] = useState("");


    useEffect(() => {
        let cancelled = false;
        const apply = (res) => {
            if (cancelled) return;
            setRefs(res.data.data || []);
            setJobs(res.data.jobs || []);
        };

        // Our own records first, so the dialog opens straight away. Asking
        // Razorpay for anything he has paid that never reached us takes about
        // three seconds, which is far too long to sit in front of a dialog -
        // so it runs behind and fills the list in when it answers.
        api.get("/admin/wallets/" + technicianId + "/references")
            .then(apply)
            .catch(() => { if (!cancelled) { setRefs([]); setJobs([]); } })
            .finally(() => { if (!cancelled) setRefsLoading(false); });

        api.get("/admin/wallets/" + technicianId + "/references", { params: { sync: 1 } })
            .then(apply)
            .catch(() => {})
            .finally(() => { if (!cancelled) setSyncing(false); });

        return () => { cancelled = true; };
    }, [technicianId]);

    // Every recent Razorpay payment on this technician, whichever kind it is:
    // a due he cleared, a customer's online payment, the company's half of a
    // split. Narrowing the list to one kind meant that when no settlement
    // existed it quietly fell back to a customer's job payment - a reference
    // for a different ticket, carrying a different amount.
    //
    // Ones already in the ledger stay on the list but cannot be picked.
    // Hiding them made a reference the office can see in the passbook look as
    // though it had never arrived at all.
    const pool = refs;

    const isVisitCheck = method === "Visit charge";
    const needsReference = NEEDS_REFERENCE.includes(method) && !NO_REFERENCE.includes(method);

    const amountPaise = Math.round(Number(amount) * 100);

    // The reference the office would otherwise have to ring the technician
    // and ask for. A settlement IS him paying us, so the newest one not yet
    // in the ledger is the one being recorded, and it fills itself in.
    //
    // A customer's job payment is never offered this way. Picking one of
    // those by accident is what put a Rs 799 bill into a Rs 269.70
    // collection - they stay on the list to be read, not to be defaulted to.
    const unrecorded = pool.filter((r) => !r.alreadyRecorded);
    const pendingSettlement = unrecorded.find((r) => r.kind === "settlement");
    const autoReference = method === "Razorpay" && pendingSettlement ? pendingSettlement.reference : "";
    const value = refEdited ? reference : autoReference;

    // The reference in the box, when it is one of his own payments
    const chosen = pool.find((r) => r.reference === value.trim()) || null;
    const amountMismatch = chosen && Number.isFinite(amountPaise) && chosen.gatewayPaise !== amountPaise;

    const editReference = (next) => {
        setReference(next);
        setRefEdited(true);
        setError("");
        setChecked(null);
        setCheckError("");
    };

    const runCheck = async () => {
        setChecking(true);
        setCheckError("");
        try {
            const res = await api.post("/admin/payments/check-reference", {
                reference: value.trim(),
                expectPaise: Number.isFinite(amountPaise) && amountPaise > 0 ? amountPaise : undefined,
            });
            setChecked(res.data.data);
        } catch (err) {
            setCheckError(getErrorMessage(err, "Could not check this reference"));
        } finally {
            setChecking(false);
        }
    };

    const confirmed = Boolean(checked?.captured && checked?.amountsAgree);

    const toggleJob = (job) => {
        if (job.settled) return;
        const next = chosenJobs.includes(job.ticketNumber)
            ? chosenJobs.filter((t) => t !== job.ticketNumber)
            : [...chosenJobs, job.ticketNumber];

        setChosenJobs(next);
        setError("");

        // Picking the jobs is the same act as saying how much - the amount is
        // the commission on them, not a number to be typed a second time.
        if (next.length) {
            const total = jobs
                .filter((j) => next.includes(j.ticketNumber))
                .reduce((n, j) => n + (j.commissionPaise || 0), 0);
            setAmount((total / 100).toFixed(2));
        }
    };

    const handleSubmit = async () => {
        const rupees = Number(amount);
        if (!Number.isFinite(rupees) || rupees <= 0) {
            setError("Enter a valid amount");
            return;
        }
        if (needsReference && value.trim().length < 3) {
            setError("Enter the " + method + " reference so this can be traced later");
            return;
        }

        setSubmitting(true);
        setError("");

        try {
            if (isPayout) {
                await api.post("/admin/technicians/payout", {
                    technicianId,
                    amountPaise: Math.round(rupees * 100),
                    referenceNote: method + (value.trim() ? " " + value.trim() : ""),
                });
                onDone("Paid Rs " + rupees.toFixed(2) + " to " + technicianName);
            } else {
                await api.post("/admin/wallets/" + technicianId + "/collect", {
                    amountPaise: Math.round(rupees * 100),
                    method,
                    referenceNote: value.trim(),
                    ticketNumbers: chosenJobs,
                });
                onDone(isVisitCheck
                    ? "Checked Rs " + rupees.toFixed(2) + " of visit charges for " + technicianName
                    : "Collected Rs " + rupees.toFixed(2) + " from " + technicianName);
            }
        } catch (err) {
            setError(getErrorMessage(err, "Could not record this"));
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto p-6">
                <h3 className="font-bold text-ink mb-1">
                    {isPayout ? "Record a payout" : "Record a collection"}
                </h3>
                <p className="text-sm text-ink-soft mb-4">
                    {isPayout
                        ? "Send the money first, then record it here. This only updates the ledger."
                        : "Take the money first, then record it here."}
                </p>

                {/* 1 - who */}
                <p className="text-[11px] font-bold text-ink-faint uppercase tracking-wider mb-1.5">
                    Vendor
                </p>
                <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-sunken border border-hairline rounded-lg mb-4">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{technicianName}</p>
                        {technicianPhone && <p className="text-xs text-ink-soft">{technicianPhone}</p>}
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-[10px] text-ink-faint uppercase tracking-wide">
                            {isPayout ? "To pay" : "To collect"}
                        </p>
                        <p className="text-sm font-bold text-ink">Rs {maxDisplay}</p>
                    </div>
                </div>

                {/* 2 - how much */}
                <label className="block text-[11px] font-bold text-ink-faint uppercase tracking-wider mb-1.5">
                    Amount (Rs)
                </label>
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setError(""); }}
                    className="cg-input mb-4"
                />

                {/* 2b - which jobs. A settlement arrives as a bare amount
                    with no idea which work it covers; matching it to the
                    tickets here is what makes the ledger row mean something
                    in a month's time. Picking them sets the amount, because
                    the amount IS the commission on them. */}
                {!isPayout && !isVisitCheck && (
                    refsLoading ? (
                        <div className="h-24 bg-sunken border border-hairline rounded-lg animate-pulse mb-4" />
                    ) : jobs.length > 0 ? (
                        <div className="mb-4">
                            <label className="block text-[11px] font-bold text-ink-faint uppercase tracking-wider mb-1.5">
                                Which jobs is this for?
                            </label>
                            <div className="border border-hairline rounded-lg overflow-hidden">
                                <div className="max-h-44 overflow-y-auto">
                                    {jobs.map((j) => {
                                        const on = chosenJobs.includes(j.ticketNumber);
                                        return (
                                            <div
                                                key={j.ticketNumber}
                                                role="button"
                                                tabIndex={j.settled ? -1 : 0}
                                                aria-disabled={j.settled}
                                                onClick={() => toggleJob(j)}
                                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggleJob(j); }}
                                                className={"px-3 py-2.5 border-b border-hairline last:border-b-0 flex items-center gap-3 " + (j.settled ? "opacity-50 cursor-not-allowed bg-sunken" : "cursor-pointer hover:bg-sunken ") + (on ? "bg-brand-tint" : "")}
                                            >
                                                <span className={"w-4 h-4 shrink-0 rounded border flex items-center justify-center " + (on ? "bg-brand border-green-700" : "border-hairline-strong bg-white")}>
                                                    {on && <CheckCircle2 className="w-3 h-3 text-white" />}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-semibold text-ink truncate">
                                                        {j.ticketNumber}
                                                        {j.invoiceNumber ? " · " + j.invoiceNumber : ""}
                                                    </p>
                                                    <p className="text-[11px] text-ink-faint">
                                                        {j.method} · bill Rs {j.billDisplay} ·{" "}
                                                        {new Date(j.closedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                                        {j.settled ? " · already settled" : ""}
                                                    </p>
                                                </div>
                                                <span className="text-xs font-bold text-ink shrink-0 tabular-nums">
                                                    Rs {j.commissionDisplay}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <p className="text-[11px] text-ink-faint mt-1.5">
                                {chosenJobs.length > 0
                                    ? chosenJobs.length + " job" + (chosenJobs.length === 1 ? "" : "s")
                                      + " selected — the amount above is their commission"
                                    : "Tap the jobs this money clears. Cash jobs only — online and split settle themselves."}
                            </p>
                        </div>
                    ) : null
                )}

                {/* 3 - how */}
                <label className="block text-[11px] font-bold text-ink-faint uppercase tracking-wider mb-1.5">
                    How was it {isPayout ? "sent" : "received"}?
                </label>
                <div className="mb-4">
                    <CustomDropdown
                        value={method}
                        onChange={(val) => {
                            setMethod(val);
                            setError("");
                            // The figure is not a judgement call - it is the
                            // total of the trips waiting to be checked.
                            if (val === "Visit charge" && visitsPending > 0) {
                                setAmount(visitsPendingDisplay);
                            }
                        }}
                        options={METHOD_OPTIONS.filter((o) => o.value !== "Visit charge" || visitsPending > 0)}
                        placeholder="Select method..."
                    />
                </div>

                {isVisitCheck && (
                    <div className="p-3 bg-sunken border border-hairline rounded-lg mb-4">
                        <p className="text-xs text-ink">
                            {visitsPending} trip{visitsPending === 1 ? "" : "s"} at Rs {visitsPendingDisplay}.
                            The vendor already has this money and the company takes nothing on it —
                            saving here only marks the amount as checked. His balance does not move.
                        </p>
                    </div>
                )}

                {/* 4 - the reference */}
                {!isVisitCheck && (
                    <>
                        <label className="block text-[11px] font-bold text-ink-faint uppercase tracking-wider mb-1.5">
                            UTR / transaction reference
                            {!needsReference && <span className="normal-case font-medium text-ink-faint"> — not needed for cash</span>}
                        </label>
                        <input
                            type="text"
                            value={value}
                            onChange={(e) => editReference(e.target.value)}
                            disabled={!needsReference}
                            placeholder={method === "Razorpay" ? "pay_xxxxxxxxxxxx" : "e.g. UTR 412345678901"}
                            className="cg-input font-mono disabled:bg-sunken disabled:text-ink-faint"
                        />
                    </>
                )}

                {needsReference && !isVisitCheck && (
                    refsLoading ? (
                        <div className="mt-3 h-16 bg-sunken border border-hairline rounded-lg animate-pulse" />
                    ) : pool.length > 0 ? (
                        <div className="mt-3 border border-hairline rounded-lg overflow-hidden">
                            <p className="px-3 py-2 bg-sunken border-b border-hairline text-[11px] font-semibold text-ink-soft uppercase tracking-wider">
                                Recent Razorpay payments · tap to use
                                {syncing && <span className="ml-2 font-normal normal-case tracking-normal text-ink-faint">checking Razorpay…</span>}
                            </p>
                            <div className="max-h-40 overflow-y-auto">
                                {pool.map((r) => {
                                    const isPicked = value.trim() === r.reference;
                                    const spent = r.alreadyRecorded;
                                    return (
                                        <div
                                            key={r.reference}
                                            role="button"
                                            tabIndex={spent ? -1 : 0}
                                            aria-disabled={spent}
                                            onClick={() => { if (!spent) editReference(r.reference); }}
                                            onKeyDown={(e) => { if (!spent && (e.key === "Enter" || e.key === " ")) editReference(r.reference); }}
                                            className={"w-full text-left px-3 py-2.5 border-b border-hairline last:border-b-0 " + (spent ? "opacity-50 cursor-not-allowed bg-sunken" : "cursor-pointer hover:bg-sunken ") + (isPicked ? "bg-brand-tint" : "")}
                                        >
                                            <div className="flex items-baseline justify-between gap-3">
                                                <CopyText
                                                    value={r.reference}
                                                    className="text-ink min-w-0"
                                                    textClass="text-xs font-mono"
                                                    title="Copy this reference"
                                                />
                                                {/* What the gateway actually took. On a split
                                                    that is the company's half, not the bill -
                                                    confusing the two is how the wrong figure
                                                    gets recorded against the right id. */}
                                                <span className="text-xs font-semibold text-ink shrink-0 tabular-nums">
                                                    Rs {r.gatewayDisplay}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-ink-faint">
                                                <span className="truncate">
                                                    {r.label}
                                                    {r.ticketNumber ? " · " + r.ticketNumber : ""}
                                                    {r.billDisplay ? " · bill Rs " + r.billDisplay : ""}
                                                </span>
                                                {spent ? (
                                                    <span className="font-semibold ml-auto shrink-0">Already recorded</span>
                                                ) : isPicked ? (
                                                    <span className="text-brand font-semibold ml-auto shrink-0">Using this</span>
                                                ) : null}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-ink-faint mt-2">
                            No Razorpay payments on this vendor yet — type the reference by hand.
                        </p>
                    )
                )}

                {/* Ask the gateway before writing anything. A reference that
                    looks right and a reference that was actually captured are
                    indistinguishable on screen until somebody checks. */}
                {needsReference && !isVisitCheck && (
                    <div className="mt-3">
                        <button
                            type="button"
                            onClick={runCheck}
                            disabled={checking || value.trim().length < 6}
                            className="flex items-center gap-1.5 px-3 py-2 bg-ink hover:bg-black disabled:opacity-40 text-white text-xs font-semibold rounded-lg"
                        >
                            {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SearchCheck className="w-3.5 h-3.5" />}
                            {checking ? "Checking with Razorpay" : checked || checkError ? "Check again" : "Check with Razorpay"}
                        </button>

                        {checkError && (
                            <p className="mt-2 text-xs text-danger flex items-start gap-1.5">
                                <XCircle className="w-3.5 h-3.5 shrink-0 mt-px" /> {checkError}
                            </p>
                        )}

                        {checked && (
                            <p className={"mt-2 text-xs font-medium flex items-start gap-1.5 " + (confirmed ? "text-brand" : "text-warn")}>
                                {confirmed
                                    ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-px" />
                                    : <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />}
                                <span>
                                    Rs {checked.amountDisplay} · {checked.status}
                                    {checked.methodUsed ? " · " + checked.methodUsed : ""}
                                    {!checked.amountsAgree ? " — not the amount you are recording" : ""}
                                </span>
                            </p>
                        )}

                    </div>
                )}

                {/* The reference is for a real payment of his, but not for
                    this money. Worth saying out loud rather than leaving the
                    office to compare two numbers by eye. */}
                {amountMismatch && (
                    <div className="mt-3 p-3 bg-warn-tint border border-hairline rounded-lg text-xs text-warn">
                        This reference is <span className="font-semibold">Rs {chosen.gatewayDisplay}</span>
                        {chosen.ticketNumber ? " for " + chosen.ticketNumber : ""} — you are recording{" "}
                        <span className="font-semibold">Rs {(amountPaise / 100).toFixed(2)}</span>. Check you have
                        the right one before saving.
                    </div>
                )}

                {error && (
                    <div className="mt-3 p-3 bg-danger-tint border border-hairline rounded-lg text-sm text-danger">
                        {error}
                    </div>
                )}

                <div className="flex gap-2 mt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-ink border border-hairline rounded-lg hover:bg-sunken"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className={"flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 rounded-lg " + (isPayout ? "bg-brand hover:bg-brand-deep" : "bg-amber-600 hover:bg-amber-700")}
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isVisitCheck ? "Mark checked" : "Record it"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WalletsPanel;
