import { useState, useEffect } from "react";
import { api, getErrorMessage } from "../../services/api";
import { techSocket } from "../../services/socket";
import RouteToCustomer from "./RouteToCustomer";
import CustomDropdown from "../../ui/CustomDropdown";
import PaymentWaitTimer from "../../ui/PaymentWaitTimer";
import RefusalPanel from "./RefusalPanel";
import {
    Phone, MapPin, AlertTriangle, X, Loader2, Plus, Trash2,
    Receipt, CheckCircle2, RefreshCw, Copy, Minus, Banknote, Smartphone,
    Briefcase, Split, Pencil, ThumbsDown,
} from "lucide-react";

const rupees = (paise) => (Number(paise || 0) / 100).toFixed(2);

const ActiveJobCard = ({ ticket, onUpdate, techPos, visitChargePaise }) => {
    const [panel, setPanel] = useState(null);
    const [error, setError] = useState("");
    const [startingWork, setStartingWork] = useState(false);

    if (!ticket) {
        return (
            <div className="cg-card p-10 lg:p-20 text-center">
                <Briefcase className="w-8 h-8 text-ink-faint mx-auto mb-2" />
                <p className="font-semibold text-ink">No active job</p>
                <p className="text-sm text-ink-soft mt-1">New jobs will appear here once assigned.</p>
            </div>
        );
    }

    const customer = ticket.customerSnapshot || {};

    // On a split the technician still takes cash - just his own share rather
    // than the whole bill - so the same "cash received" step applies.
    // Nothing else on this card is actionable while the office is deciding,
    // or once they have said the customer will not go ahead.
    const onHold = ticket.refusal?.status === "awaiting_verification"
        || (ticket.refusal?.status === "customer_declined" && !ticket.refusal?.visitChargeBilled);

    const method = ticket.payment?.method;
    const isSplit = method === "split";
    const isCashInvoice = method === "cash" || isSplit;

    const startWork = async () => {
        setError("");
        setStartingWork(true);
        try {
            await api.post("/technician/tickets/" + ticket._id + "/start-work");
            await onUpdate();
        } catch (err) {
            setError(getErrorMessage(err, "Could not start work"));
        } finally {
            // Always cleared, even on success. The refetch normally brings the
            // ticket back as "In progress" and this button disappears anyway -
            // but if that refetch fails, clearing here is what stops the button
            // spinning for ever with no way back.
            setStartingWork(false);
        }
    };

    const statusLabel =
        ticket.status === "Payment-Pending" ? "Awaiting payment"
            : ticket.status === "In-Progress" ? "In progress"
                : ticket.status;

    return (
        /* Bento layout: each piece of the job is its own tile on a recessed
           ground, sized by how much attention it deserves. The previous card
           was two hard-divided columns, which forced the problem text and the
           customer block to be the same height whatever they contained. */
        <div className="bg-sunken/70 rounded-2xl border border-hairline p-2.5 sm:p-3">
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-2.5 sm:gap-3">

                {/* Header tile */}
                <div className="lg:col-span-6 bg-white rounded-xl border border-hairline px-4 py-3.5 sm:px-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[11px] font-bold text-info bg-info-tint px-2.5 py-1 rounded-full uppercase tracking-wide shrink-0">
                            {statusLabel}
                        </span>
                        <span className="text-sm sm:text-base font-semibold text-ink truncate">
                            {ticket.serviceLabel}
                        </span>
                    </div>
                    <span className="text-xs font-mono text-ink-faint shrink-0">{ticket.ticketNumber}</span>
                </div>

                {/* Money tile - only while there is money outstanding, and
                    given its own colour so it cannot be skimmed past */}
                {ticket.status === "Payment-Pending" && (
                    <div className={"lg:col-span-6 rounded-xl border px-4 py-3.5 sm:px-5 " + (isCashInvoice ? "bg-warn-tint border-hairline" : "bg-purple-50 border-purple-200")}>
                        {/* A split has two halves, and the headline number has
                            to be the one this technician is actually holding -
                            not the whole bill, most of which is not his. */}
                        <p className={"text-sm sm:text-base font-semibold " + (isCashInvoice ? "text-warn" : "text-info")}>
                            {isSplit
                                ? "Your share — Rs " + rupees(ticket.payment?.split?.technicianCashPaise)
                                : (isCashInvoice ? "Collect cash" : "Invoice sent") + " — Rs " + rupees(ticket.billing?.totalPaise)}
                        </p>
                        <p className={"text-xs mt-0.5 " + (isCashInvoice ? "text-warn" : "text-purple-600")}>
                            {ticket.billing?.invoiceNumber}
                            {isSplit
                                ? " · bill Rs " + rupees(ticket.billing?.totalPaise) +
                                  (ticket.payment?.split?.onlinePaidAt
                                      ? " · office paid, take your cash"
                                      : " · waiting for Rs " + rupees(ticket.payment?.split?.companyOnlinePaise) + " online")
                                : isCashInvoice
                                    ? " · take the cash, then confirm"
                                    : " · waiting for the customer to pay"}
                        </p>
                    </div>
                )}

                {/* The job - the widest tile, because it is the thing being read */}
                <div className="lg:col-span-4 bg-white rounded-xl border border-hairline p-4 sm:p-5">
                    <p className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider mb-2">
                        What's wrong
                    </p>
                    <p className="text-sm sm:text-base text-ink leading-relaxed">
                        {ticket.problemDescription || "No description provided"}
                    </p>

                    {ticket.selectedIssues?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                            {ticket.selectedIssues.map((issue, i) => (
                                <span key={i} className="text-xs bg-sunken text-ink px-2.5 py-1 rounded-full">
                                    {issue}
                                </span>
                            ))}
                        </div>
                    )}

                    {ticket.billing?.workDone && (
                        <div className="mt-4 pt-4 border-t border-hairline">
                            <p className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider mb-1.5">
                                Work you recorded
                            </p>
                            <p className="text-sm text-ink">{ticket.billing.workDone}</p>
                        </div>
                    )}
                </div>

                {/* Customer - narrow tile, and it no longer has to stretch to
                    match the height of the problem text beside it */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-hairline p-4 sm:p-5 flex flex-col">
                    <p className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider mb-2">
                        Customer
                    </p>

                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="font-semibold text-ink text-sm sm:text-base truncate">
                                {customer.name || "Name not available"}
                            </p>
                            {customer.phone && (
                                <p className="text-xs text-ink-soft mt-0.5">{customer.phone}</p>
                            )}
                        </div>
                        {customer.phone && (
                            <a
                                href={"tel:" + customer.phone}
                                className="cg-btn cg-btn-go shrink-0 p-2.5 rounded-full"
                                aria-label={"Call " + (customer.name || "the customer")}
                            >
                                <Phone className="w-4 h-4" />
                            </a>
                        )}
                    </div>

                    <div className="flex items-start gap-2 mt-4 pt-4 border-t border-hairline">
                        <MapPin className="w-4 h-4 text-ink-faint shrink-0 mt-0.5" />
                        <p className="text-sm text-ink leading-relaxed">
                            {customer.address || customer.area || "No address on file"}
                            {customer.landmark && (
                                <span className="block text-xs text-ink-faint mt-0.5">Near {customer.landmark}</span>
                            )}
                        </p>
                    </div>
                </div>

                {/* Route - full width, because a road is unreadable in a
                    two-of-six column strip */}
                <div className="lg:col-span-6 bg-white rounded-xl border border-hairline p-4 sm:p-5">
                    <RouteToCustomer ticket={ticket} techPos={techPos} />
                </div>

                {error && (
                    <div className="lg:col-span-6 p-3.5 bg-danger-tint border border-hairline rounded-xl text-sm text-danger">
                        {error}
                    </div>
                )}

                {/* A refusal being checked by the office outranks everything
                    else on this card - it is the thing he is standing there
                    waiting on. */}
                <RefusalPanel
                    ticket={{ ...ticket, visitChargePaise }}
                    onUpdate={onUpdate}
                    onError={setError}
                />

                {/* Actions last on both sizes - everything above is what the
                    technician reads before deciding to press anything */}
                <div className="lg:col-span-6 bg-white rounded-xl border border-hairline p-3 sm:p-4 flex flex-wrap gap-2">
                    <JobActions
                        ticket={ticket}
                        isCashInvoice={isCashInvoice}
                        startWork={startWork}
                        startingWork={startingWork}
                        setPanel={setPanel}
                        onHold={onHold}
                    />
                </div>
            </div>

            {panel === "release" && (
                <ReleaseModal ticket={ticket} onClose={() => setPanel(null)} onDone={() => { setPanel(null); onUpdate(); }} onError={setError} />
            )}
            {(panel === "bill" || panel === "edit") && (
                <BillModal
                    ticket={ticket}
                    isEdit={panel === "edit"}
                    onClose={() => setPanel(null)}
                    onDone={() => { setPanel(null); onUpdate(); }}
                    onError={setError}
                />
            )}
            {panel === "cash" && (
                <CashModal ticket={ticket} onClose={() => setPanel(null)} onDone={() => { setPanel(null); onUpdate(); }} onError={setError} />
            )}
            {panel === "payment" && (
                <PaymentStatusModal ticket={ticket} onClose={() => setPanel(null)} onDone={() => { setPanel(null); onUpdate(); }} />
            )}
        </div>
    );
};

/**
 * Rendered twice - once per breakpoint - because the buttons belong in
 * different columns on desktop and mobile. Keeping them in one component
 * means a change to any action only has to be made once.
 */
const JobActions = ({ ticket, isCashInvoice, startWork, startingWork, setPanel, onHold }) => (
    <>
        {onHold ? (
            <p className="w-full text-center text-sm text-ink-soft py-2">
                Waiting on the office — nothing else to do on this job right now.
            </p>
        ) : (
        <>
        {ticket.status === "Assigned" && (
            <button
                onClick={startWork}
                disabled={startingWork}
                className="cg-btn cg-btn-go flex-1 min-w-[160px] py-3"
            >
                {/* On a phone in a stairwell this call can take a couple of
                    seconds. Without a spinner the button looks dead and gets
                    pressed again. */}
                {startingWork && <Loader2 className="w-4 h-4 animate-spin" />}
                {startingWork ? "Starting..." : "I've started work"}
            </button>
        )}

        {ticket.status === "In-Progress" && (
            <button
                onClick={() => setPanel("bill")}
                className="flex-1 min-w-[160px] flex items-center justify-center gap-2 bg-ink hover:bg-black text-white font-semibold py-3 rounded-lg text-sm"
            >
                <Receipt className="w-4 h-4" />
                Generate invoice
            </button>
        )}

        {ticket.status === "Payment-Pending" && isCashInvoice && (
            <button
                onClick={() => setPanel("cash")}
                className="cg-btn cg-btn-go flex-1 min-w-[160px] py-3"
            >
                <Banknote className="w-4 h-4" />
                Cash received
            </button>
        )}

        {ticket.status === "Payment-Pending" && !isCashInvoice && (
            <button
                onClick={() => setPanel("payment")}
                className="cg-btn cg-btn-go flex-1 min-w-[160px] py-3"
            >
                <CheckCircle2 className="w-4 h-4" />
                Check payment
            </button>
        )}

        {/* A bill can be corrected right up until the money moves. Before
            this the technician had to phone the office with the customer
            standing next to him. */}
        {ticket.status === "Payment-Pending" && ticket.payment?.status === "Pending" && (
            <button
                onClick={() => setPanel("edit")}
                className="flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium text-ink border border-hairline rounded-lg hover:bg-sunken"
            >
                <Pencil className="w-4 h-4" />
                Correct the bill
            </button>
        )}

        {(ticket.status === "Assigned" || ticket.status === "In-Progress") && (
            <button
                onClick={() => setPanel("release")}
                className="flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium text-danger border border-hairline rounded-lg hover:bg-danger-tint"
            >
                <X className="w-4 h-4" />
                Can't do this job
            </button>
        )}
        </>
        )}
    </>
);

/* ================= RELEASE ================= */

/**
 * Handing a job back is two different events wearing one name.
 *
 * "I cannot do this job" belongs back in the office queue for someone else.
 * "The customer heard the price and said no" does not - sending a second
 * technician to a customer who has already refused burns another trip for
 * nothing, which is exactly what used to happen because both answers left
 * the ticket sitting in Pending looking like a fresh request.
 */
const CANNOT_DO_REASONS = [
    { value: "Location is too far", label: "Location is too far" },
    { value: "Customer is not responding", label: "Customer is not responding" },
    { value: "Vehicle breakdown / Traffic", label: "Vehicle breakdown / Traffic" },
    { value: "Missing spare parts", label: "Missing spare parts" },
    { value: "Other", label: "Other" },
];

const REFUSED_REASONS = [
    { value: "Price is too high for the customer", label: "Price is too high for them" },
    { value: "Customer will get it done elsewhere", label: "Getting it done elsewhere" },
    { value: "Customer changed their mind", label: "Changed their mind" },
    { value: "Customer wants to think about it", label: "Wants to think about it" },
    { value: "Other", label: "Other" },
];

const ReleaseModal = ({ ticket, onClose, onDone, onError }) => {
    const [outcome, setOutcome] = useState(null); // cannot_do | customer_refused
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const refused = outcome === "customer_refused";

    const choose = (next) => {
        setOutcome(next);
        setReason("");
    };

    const handleSubmit = async () => {
        if (reason.trim().length < 5) return;
        setSubmitting(true);
        onError("");
        try {
            // A refusal keeps him on site while the office rings the
            // customer; anything else hands the job back to the queue.
            await api.post(
                "/technician/tickets/" + ticket._id + (refused ? "/refuse" : "/release"),
                refused ? { reason: reason.trim() } : { reason: reason.trim(), outcome }
            );
            onDone();
        } catch (err) {
            onError(getErrorMessage(err, "Could not release this job"));
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-5 h-5 text-danger" />
                    <h3 className="font-bold text-ink">Leaving this job</h3>
                </div>

                {!outcome ? (
                    <>
                        <p className="text-sm text-ink-soft mb-4">
                            What happened? The office handles these two very differently.
                        </p>
                        <div className="space-y-2">
                            <button
                                onClick={() => choose("customer_refused")}
                                className="w-full text-left p-3.5 border-2 border-hairline rounded-xl hover:border-amber-400 hover:bg-warn-tint/50"
                            >
                                <span className="flex items-center gap-2 font-semibold text-ink text-sm">
                                    <ThumbsDown className="w-4 h-4 text-warn" />
                                    The customer said no
                                </span>
                                <span className="block text-xs text-ink-soft mt-1">
                                    They heard the price and refused. Wait there — the office will
                                    call them.
                                </span>
                            </button>

                            <button
                                onClick={() => choose("cannot_do")}
                                className="w-full text-left p-3.5 border-2 border-hairline rounded-xl hover:border-hairline-strong hover:bg-sunken"
                            >
                                <span className="flex items-center gap-2 font-semibold text-ink text-sm">
                                    <X className="w-4 h-4 text-ink-soft" />
                                    I can't do this job
                                </span>
                                <span className="block text-xs text-ink-soft mt-1">
                                    Goes back to the office so they can send someone else.
                                </span>
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full mt-4 px-4 py-2.5 text-sm font-medium text-ink border border-hairline rounded-lg hover:bg-sunken"
                        >
                            Keep job
                        </button>
                    </>
                ) : (
                    <>
                        <p className="text-sm text-ink-soft mb-4">
                            {refused
                                ? "The office will ring the customer while you wait there. If they change their mind you carry straight on."
                                : "This job goes back to the office queue. They'll reassign it or contact the customer."}
                        </p>

                        <CustomDropdown
                            value={reason}
                            onChange={(val) => setReason(val)}
                            options={refused ? REFUSED_REASONS : CANNOT_DO_REASONS}
                            placeholder="Select a reason..."
                        />

                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => setOutcome(null)}
                                className="flex-1 px-4 py-2.5 text-sm font-medium text-ink border border-hairline rounded-lg hover:bg-sunken"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={reason.trim().length < 5 || submitting}
                                className={"flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 rounded-lg " + (refused ? "bg-amber-600 hover:bg-amber-700" : "bg-red-600 hover:bg-red-700")}
                            >
                                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                {refused ? "Tell the office" : "Release job"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

/* ================= INVOICE ================= */

const CATEGORY_ORDER = ["labour", "service", "part"];
const CATEGORY_LABELS = { labour: "Service charge", service: "Add-on services", part: "Parts" };

const SERVICES = [
    { key: "AC_APPLIANCE", label: "AC & Appliance Repair" },
    { key: "ELECTRICAL", label: "Electrical Issues" },
    { key: "PLUMBING", label: "Plumbing Services" },
    { key: "CARPENTRY", label: "Carpentry Services" },
    { key: "PEST_CONTROL", label: "Pest Control" },
    { key: "CLEANING", label: "Home Cleaning" },
    { key: "PAINTING", label: "Painting Services" }
];

const BillModal = ({ ticket, isEdit = false, onClose, onDone, onError }) => {
    const existing = ticket.billing || {};
    const [selectedServiceKey, setSelectedServiceKey] = useState(ticket.serviceKey);
    const [catalog, setCatalog] = useState([]);
    const [selected, setSelected] = useState({});
    const [customItems, setCustomItems] = useState([]);
    const [workDone, setWorkDone] = useState(isEdit ? (existing.workDone || "") : "");
    const [paymentMethod, setPaymentMethod] = useState(isEdit ? (ticket.payment?.method || "online") : "online");
    const [editReason, setEditReason] = useState("");
    const [commissionPercent, setCommissionPercent] = useState(null);
    const [editLimit, setEditLimit] = useState(3);
    const [onlineAvailable, setOnlineAvailable] = useState(true);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");
    const [showCustom, setShowCustom] = useState(false);
    const [activeAppliance, setActiveAppliance] = useState("");

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await api.get("/technician/pricing", { params: { serviceKey: selectedServiceKey } });
                setCatalog(res.data.data);
                setOnlineAvailable(res.data.onlinePaymentAvailable !== false);
                setCommissionPercent(res.data.commissionPercent ?? null);
                setEditLimit(res.data.billEditLimit ?? 3);
                if (res.data.onlinePaymentAvailable === false && !isEdit) setPaymentMethod("cash");

                if (isEdit) {
                    // Put the bill they are correcting back exactly as it was,
                    // catalogue lines as catalogue lines - retyping a priced
                    // item as free text would let the price be edited too.
                    const picked = {};
                    const extras = [];
                    (existing.lineItems || []).forEach((l) => {
                        if (l.catalogItemId) picked[l.catalogItemId] = l.qty || 1;
                        else extras.push({ description: l.description, amountRupees: String((l.amountPaise || 0) / 100) });
                    });
                    setSelected(picked);
                    setCustomItems(extras);
                    if (extras.length) setShowCustom(true);
                    return;
                }

                // Pre-select whatever the office marked as always-billed
                const defaults = {};
                res.data.data.filter((i) => i.isDefault).forEach((i) => { defaults[i._id] = 1; });
                setSelected(defaults);
            } catch (err) {
                setFormError(getErrorMessage(err, "Could not load the price list"));
            } finally {
                setLoading(false);
            }
        };
        load();
        // The bill being corrected does not change while this modal is open,
        // so it is read once rather than tracked.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedServiceKey]);

    const toggleItem = (id) => {
        setSelected((prev) => {
            const next = { ...prev };
            if (next[id]) delete next[id];
            else next[id] = 1;
            return next;
        });
    };

    const changeQty = (id, delta) => {
        setSelected((prev) => ({ ...prev, [id]: Math.max(1, Math.min(20, (prev[id] || 1) + delta)) }));
    };

    const addCustomItem = () => setCustomItems([...customItems, { description: "", amountRupees: "" }]);
    const removeCustomItem = (i) => setCustomItems(customItems.filter((_, idx) => idx !== i));
    const updateCustomItem = (i, field, value) => {
        const next = [...customItems];
        next[i][field] = value;
        setCustomItems(next);
    };

    const catalogTotal = Object.entries(selected).reduce((sum, [id, qty]) => {
        const item = catalog.find((c) => c._id === id);
        return sum + (item ? (item.pricePaise / 100) * qty : 0);
    }, 0);
    const customTotal = customItems.reduce((sum, i) => sum + (Number(i.amountRupees) || 0), 0);
    const total = catalogTotal + customTotal;

    const handleSubmit = async () => {
        setFormError("");
        const validCustom = customItems.filter((i) => i.description.trim() && Number(i.amountRupees) > 0);
        const catalogPayload = Object.entries(selected).map(([id, qty]) => ({ id, qty }));

        if (catalogPayload.length === 0 && validCustom.length === 0) {
            setFormError("Select at least one item.");
            return;
        }

        if (isEdit && editReason.trim().length < 5) {
            setFormError("Say what you are correcting. The office sees this.");
            return;
        }

        setSubmitting(true);
        onError("");
        try {
            await api.post("/technician/tickets/generateBill", {
                ticketId: ticket._id,
                serviceKey: selectedServiceKey,
                catalogItems: catalogPayload,
                customItems: validCustom.map((i) => ({
                    description: i.description.trim(),
                    amountRupees: Number(i.amountRupees),
                })),
                workDone: workDone.trim(),
                paymentMethod,
                ...(isEdit ? { editReason: editReason.trim() } : {}),
            });
            onDone();
        } catch (err) {
            onError(getErrorMessage(err, "Could not generate the invoice"));
            setSubmitting(false);
        }
    };

    const isApplianceService = selectedServiceKey === "AC_APPLIANCE";
    const applianceOptions = ["AC", "Refrigerator", "Washing Machine", "Microwave", "Water Purifier (RO)", "Other"];

    const displayCatalog = isApplianceService && activeAppliance
        ? catalog.filter(item => item.subCategory === activeAppliance)
        : catalog;

    const grouped = displayCatalog.reduce((acc, item) => {
        const key = item.category || "part";
        (acc[key] = acc[key] || []).push(item);
        return acc;
    }, {});

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col">
                <div className="border-b border-hairline px-5 py-4 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="font-bold text-ink">Generate invoice</h3>
                        <p className="text-xs text-ink-soft mt-0.5">{ticket.serviceLabel}</p>
                    </div>
                    <button onClick={onClose} className="text-ink-faint hover:text-ink-soft">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {loading ? (
                        <div className="py-10 flex justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-ink-faint" />
                        </div>
                    ) : (
                        <>
                            <label className="cg-label block mb-2">Service Type</label>
                            <CustomDropdown
                                className="mb-5"
                                value={selectedServiceKey}
                                onChange={(val) => {
                                    setSelectedServiceKey(val);
                                    setActiveAppliance("");
                                    setSelected({});
                                }}
                                options={SERVICES.map(s => ({ value: s.key, label: s.label }))}
                                placeholder="-- Choose Service --"
                            />

                            {isApplianceService && (
                                <div className="mb-5">
                                    <label className="cg-label block mb-2">Select Appliance</label>
                                    <CustomDropdown
                                        value={activeAppliance}
                                        onChange={(val) => setActiveAppliance(val)}
                                        options={applianceOptions.map(app => ({ value: app, label: app }))}
                                        placeholder="-- Choose Appliance --"
                                    />
                                </div>
                            )}

                            <label className="cg-label block mb-2">What did you do?</label>
                            <textarea
                                value={workDone}
                                onChange={(e) => setWorkDone(e.target.value)}
                                placeholder="Short summary for the customer"
                                rows={2}
                                className="cg-input mb-5"
                            />

                            {isApplianceService && !activeAppliance ? (
                                <div className="p-4 bg-info-tint border border-hairline rounded-xl mb-4 text-center">
                                    <p className="text-sm font-semibold text-info">Please select an appliance type</p>
                                    <p className="text-xs text-info mt-1">
                                        Choose an appliance above to see its specific items.
                                    </p>
                                </div>
                            ) : displayCatalog.length === 0 ? (
                                <div className="p-4 bg-warn-tint border border-hairline rounded-xl mb-4">
                                    <p className="text-sm font-semibold text-warn">No price list set up</p>
                                    <p className="text-xs text-warn mt-1">
                                        Ask the office to add items for this service. You can still add lines manually below.
                                    </p>
                                </div>
                            ) : (
                                CATEGORY_ORDER.map((cat) =>
                                    grouped[cat]?.length ? (
                                        <div key={cat} className="mb-5">
                                            <h4 className="text-xs font-bold text-ink-faint uppercase tracking-wide mb-2">
                                                {CATEGORY_LABELS[cat]}
                                            </h4>
                                            {/* Two columns on tablets, single on phones - technicians
                                                use both, and touch targets stay large either way */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {grouped[cat].map((item) => {
                                                    const isSelected = Boolean(selected[item._id]);
                                                    const qty = selected[item._id] || 1;
                                                    return (
                                                        <div
                                                            key={item._id}
                                                            className={"border-2 rounded-xl transition-colors " + (isSelected ? "border-green-600 bg-brand-tint" : "border-hairline")}
                                                        >
                                                            <div className="flex items-center w-full min-h-[60px]">
                                                                <button
                                                                    onClick={() => toggleItem(item._id)}
                                                                    className="flex-1 flex items-center gap-2.5 p-3.5 text-left"
                                                                >
                                                                    <div className={"w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 " + (isSelected ? "bg-brand border-green-600" : "border-hairline-strong")}>
                                                                        {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-medium text-ink leading-tight">{item.name}</p>
                                                                    </div>
                                                                </button>
                                                                {isSelected && cat === "part" && (
                                                                    <div className="flex items-center gap-2 pr-3.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); changeQty(item._id, -1); }}
                                                                            className="w-8 h-8 rounded-full bg-white border border-hairline-strong flex items-center justify-center active:bg-sunken shadow-sm"
                                                                        >
                                                                            <Minus className="w-4 h-4 text-ink" />
                                                                        </button>
                                                                        <span className="text-sm font-bold w-4 text-center">{qty}</span>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); changeQty(item._id, 1); }}
                                                                            className="w-8 h-8 rounded-full bg-white border border-hairline-strong flex items-center justify-center active:bg-sunken shadow-sm"
                                                                        >
                                                                            <Plus className="w-4 h-4 text-ink" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : null
                                )
                            )}

                            <div className="mb-5">
                                {!showCustom && customItems.length === 0 ? (
                                    <button
                                        onClick={() => { setShowCustom(true); addCustomItem(); }}
                                        className="flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand"
                                    >
                                        <Plus className="w-4 h-4" /> Something not on the list
                                    </button>
                                ) : (
                                    <>
                                        <h4 className="text-xs font-bold text-ink-faint uppercase tracking-wide mb-2">Other items</h4>
                                        <div className="space-y-2 mb-2">
                                            {customItems.map((item, i) => (
                                                <div key={i} className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={item.description}
                                                        onChange={(e) => updateCustomItem(i, "description", e.target.value)}
                                                        placeholder="Item name"
                                                        className="cg-input flex-1"
                                                    />
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={item.amountRupees}
                                                        onChange={(e) => updateCustomItem(i, "amountRupees", e.target.value)}
                                                        placeholder="Rs"
                                                        className="cg-input w-20"
                                                    />
                                                    <button onClick={() => removeCustomItem(i)} className="shrink-0 p-2 text-ink-faint hover:text-danger">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button onClick={addCustomItem} className="flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand">
                                            <Plus className="w-4 h-4" /> Add another
                                        </button>
                                        <p className="text-xs text-ink-faint mt-2">
                                            Tell the office about these so they can add them to the list permanently.
                                        </p>
                                    </>
                                )}
                            </div>

                            {/* Payment method */}
                            <h4 className="text-xs font-bold text-ink-faint uppercase tracking-wide mb-2">How will they pay?</h4>
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <button
                                    onClick={() => setPaymentMethod("online")}
                                    disabled={!onlineAvailable}
                                    className={"flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-colors disabled:opacity-40 " + (paymentMethod === "online" ? "border-green-600 bg-brand-tint" : "border-hairline")}
                                >
                                    <Smartphone className={"w-5 h-5 " + (paymentMethod === "online" ? "text-brand" : "text-ink-faint")} />
                                    <span className="text-sm font-semibold text-ink">Online</span>
                                    <span className="text-[10px] text-ink-soft">Whole bill</span>
                                </button>
                                <button
                                    onClick={() => setPaymentMethod("cash")}
                                    className={"flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-colors " + (paymentMethod === "cash" ? "border-green-600 bg-brand-tint" : "border-hairline")}
                                >
                                    <Banknote className={"w-5 h-5 " + (paymentMethod === "cash" ? "text-brand" : "text-ink-faint")} />
                                    <span className="text-sm font-semibold text-ink">Cash</span>
                                    <span className="text-[10px] text-ink-soft">Whole bill</span>
                                </button>
                                <button
                                    onClick={() => setPaymentMethod("split")}
                                    disabled={!onlineAvailable || !commissionPercent}
                                    className={"flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-colors disabled:opacity-40 " + (paymentMethod === "split" ? "border-green-600 bg-brand-tint" : "border-hairline")}
                                >
                                    <Split className={"w-5 h-5 " + (paymentMethod === "split" ? "text-brand" : "text-ink-faint")} />
                                    <span className="text-sm font-semibold text-ink">Split</span>
                                    <span className="text-[10px] text-ink-soft">Best for you</span>
                                </button>
                            </div>

                            {paymentMethod === "cash" && (
                                <div className="p-3 bg-warn-tint border border-hairline rounded-xl mb-4">
                                    <p className="text-xs text-warn">
                                        You'll be holding this cash until you deposit it at the office.
                                    </p>
                                </div>
                            )}

                            {/* The split is worth showing in rupees - the whole
                                point is that the technician keeps his share on
                                the spot and owes the office nothing afterwards. */}
                            {paymentMethod === "split" && commissionPercent != null && (
                                <div className="p-3 bg-brand-tint border border-hairline rounded-xl mb-4 space-y-1.5">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-green-900">You take in cash</span>
                                        <span className="font-bold text-green-900">
                                            Rs {(total - (total * commissionPercent) / 100).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-green-900">Customer pays the office online</span>
                                        <span className="font-bold text-green-900">
                                            Rs {((total * commissionPercent) / 100).toFixed(2)}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-brand pt-1.5 border-t border-hairline">
                                        Nothing to deposit later. Take your cash once the customer has paid
                                        the office part. You will see it here the moment they do.
                                    </p>
                                </div>
                            )}

                            {isEdit && (
                                <div className="mb-4">
                                    <h4 className="text-xs font-bold text-ink-faint uppercase tracking-wide mb-2">
                                        What are you correcting?
                                    </h4>
                                    <input
                                        type="text"
                                        value={editReason}
                                        onChange={(e) => { setEditReason(e.target.value); setFormError(""); }}
                                        placeholder="e.g. charged one capacitor extra"
                                        className="cg-input"
                                    />
                                    <p className="text-xs text-ink-faint mt-1">
                                        The office sees this against the job.
                                        {" "}You can correct this bill{" "}
                                        {Math.max(0, editLimit - (existing.editCount || 0))} more time
                                        {Math.max(0, editLimit - (existing.editCount || 0)) === 1 ? "" : "s"}.
                                    </p>
                                </div>
                            )}

                            {formError && (
                                <div className="p-3 bg-danger-tint border border-hairline rounded-lg text-sm text-danger">
                                    {formError}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="border-t border-hairline px-5 py-4 shrink-0">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-ink-soft">Total</span>
                        <span className="text-xl font-bold text-ink">Rs {total.toFixed(2)}</span>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || total === 0}
                        className="w-full flex items-center justify-center gap-2 bg-ink hover:bg-black disabled:opacity-50 text-white font-semibold py-3 rounded-lg text-sm"
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isEdit
                            ? "Send corrected invoice"
                            : paymentMethod === "cash"
                                ? "Create invoice"
                                : "Send payment link"}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ================= CASH COLLECTED ================= */

/**
 * Confirming money taken by hand.
 *
 * On a plain cash job the technician holds the whole bill and owes the
 * commission back, so both numbers have to be on screen - the amount he
 * counted and the part of it that is not his.
 *
 * On a split he holds only his own share and the customer pays the company
 * directly, so there is nothing to owe afterwards. That half cannot be
 * confirmed until the company's half has actually landed: he would otherwise
 * be paid and gone with nothing left to chase the customer with.
 */
const CashModal = ({ ticket, onClose, onDone, onError }) => {
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const isSplit = ticket.payment?.method === "split";
    const split = ticket.payment?.split || {};

    // Starts from what the panel already knows and moves on its own when the
    // gateway confirms - by socket normally, by the button when the webhook
    // cannot reach the server.
    const [officePaid, setOfficePaid] = useState(Boolean(split.onlinePaidAt));

    const totalPaise = ticket.billing?.totalPaise || 0;
    const cashPaise = isSplit ? (split.technicianCashPaise || 0) : totalPaise;
    const commissionPaise = isSplit
        ? (split.companyOnlinePaise || 0)
        : (ticket.billing?.commissionPaise || 0);
    const sharePaise = totalPaise - commissionPaise;

    useEffect(() => {
        if (!isSplit || officePaid) return;

        const onPaid = (p) => {
            if (!p?.ticketId || p.ticketId === String(ticket._id)) setOfficePaid(true);
        };
        techSocket.on("split:commission-paid", onPaid);
        return () => techSocket.off("split:commission-paid", onPaid);
    }, [isSplit, officePaid, ticket._id]);

    // Returns whether the office half has landed, which is what the timer
    // needs to know to stop counting.
    const checkOffice = async () => {
        const res = await api.get("/technician/tickets/" + ticket._id + "/payment-status");
        const paid = Boolean(res.data.data?.officePaid || res.data.data?.isPaid);
        if (paid) setOfficePaid(true);
        return paid;
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        onError("");
        try {
            await api.post("/technician/tickets/" + ticket._id + "/collect-cash", { note: note.trim() });
            onDone();
        } catch (err) {
            onError(getErrorMessage(err, "Could not record the cash"));
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                <div className="text-center mb-5">
                    <div className="w-14 h-14 rounded-full bg-brand-tint flex items-center justify-center mx-auto mb-3">
                        <Banknote className="w-7 h-7 text-brand" />
                    </div>
                    <h3 className="font-bold text-ink">
                        {isSplit ? "Confirm your share" : "Confirm cash received"}
                    </h3>
                    <p className="cg-h1 mt-2">Rs {rupees(cashPaise)}</p>
                    <p className="text-xs text-ink-soft mt-1">
                        {ticket.billing?.invoiceNumber}
                        {isSplit ? " · bill Rs " + rupees(totalPaise) : ""}
                    </p>
                </div>

                {/* What of this is actually his. On a plain cash job the
                    commission is still sitting in his pocket and he owes it. */}
                {!isSplit && commissionPaise > 0 && (
                    <div className="rounded-xl border border-hairline overflow-hidden mb-4 text-sm">
                        <div className="flex justify-between px-3.5 py-2 border-b border-hairline">
                            <span className="text-ink-soft">You collect from the customer</span>
                            <span className="font-semibold text-ink tabular-nums">Rs {rupees(totalPaise)}</span>
                        </div>
                        <div className="flex justify-between px-3.5 py-2 border-b border-hairline">
                            <span className="text-ink-soft">Your share</span>
                            <span className="font-semibold text-brand tabular-nums">Rs {rupees(sharePaise)}</span>
                        </div>
                        <div className="flex justify-between px-3.5 py-2 bg-warn-tint">
                            <span className="text-warn">To deposit at the office</span>
                            <span className="font-bold text-warn tabular-nums">Rs {rupees(commissionPaise)}</span>
                        </div>
                    </div>
                )}

                {isSplit && !officePaid && (
                    <div className="p-3.5 bg-warn-tint border border-hairline rounded-xl mb-4">
                        <PaymentWaitTimer
                            onCheck={checkOffice}
                            waitingLabel={"Waiting for Rs " + rupees(commissionPaise)}
                        />
                    </div>
                )}

                {isSplit && officePaid && (
                    <div className="p-3.5 bg-brand-tint border border-hairline rounded-xl mb-4">
                        <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 className="w-4 h-4 text-brand" />
                            <p className="text-sm font-semibold text-green-900">
                                Office received Rs {rupees(commissionPaise)}
                            </p>
                        </div>
                        <p className="text-xs text-brand">
                            Take your Rs {rupees(cashPaise)} in cash. Nothing to deposit afterwards.
                        </p>
                    </div>
                )}

                {!isSplit && (
                    <div className="p-3 bg-warn-tint border border-hairline rounded-xl mb-4">
                        <p className="text-xs text-warn">
                            This closes the job. The commission stays on your account until you settle it.
                        </p>
                    </div>
                )}

                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Note (optional)"
                    rows={2}
                    className="cg-input"
                />

                <div className="flex gap-2 mt-4">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-ink border border-hairline rounded-lg hover:bg-sunken">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || (isSplit && !officePaid)}
                        className="cg-btn cg-btn-go flex-1"
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

const PaymentStatusModal = ({ ticket, onClose, onDone }) => {
    const [status, setStatus] = useState(null);
    const [checking, setChecking] = useState(true);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    const check = async () => {
        setChecking(true);
        setError("");
        try {
            const res = await api.get("/technician/tickets/" + ticket._id + "/payment-status");
            setStatus(res.data.data);
        } catch (err) {
            setError(getErrorMessage(err, "Could not check the payment"));
        } finally {
            setChecking(false);
        }
    };

    // The socket tells us the moment the webhook lands. The timer below is
    // the fallback for when it cannot - on a development machine Razorpay has
    // no route to localhost at all, so the gateway has to be asked directly.
    useEffect(() => {
        check();
        techSocket.on("ticket:closed", check);
        return () => techSocket.off("ticket:closed", check);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkPaid = async () => {
        const res = await api.get("/technician/tickets/" + ticket._id + "/payment-status");
        setStatus(res.data.data);
        return Boolean(res.data.data?.isPaid);
    };

    const copyLink = () => {
        navigator.clipboard.writeText(ticket.payment?.razorpayLinkUrl || "");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const isPaid = status?.isPaid;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-ink">Payment status</h3>
                    <button onClick={onClose} className="text-ink-faint hover:text-ink-soft">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="text-center py-4 mb-4">
                    {checking && !status ? (
                        <Loader2 className="w-10 h-10 text-ink-faint animate-spin mx-auto" />
                    ) : isPaid ? (
                        <>
                            <div className="w-14 h-14 rounded-full bg-brand-tint flex items-center justify-center mx-auto mb-3">
                                <CheckCircle2 className="w-7 h-7 text-brand" />
                            </div>
                            <p className="text-lg font-bold text-ink">Payment received</p>
                            <p className="text-2xl font-bold text-brand mt-1">Rs {status.amountDisplay}</p>
                        </>
                    ) : (
                        <>
                            <div className="w-14 h-14 rounded-full bg-warn-tint flex items-center justify-center mx-auto mb-3">
                                <Loader2 className="w-7 h-7 text-warn animate-spin" />
                            </div>
                            <p className="text-lg font-bold text-ink">Not paid yet</p>
                            <p className="text-sm text-ink-soft mt-1">
                                Rs {status?.amountDisplay || rupees(ticket.billing?.totalPaise)}
                            </p>
                        </>
                    )}
                </div>

                {isPaid && status.paymentId && (
                    <div className="bg-sunken rounded-xl p-3 mb-4 space-y-1.5">
                        <div className="flex justify-between text-xs">
                            <span className="text-ink-soft">Payment ID</span>
                            <span className="font-mono text-ink">{status.paymentId}</span>
                        </div>
                        {status.method && (
                            <div className="flex justify-between text-xs">
                                <span className="text-ink-soft">Method</span>
                                <span className="font-semibold text-ink uppercase">{status.method}</span>
                            </div>
                        )}
                        {status.paidAt && (
                            <div className="flex justify-between text-xs">
                                <span className="text-ink-soft">Paid at</span>
                                <span className="text-ink">
                                    {new Date(status.paidAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between text-xs">
                            <span className="text-ink-soft">Invoice</span>
                            <span className="font-mono text-ink">{ticket.billing?.invoiceNumber}</span>
                        </div>
                    </div>
                )}

                {!isPaid && (
                    <div className="p-3.5 bg-warn-tint border border-hairline rounded-xl mb-3">
                        <PaymentWaitTimer
                            onCheck={checkPaid}
                            waitingLabel={"Waiting for Rs " + (status?.amountDisplay || rupees(ticket.billing?.totalPaise))}
                        />
                    </div>
                )}

                {!isPaid && ticket.payment?.razorpayLinkUrl && (
                    <button
                        onClick={copyLink}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mb-2 text-sm font-medium text-ink border border-hairline rounded-lg hover:bg-sunken"
                    >
                        <Copy className="w-4 h-4" />
                        {copied ? "Link copied" : "Copy payment link"}
                    </button>
                )}

                {error && (
                    <div className="mb-3 p-3 bg-danger-tint border border-hairline rounded-lg text-sm text-danger">{error}</div>
                )}

                {isPaid ? (
                    <button onClick={onDone} className="cg-btn cg-btn-go w-full">
                        Done
                    </button>
                ) : (
                    <button
                        onClick={check}
                        disabled={checking}
                        className="w-full flex items-center justify-center gap-2 bg-ink hover:bg-black disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm"
                    >
                        <RefreshCw className={"w-4 h-4 " + (checking ? "animate-spin" : "")} />
                        Check again
                    </button>
                )}

                {!isPaid && (
                    <p className="text-xs text-ink-faint text-center mt-3">
                        Updates by itself the moment the payment lands
                    </p>
                )}
            </div>
        </div>
    );
};

export default ActiveJobCard;