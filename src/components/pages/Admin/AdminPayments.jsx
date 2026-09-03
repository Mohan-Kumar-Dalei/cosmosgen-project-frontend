import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import { useAdminAuth } from "../Admin/adminAuthContext";
import { useAdminData } from "./AdminDataContext";
import { api, getErrorMessage } from "../../services/api";
import { adminSocket, connectAdminSocket } from "../../services/socket";
import {
    Loader2, AlertCircle, CheckCircle2, Receipt,
    ShieldCheck, RefreshCw, Banknote, ArrowRight,
} from "lucide-react";

const TABS = [
    { key: "collected", label: "To verify", method: "online" },
    { key: "pending", label: "Awaiting payment", method: null },
    { key: "verified", label: "Verified", method: null },
    { key: "all", label: "All", method: null },
];

const STATUS_STYLES = {
    pending: "bg-amber-100 text-amber-800",
    collected: "bg-blue-100 text-blue-800",
    verified: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-700",
};

const STATUS_LABELS = {
    pending: "awaiting payment",
    collected: "to verify",
    verified: "verified",
    failed: "failed",
};

const AdminPayments = () => {
    const { hasPermission } = useAdminAuth();
    const { refreshCounts } = useAdminData();
    const [tab, setTab] = useState("collected");
    const [payments, setPayments] = useState([]);
    const [summary, setSummary] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [verifyingId, setVerifyingId] = useState(null);
    const [awaitingReconcile, setAwaitingReconcile] = useState(0);

    const canVerify = hasPermission("VERIFY_PAYMENT");

    const load = useCallback(async (tabKey) => {
        try {
            const config = TABS.find((t) => t.key === tabKey);
            const res = await api.get("/admin/payments", {
                params: {
                    status: tabKey,
                    method: config?.method || undefined,
                },
            });
            setPayments(res.data.data);
            setSummary(res.data.summary || {});
            setSummary(res.data.summary || {});
            setAwaitingReconcile(res.data.awaitingReconcile || 0);
            setError("");
        } catch (err) {
            setError(getErrorMessage(err, "Could not load payments"));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        load(tab);
    }, [tab, load]);

    useEffect(() => {
        const interval = setInterval(() => load(tab), 30000);
        connectAdminSocket();
        const refresh = () => load(tab);
        adminSocket.on("payment:collected", refresh);
        return () => {
            clearInterval(interval);
            adminSocket.off("payment:collected", refresh);
        };
    }, [tab, load]);

    const handleVerify = async (id) => {
        setVerifyingId(id);
        try {
            await api.post("/admin/payments/" + id + "/verify");
            load(tab);
            refreshCounts();
        } catch (err) {
            setError(getErrorMessage(err, "Could not verify this payment"));
        } finally {
            setVerifyingId(null);
        }
    };

    return (
        <AdminLayout>
            <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Payments</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Online money that reached the company account, and what's still owed.
                    </p>
                </div>
                <button
                    onClick={() => { setRefreshing(true); load(tab); }}
                    disabled={refreshing}
                    className="shrink-0 flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                    <RefreshCw className={"w-4 h-4 " + (refreshing ? "animate-spin" : "")} />
                    <span className="hidden sm:inline">Refresh</span>
                </button>
            </div>

            {/* Cash and online are different: online money reached the
                company and needs verifying, cash never did. One combined
                number hid that distinction entirely. */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <SummaryCard
                    label="To verify"
                    value={summary.online?.collected?.amountDisplay}
                    count={summary.online?.collected?.count}
                    tone="blue"
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
                    tone="amber"
                />
                <SummaryCard
                    label="Collected in cash"
                    value={summary.cash?.collected?.amountDisplay}
                    count={summary.cash?.collected?.count}
                    tone="gray"
                    href={hasPermission("VIEW_WALLETS") ? "/admin/wallets" : null}
                    hint="settled in Wallets"
                />
            </div>

            <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit overflow-x-auto max-w-full">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={"flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors " + (tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                    >
                        {t.label}
                        {/* Only on the reconcile tab - it's the one with work
                            waiting behind it */}
                        {t.key === "collected" && awaitingReconcile > 0 && (
                            <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 rounded-full">
                                {awaitingReconcile}
                            </span>
                        )}
                    </button>
                ))}
            </div>

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
            ) : payments.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
                    <Receipt className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900">Nothing here</p>
                    <p className="text-sm text-gray-500 mt-1">
                        {tab === "collected"
                            ? "Every online payment has been matched against the bank."
                            : "Invoices show up as technicians generate them."}
                    </p>
                </div>
            ) : (
                <div className="space-y-3 pb-8">
                    {payments.map((p) => {
                        const isCash = p.method === "cash";

                        return (
                            <div key={p._id} className="bg-white border border-gray-200 rounded-xl p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="text-xs font-mono text-gray-400">{p.invoiceNumber}</span>
                                            <span className={"text-xs font-semibold px-2 py-0.5 rounded-full " + STATUS_STYLES[p.status]}>
                                                {STATUS_LABELS[p.status] || p.status}
                                            </span>
                                            <span className={"text-[10px] font-bold px-1.5 py-0.5 rounded uppercase " + (isCash ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600")}>
                                                {p.method}
                                            </span>
                                        </div>

                                        <p className="font-semibold text-gray-900">Ticket {p.ticketNumber}</p>

                                        {p.razorpayPaymentId && (
                                            <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">
                                                {p.razorpayPaymentId}
                                            </p>
                                        )}

                                        <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs">
                                            {p.collectedBy?.name && (
                                                <span className="text-gray-500">Collected by {p.collectedBy.name}</span>
                                            )}
                                            {p.commissionDisplay && p.commissionDisplay !== "0.00" && (
                                                <span className="text-gray-500">
                                                    Commission Rs {p.commissionDisplay}
                                                </span>
                                            )}
                                            {p.gatewayFeeDisplay && p.gatewayFeeDisplay !== "0.00" && (
                                                <span className="text-gray-500">
                                                    Gateway fee Rs {p.gatewayFeeDisplay}
                                                </span>
                                            )}
                                        </div>

                                        {p.verifiedBy?.name && (
                                            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                                <ShieldCheck className="w-3 h-3" /> Verified by {p.verifiedBy.name}
                                            </p>
                                        )}
                                    </div>

                                    <div className="shrink-0 text-right">
                                        <p className="text-lg font-bold text-gray-900">Rs {p.amountDisplay}</p>
                                        <p className="text-xs text-gray-400">
                                            {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                        </p>

                                        {/* Cash never entered the company account, so there is
                                            nothing here to match against a statement. What
                                            matters is the technician's deposit, in Wallets. */}
                                        {canVerify && p.status === "collected" && !isCash && (
                                            <button
                                                onClick={() => handleVerify(p._id)}
                                                disabled={verifyingId === p._id}
                                                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg"
                                            >
                                                {verifyingId === p._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                                Verify
                                            </button>
                                        )}

                                        {isCash && p.status === "collected" && hasPermission("VIEW_WALLETS") && (
                                            <Link
                                                to="/admin/wallets"
                                                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800"
                                            >
                                                Settle in Wallets
                                                <ArrowRight className="w-3 h-3" />
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </AdminLayout>
    );
};

const SummaryCard = ({ label, value, count, tone, href, hint }) => {
    const tones = {
        blue: "text-blue-700",
        green: "text-green-700",
        amber: "text-amber-700",
        gray: "text-gray-900",
    };

    const body = (
        <>
            <div className="flex items-center gap-1.5 mb-1">
                {tone === "gray" && <Banknote className="w-3.5 h-3.5 text-gray-400" />}
                <p className="text-xs font-medium text-gray-500">{label}</p>
            </div>
            <p className={"text-xl font-bold " + tones[tone]}>Rs {value || "0.00"}</p>
            <p className="text-xs text-gray-400">
                {count || 0} invoice{count === 1 ? "" : "s"}{hint ? " · " + hint : ""}
            </p>
        </>
    );

    if (href) {
        return (
            <Link to={href} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors">
                {body}
            </Link>
        );
    }

    return <div className="bg-white rounded-xl border border-gray-200 p-4">{body}</div>;
};

export default AdminPayments;