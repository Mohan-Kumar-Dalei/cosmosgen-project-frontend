import React, { useEffect, useState, useCallback } from "react";
import AdminLayout from "./AdminLayout";
import { useAdminAuth } from "../Admin/adminAuthContext";
import { api, getErrorMessage } from "../../services/api";
import { useAdminData } from "./AdminDataContext";
import CustomDropdown from "../../ui/CustomDropdown";
import {
    Loader2, AlertCircle, X, Wallet, Phone,
    ArrowUpRight, ArrowDownLeft, CheckCircle2, MapPin, RefreshCw,
} from "lucide-react";

const AdminWallets = () => {
    const { globalRefreshTrigger, refreshCounts } = useAdminData();
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [flash, setFlash] = useState("");
    const [selectedId, setSelectedId] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await api.get("/admin/wallets");
            setRows(res.data.data);
            setSummary(res.data.summary);
            setError("");
        } catch (err) {
            setError(getErrorMessage(err, "Could not load wallet balances"));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
        const interval = setInterval(load, 60000);
        return () => clearInterval(interval);
    }, [load]);

    const handleDone = async (message) => {
        setSelectedId(null);
        setFlash(message);
        setTimeout(() => setFlash(""), 4000);
        await load();
        refreshCounts();
    };

    const owed = rows.filter((r) => r.direction === "company_owes");
    const owes = rows.filter((r) => r.direction === "technician_owes");

    return (
        <AdminLayout>
            <div className="flex items-start justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Wallets</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Who the company owes, and who owes the company.
                    </p>
                </div>
                <button
                    onClick={() => { setRefreshing(true); load(); }}
                    disabled={refreshing}
                    className="shrink-0 p-2.5 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                    <RefreshCw className={"w-4 h-4 " + (refreshing ? "animate-spin" : "")} />
                </button>
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

            {summary && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    <div className="bg-slate-900 text-white rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-1">
                            <ArrowUpRight className="w-4 h-4 text-white/60" />
                            <p className="text-sm font-medium text-white/60">You owe technicians</p>
                        </div>
                        <p className="text-2xl font-bold">Rs {summary.owedToTechniciansDisplay}</p>
                        <p className="text-xs text-white/50 mt-1">{owed.length} people</p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center gap-2 mb-1">
                            <ArrowDownLeft className="w-4 h-4 text-amber-600" />
                            <p className="text-sm font-medium text-gray-500">Technicians owe you</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">Rs {summary.owedByTechniciansDisplay}</p>
                        <p className="text-xs text-gray-400 mt-1">{owes.length} people, mostly cash jobs</p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <p className="text-sm font-medium text-gray-500 mb-1">Net position</p>
                        <p className="text-2xl font-bold text-gray-900">Rs {summary.netDisplay}</p>
                        <p className="text-xs text-gray-400 mt-1">After settling everything</p>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-20 animate-pulse" />
                    ))}
                </div>
            ) : rows.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
                    <Wallet className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900">Everything is settled</p>
                    <p className="text-sm text-gray-500 mt-1">
                        No outstanding balances in either direction.
                    </p>
                </div>
            ) : (
                <div className="space-y-6 pb-8">
                    {owed.length > 0 && (
                        <div>
                            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                                You owe them ({owed.length})
                            </h2>
                            <div className="space-y-2">
                                {owed.map((r) => (
                                    <WalletRow key={r._id} row={r} onOpen={() => setSelectedId(r._id)} />
                                ))}
                            </div>
                        </div>
                    )}

                    {owes.length > 0 && (
                        <div>
                            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                                They owe you ({owes.length})
                            </h2>
                            <div className="space-y-2">
                                {owes.map((r) => (
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
                    onClose={() => setSelectedId(null)}
                    onDone={handleDone}
                />
            )}
        </AdminLayout>
    );
};

const WalletRow = ({ row, onOpen }) => {
    const companyOwes = row.direction === "company_owes";

    return (
        <button
            onClick={onOpen}
            className={"w-full text-left bg-white border rounded-xl p-4 hover:shadow-sm transition-all " + (companyOwes ? "border-gray-200 hover:border-green-300" : "border-amber-200 hover:border-amber-300")}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{row.name}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-0.5">
                            <Phone className="w-3 h-3" /> {row.phone}
                        </span>
                        {row.area && (
                            <span className="flex items-center gap-0.5 truncate">
                                <MapPin className="w-3 h-3 shrink-0" /> {row.area}
                            </span>
                        )}
                        <span className="text-gray-400">{row.commissionRate}% commission</span>
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <p className={"text-lg font-bold " + (companyOwes ? "text-gray-900" : "text-amber-700")}>
                        Rs {row.balanceDisplay}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                        {companyOwes ? "To pay" : "To collect"}
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
                <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
                    <h2 className="font-bold text-gray-900">
                        {data?.technician?.name || "Wallet"}
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
                    ) : error ? (
                        <p className="text-sm text-red-600">{error}</p>
                    ) : data ? (
                        <>
                            <div className={"rounded-2xl p-5 mb-5 " + (companyOwes ? "bg-slate-900 text-white" : "bg-amber-50 border border-amber-200")}>
                                <p className={"text-sm font-medium " + (companyOwes ? "text-white/60" : "text-amber-700")}>
                                    {companyOwes ? "You owe" : "They owe you"}
                                </p>
                                <p className={"text-3xl font-bold mt-1 " + (companyOwes ? "text-white" : "text-amber-900")}>
                                    Rs {data.balanceDisplay}
                                </p>
                                <p className={"text-xs mt-2 pt-2 border-t " + (companyOwes ? "text-white/50 border-white/10" : "text-amber-600 border-amber-200")}>
                                    {companyOwes
                                        ? "Online jobs credit their share here. Send the money, then record it below."
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
                                            className="flex-1 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white font-semibold py-2.5 rounded-lg text-sm"
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
                                            Record collection
                                        </button>
                                    )
                                ) : (
                                    <div className="flex-1 flex items-center justify-center bg-gray-50 border border-gray-200 text-gray-500 py-2.5 rounded-lg text-sm">
                                        Settlement is done by the owner
                                    </div>
                                )}

                                <a
                                    href={"tel:" + data.technician?.phone}
                                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                                >
                                    <Phone className="w-4 h-4" />
                                    Call
                                </a>
                            </div>

                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                                Passbook
                            </h3>

                            {data.transactions.length === 0 ? (
                                <p className="text-sm text-gray-500 py-4 text-center">No transactions yet.</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {data.transactions.map((t) => (
                                        <div key={t._id} className="flex items-start justify-between gap-3 py-2.5 border-b border-gray-100 last:border-0">
                                            <div className="min-w-0">
                                                <p className="text-sm text-gray-900">{t.description}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    {new Date(t.createdAt).toLocaleDateString("en-IN", {
                                                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                                                    })}
                                                    {t.ticket?.ticketNumber ? " · " + t.ticket.ticketNumber : ""}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className={"text-sm font-bold " + (t.type === "credit" ? "text-green-700" : "text-red-600")}>
                                                    {t.type === "credit" ? "+" : "-"} Rs {t.amountDisplay}
                                                </p>
                                                <p className="text-[10px] text-gray-400">
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

            {panel === "payout" && data && (
                <SettleDialog
                    mode="payout"
                    technicianId={technicianId}
                    technicianName={data.technician.name}
                    maxDisplay={data.balanceDisplay}
                    maxPaise={Math.abs(data.balancePaise)}
                    onClose={() => setPanel(null)}
                    onDone={onDone}
                />
            )}

            {panel === "collect" && data && (
                <SettleDialog
                    mode="collect"
                    technicianId={technicianId}
                    technicianName={data.technician.name}
                    maxDisplay={data.balanceDisplay}
                    maxPaise={Math.abs(data.balancePaise)}
                    onClose={() => setPanel(null)}
                    onDone={onDone}
                />
            )}
        </div>
    );
};

/* ================================================================== */
/* SETTLE                                                               */
/* ================================================================== */

const SettleDialog = ({ mode, technicianId, technicianName, maxDisplay, maxPaise, onClose, onDone }) => {
    const isPayout = mode === "payout";
    const [amount, setAmount] = useState((maxPaise / 100).toFixed(2));
    const [reference, setReference] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        const rupees = Number(amount);
        if (!Number.isFinite(rupees) || rupees <= 0) {
            setError("Enter a valid amount");
            return;
        }
        if (reference.trim().length < 3) {
            setError(isPayout ? "Enter the UTR or transaction reference" : "Note how you received it");
            return;
        }

        setSubmitting(true);
        setError("");

        try {
            if (isPayout) {
                await api.post("/admin/technicians/payout", {
                    technicianId,
                    amountPaise: Math.round(rupees * 100),
                    referenceNote: reference.trim(),
                });
                onDone("Paid Rs " + rupees.toFixed(2) + " to " + technicianName);
            } else {
                await api.post("/admin/wallets/" + technicianId + "/collect", {
                    amountPaise: Math.round(rupees * 100),
                    referenceNote: reference.trim(),
                });
                onDone("Collected Rs " + rupees.toFixed(2) + " from " + technicianName);
            }
        } catch (err) {
            setError(getErrorMessage(err, "Could not record this"));
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                <h3 className="font-bold text-gray-900 mb-1">
                    {isPayout ? "Record a payout" : "Record a collection"}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                    {isPayout
                        ? "Send the money first, then record it here. This only updates the ledger."
                        : "Take the cash first, then record it here."}
                </p>

                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Amount (Rs) — outstanding is Rs {maxDisplay}
                </label>
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setError(""); }}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700 mb-3"
                />

                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {isPayout ? "UTR / transaction reference" : "How was it received?"}
                </label>
                {isPayout ? (
                    <input
                        type="text"
                        value={reference}
                        onChange={(e) => { setReference(e.target.value); setError(""); }}
                        placeholder="e.g. UTR 412345678901"
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700"
                    />
                ) : (
                    <CustomDropdown
                        value={reference}
                        onChange={(val) => { setReference(val); setError(""); }}
                        options={[
                            { value: "UPI", label: "UPI" },
                            { value: "Razorpay", label: "Razorpay" },
                            { value: "Cash", label: "Cash" },
                            { value: "Bank Transfer", label: "Bank Transfer" }
                        ]}
                        placeholder="Select method..."
                    />
                )}
                <p className="text-xs text-gray-400 mt-1">
                    Without this the entry can't be traced back later.
                </p>

                {error && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="flex gap-2 mt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className={"flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 rounded-lg " + (isPayout ? "bg-green-700 hover:bg-green-800" : "bg-amber-600 hover:bg-amber-700")}
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Record it
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminWallets;