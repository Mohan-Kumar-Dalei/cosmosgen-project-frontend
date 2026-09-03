import React, { useState, useEffect } from "react";
import { api, getErrorMessage } from "../../services/api";
import {
    Phone, MapPin, AlertTriangle, Navigation, X, Loader2, Plus, Trash2,
    Receipt, CheckCircle2, RefreshCw, Copy, Minus, Banknote, Smartphone,
    Briefcase,
} from "lucide-react";

const buildDirectionsUrl = (lat, lon) => {
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) return null;
    return "https://www.google.com/maps/dir/?api=1&destination=" + lat + "," + lon + "&travelmode=driving";
};

const rupees = (paise) => (Number(paise || 0) / 100).toFixed(2);

const ActiveJobCard = ({ ticket, onUpdate }) => {
    const [panel, setPanel] = useState(null);
    const [error, setError] = useState("");

    if (!ticket) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 lg:p-20 text-center">
                <Briefcase className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="font-semibold text-gray-900">No active job</p>
                <p className="text-sm text-gray-500 mt-1">New jobs will appear here once assigned.</p>
            </div>
        );
    }

    const customer = ticket.customerSnapshot || {};
    const directionsUrl = buildDirectionsUrl(customer.lat, customer.lon);
    const isCashInvoice = ticket.payment?.method === "cash";

    const startWork = async () => {
        setError("");
        try {
            await api.post("/technician/tickets/" + ticket._id + "/start-work");
            onUpdate();
        } catch (err) {
            setError(getErrorMessage(err, "Could not start work"));
        }
    };

    const statusLabel =
        ticket.status === "Payment-Pending" ? "Awaiting payment"
            : ticket.status === "In-Progress" ? "In progress"
                : ticket.status;

    return (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

            {/* Header strip - full width on both sizes */}
            <div className="px-5 py-4 lg:px-6 border-b border-gray-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wide shrink-0">
                        {statusLabel}
                    </span>
                    <span className="text-sm lg:text-base font-semibold text-gray-900 truncate">
                        {ticket.serviceLabel}
                    </span>
                </div>
                <span className="text-xs font-mono text-gray-400 shrink-0">{ticket.ticketNumber}</span>
            </div>

            {/* Two columns on desktop. Stacked, this card became one long thin
                strip on a wide screen with the buttons pulled across the
                whole width - unusable and ugly. */}
            <div className="lg:grid lg:grid-cols-5">

                {/* LEFT - what the job is */}
                <div className="p-5 lg:p-6 lg:col-span-3 lg:border-r border-gray-100">
                    {ticket.status === "Payment-Pending" && (
                        <div className={"mb-4 p-3.5 rounded-xl border " + (isCashInvoice ? "bg-amber-50 border-amber-200" : "bg-purple-50 border-purple-200")}>
                            <p className={"text-sm lg:text-base font-semibold " + (isCashInvoice ? "text-amber-800" : "text-purple-800")}>
                                {isCashInvoice ? "Collect cash" : "Invoice sent"} — Rs {rupees(ticket.billing?.totalPaise)}
                            </p>
                            <p className={"text-xs mt-0.5 " + (isCashInvoice ? "text-amber-700" : "text-purple-600")}>
                                {ticket.billing?.invoiceNumber}
                                {isCashInvoice ? " · take the cash, then confirm" : " · waiting for the customer to pay"}
                            </p>
                        </div>
                    )}

                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        What's wrong
                    </p>
                    <p className="text-sm lg:text-base text-gray-800 leading-relaxed">
                        {ticket.problemDescription || "No description provided"}
                    </p>

                    {ticket.selectedIssues?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                            {ticket.selectedIssues.map((issue, i) => (
                                <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                                    {issue}
                                </span>
                            ))}
                        </div>
                    )}

                    {ticket.billing?.workDone && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                                Work you recorded
                            </p>
                            <p className="text-sm text-gray-700">{ticket.billing.workDone}</p>
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Actions sit under the job details on desktop, where the
                        eye already is after reading the problem */}
                    <div className="hidden lg:flex flex-wrap gap-2 mt-6 pt-6 border-t border-gray-100">
                        <JobActions
                            ticket={ticket}
                            isCashInvoice={isCashInvoice}
                            startWork={startWork}
                            setPanel={setPanel}
                        />
                    </div>
                </div>

                {/* RIGHT - who and where */}
                <div className="p-5 lg:p-6 lg:col-span-2 bg-gray-50/60 border-t lg:border-t-0 border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        Customer
                    </p>

                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm lg:text-base truncate">
                                {customer.name || "Name not available"}
                            </p>
                            {customer.phone && (
                                <p className="text-xs text-gray-500 mt-0.5">{customer.phone}</p>
                            )}
                        </div>
                        {customer.phone && (
                            <a
                                href={"tel:" + customer.phone}
                                className="shrink-0 bg-green-600 hover:bg-green-700 text-white p-3 rounded-full"
                            >
                                <Phone className="w-4 h-4" />
                            </a>
                        )}
                    </div>

                    <div className="flex items-start gap-2 mb-3">
                        <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-700 leading-relaxed">
                            {customer.address || customer.area || "No address on file"}
                            {customer.landmark && (
                                <span className="block text-xs text-gray-400 mt-0.5">Near {customer.landmark}</span>
                            )}
                        </p>
                    </div>

                    {directionsUrl ? (
                        <a
                            href={directionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg text-sm"
                        >
                            <Navigation className="w-4 h-4" />
                            Open in Google Maps
                        </a>
                    ) : (
                        <p className="text-xs text-amber-600 py-2">
                            No coordinates on this ticket - ask the office for directions
                        </p>
                    )}

                    {/* On mobile the actions come last, after everything the
                        technician needs to read first */}
                    <div className="flex lg:hidden flex-wrap gap-2 mt-5 pt-5 border-t border-gray-200">
                        <JobActions
                            ticket={ticket}
                            isCashInvoice={isCashInvoice}
                            startWork={startWork}
                            setPanel={setPanel}
                        />
                    </div>
                </div>
            </div>

            {panel === "release" && (
                <ReleaseModal ticket={ticket} onClose={() => setPanel(null)} onDone={() => { setPanel(null); onUpdate(); }} onError={setError} />
            )}
            {panel === "bill" && (
                <BillModal ticket={ticket} onClose={() => setPanel(null)} onDone={() => { setPanel(null); onUpdate(); }} onError={setError} />
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
const JobActions = ({ ticket, isCashInvoice, startWork, setPanel }) => (
    <>
        {ticket.status === "Assigned" && (
            <button
                onClick={startWork}
                className="flex-1 min-w-[160px] bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-lg text-sm"
            >
                I've started work
            </button>
        )}

        {ticket.status === "In-Progress" && (
            <button
                onClick={() => setPanel("bill")}
                className="flex-1 min-w-[160px] flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-lg text-sm"
            >
                <Receipt className="w-4 h-4" />
                Generate invoice
            </button>
        )}

        {ticket.status === "Payment-Pending" && isCashInvoice && (
            <button
                onClick={() => setPanel("cash")}
                className="flex-1 min-w-[160px] flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-lg text-sm"
            >
                <Banknote className="w-4 h-4" />
                Cash received
            </button>
        )}

        {ticket.status === "Payment-Pending" && !isCashInvoice && (
            <button
                onClick={() => setPanel("payment")}
                className="flex-1 min-w-[160px] flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-lg text-sm"
            >
                <CheckCircle2 className="w-4 h-4" />
                Check payment
            </button>
        )}

        {(ticket.status === "Assigned" || ticket.status === "In-Progress") && (
            <button
                onClick={() => setPanel("release")}
                className="flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
            >
                <X className="w-4 h-4" />
                Can't do this job
            </button>
        )}
    </>
);

/* ================= RELEASE ================= */

const ReleaseModal = ({ ticket, onClose, onDone, onError }) => {
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
            onError(getErrorMessage(err, "Could not release this job"));
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <h3 className="font-bold text-gray-900">Release this job</h3>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                    This job goes back to the office queue. They'll reassign it or contact the customer.
                </p>
                <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                >
                    <option value="">Select a reason...</option>
                    <option value="Location is too far">Location is too far</option>
                    <option value="Customer is not responding">Customer is not responding</option>
                    <option value="Vehicle breakdown / Traffic">Vehicle breakdown / Traffic</option>
                    <option value="Missing spare parts">Missing spare parts</option>
                    <option value="Other">Other</option>
                </select>
                <div className="flex gap-2 mt-4">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
                        Keep job
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={reason.trim().length < 5 || submitting}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg"
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Release job
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ================= INVOICE ================= */

const CATEGORY_ORDER = ["labour", "service", "part"];
const CATEGORY_LABELS = { labour: "Service charge", service: "Add-on services", part: "Parts" };

const BillModal = ({ ticket, onClose, onDone, onError }) => {
    const [catalog, setCatalog] = useState([]);
    const [selected, setSelected] = useState({});
    const [customItems, setCustomItems] = useState([]);
    const [workDone, setWorkDone] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("online");
    const [onlineAvailable, setOnlineAvailable] = useState(true);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");
    const [showCustom, setShowCustom] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await api.get("/technician/pricing", { params: { serviceKey: ticket.serviceKey } });
                setCatalog(res.data.data);
                setOnlineAvailable(res.data.onlinePaymentAvailable !== false);
                if (res.data.onlinePaymentAvailable === false) setPaymentMethod("cash");

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
    }, [ticket.serviceKey]);

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

        setSubmitting(true);
        onError("");
        try {
            await api.post("/technician/tickets/generateBill", {
                ticketId: ticket._id,
                catalogItems: catalogPayload,
                customItems: validCustom.map((i) => ({
                    description: i.description.trim(),
                    amountRupees: Number(i.amountRupees),
                })),
                workDone: workDone.trim(),
                paymentMethod,
            });
            onDone();
        } catch (err) {
            onError(getErrorMessage(err, "Could not generate the invoice"));
            setSubmitting(false);
        }
    };

    const grouped = catalog.reduce((acc, item) => {
        const key = item.category || "part";
        (acc[key] = acc[key] || []).push(item);
        return acc;
    }, {});

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col">
                <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="font-bold text-gray-900">Generate invoice</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{ticket.serviceLabel}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {loading ? (
                        <div className="py-10 flex justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">What did you do?</label>
                            <textarea
                                value={workDone}
                                onChange={(e) => setWorkDone(e.target.value)}
                                placeholder="Short summary for the customer"
                                rows={2}
                                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700 mb-5"
                            />

                            {catalog.length === 0 ? (
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                                    <p className="text-sm font-semibold text-amber-800">No price list set up</p>
                                    <p className="text-xs text-amber-700 mt-1">
                                        Ask the office to add items for this service. You can still add lines manually below.
                                    </p>
                                </div>
                            ) : (
                                CATEGORY_ORDER.map((cat) =>
                                    grouped[cat]?.length ? (
                                        <div key={cat} className="mb-5">
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
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
                                                            className={"border-2 rounded-xl transition-colors " + (isSelected ? "border-green-600 bg-green-50" : "border-gray-200")}
                                                        >
                                                            <button
                                                                onClick={() => toggleItem(item._id)}
                                                                className="w-full flex items-center gap-2.5 p-3.5 text-left min-h-[60px]"
                                                            >
                                                                <div className={"w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 " + (isSelected ? "bg-green-600 border-green-600" : "border-gray-300")}>
                                                                    {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-gray-900 leading-tight">{item.name}</p>
                                                                    <p className="text-sm font-bold text-gray-900 mt-0.5">Rs {item.priceDisplay}</p>
                                                                </div>
                                                            </button>

                                                            {isSelected && cat === "part" && (
                                                                <div className="flex items-center justify-between px-3.5 pb-3 pt-1">
                                                                    <span className="text-xs text-gray-500">Qty</span>
                                                                    <div className="flex items-center gap-3">
                                                                        <button
                                                                            onClick={() => changeQty(item._id, -1)}
                                                                            className="w-9 h-9 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center active:bg-gray-100"
                                                                        >
                                                                            <Minus className="w-4 h-4 text-gray-700" />
                                                                        </button>
                                                                        <span className="text-base font-bold w-6 text-center">{qty}</span>
                                                                        <button
                                                                            onClick={() => changeQty(item._id, 1)}
                                                                            className="w-9 h-9 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center active:bg-gray-100"
                                                                        >
                                                                            <Plus className="w-4 h-4 text-gray-700" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
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
                                        className="flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800"
                                    >
                                        <Plus className="w-4 h-4" /> Something not on the list
                                    </button>
                                ) : (
                                    <>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Other items</h4>
                                        <div className="space-y-2 mb-2">
                                            {customItems.map((item, i) => (
                                                <div key={i} className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={item.description}
                                                        onChange={(e) => updateCustomItem(i, "description", e.target.value)}
                                                        placeholder="Item name"
                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700"
                                                    />
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={item.amountRupees}
                                                        onChange={(e) => updateCustomItem(i, "amountRupees", e.target.value)}
                                                        placeholder="Rs"
                                                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700"
                                                    />
                                                    <button onClick={() => removeCustomItem(i)} className="shrink-0 p-2 text-gray-400 hover:text-red-500">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button onClick={addCustomItem} className="flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800">
                                            <Plus className="w-4 h-4" /> Add another
                                        </button>
                                        <p className="text-xs text-gray-400 mt-2">
                                            Tell the office about these so they can add them to the list permanently.
                                        </p>
                                    </>
                                )}
                            </div>

                            {/* Payment method */}
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">How will they pay?</h4>
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <button
                                    onClick={() => setPaymentMethod("online")}
                                    disabled={!onlineAvailable}
                                    className={"flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-colors disabled:opacity-40 " + (paymentMethod === "online" ? "border-green-600 bg-green-50" : "border-gray-200")}
                                >
                                    <Smartphone className={"w-5 h-5 " + (paymentMethod === "online" ? "text-green-700" : "text-gray-400")} />
                                    <span className="text-sm font-semibold text-gray-900">Online</span>
                                    <span className="text-[10px] text-gray-500">UPI, card, QR</span>
                                </button>
                                <button
                                    onClick={() => setPaymentMethod("cash")}
                                    className={"flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-colors " + (paymentMethod === "cash" ? "border-green-600 bg-green-50" : "border-gray-200")}
                                >
                                    <Banknote className={"w-5 h-5 " + (paymentMethod === "cash" ? "text-green-700" : "text-gray-400")} />
                                    <span className="text-sm font-semibold text-gray-900">Cash</span>
                                    <span className="text-[10px] text-gray-500">Deposit at office</span>
                                </button>
                            </div>

                            {paymentMethod === "cash" && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                                    <p className="text-xs text-amber-800">
                                        You'll be holding this cash until you deposit it at the office.
                                    </p>
                                </div>
                            )}

                            {formError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                    {formError}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="border-t border-gray-100 px-5 py-4 shrink-0">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-600">Total</span>
                        <span className="text-xl font-bold text-gray-900">Rs {total.toFixed(2)}</span>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || total === 0}
                        className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold py-3 rounded-lg text-sm"
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {paymentMethod === "cash" ? "Create invoice" : "Send payment link"}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ================= CASH COLLECTED ================= */

const CashModal = ({ ticket, onClose, onDone, onError }) => {
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);

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
                    <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                        <Banknote className="w-7 h-7 text-green-700" />
                    </div>
                    <h3 className="font-bold text-gray-900">Confirm cash received</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-2">Rs {rupees(ticket.billing?.totalPaise)}</p>
                    <p className="text-xs text-gray-500 mt-1">{ticket.billing?.invoiceNumber}</p>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                    <p className="text-xs text-amber-800">
                        This closes the job. The amount stays on your pending deposits until you hand it in at the office.
                    </p>
                </div>

                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Note (optional)"
                    rows={2}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700"
                />

                <div className="flex gap-2 mt-4">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-green-700 hover:bg-green-800 disabled:opacity-50 rounded-lg"
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ================= ONLINE PAYMENT STATUS ================= */

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

    useEffect(() => {
        check();
        const interval = setInterval(check, 8000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
                    <h3 className="font-bold text-gray-900">Payment status</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="text-center py-4 mb-4">
                    {checking && !status ? (
                        <Loader2 className="w-10 h-10 text-gray-300 animate-spin mx-auto" />
                    ) : isPaid ? (
                        <>
                            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                                <CheckCircle2 className="w-7 h-7 text-green-600" />
                            </div>
                            <p className="text-lg font-bold text-gray-900">Payment received</p>
                            <p className="text-2xl font-bold text-green-700 mt-1">Rs {status.amountDisplay}</p>
                        </>
                    ) : (
                        <>
                            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                                <Loader2 className="w-7 h-7 text-amber-600 animate-spin" />
                            </div>
                            <p className="text-lg font-bold text-gray-900">Not paid yet</p>
                            <p className="text-sm text-gray-500 mt-1">
                                Rs {status?.amountDisplay || rupees(ticket.billing?.totalPaise)}
                            </p>
                        </>
                    )}
                </div>

                {isPaid && status.paymentId && (
                    <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-1.5">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Payment ID</span>
                            <span className="font-mono text-gray-900">{status.paymentId}</span>
                        </div>
                        {status.method && (
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Method</span>
                                <span className="font-semibold text-gray-900 uppercase">{status.method}</span>
                            </div>
                        )}
                        {status.paidAt && (
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Paid at</span>
                                <span className="text-gray-900">
                                    {new Date(status.paidAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Invoice</span>
                            <span className="font-mono text-gray-900">{ticket.billing?.invoiceNumber}</span>
                        </div>
                    </div>
                )}

                {!isPaid && ticket.payment?.razorpayLinkUrl && (
                    <button
                        onClick={copyLink}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mb-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                        <Copy className="w-4 h-4" />
                        {copied ? "Link copied" : "Copy payment link"}
                    </button>
                )}

                {error && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
                )}

                {isPaid ? (
                    <button onClick={onDone} className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-2.5 rounded-lg text-sm">
                        Done
                    </button>
                ) : (
                    <button
                        onClick={check}
                        disabled={checking}
                        className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm"
                    >
                        <RefreshCw className={"w-4 h-4 " + (checking ? "animate-spin" : "")} />
                        Check again
                    </button>
                )}

                {!isPaid && <p className="text-xs text-gray-400 text-center mt-3">Checking automatically every few seconds</p>}
            </div>
        </div>
    );
};

export default ActiveJobCard;