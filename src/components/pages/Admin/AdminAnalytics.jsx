import React, { useEffect, useState, useCallback } from "react";
import AdminLayout from "./AdminLayout";
import { api, getErrorMessage } from "../../services/api";
import { notifyDone, notifyError } from "../../services/notify";
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
    Loader2, AlertCircle, RefreshCw, TrendingUp, Wrench,
    Package, Download, Sheet,
} from "lucide-react";

const PERIODS = [
    { key: 7, label: "7 days" },
    { key: 30, label: "30 days" },
    { key: 90, label: "3 months" },
    { key: 365, label: "1 year" },
];

import { useAdminData } from "./AdminDataContext";

const SERVICE_COLOURS = ["#15803d", "#2563eb", "#d97706", "#7c3aed", "#dc2626", "#0891b2"];

const formatBucket = (period, groupedBy) => {
    if (groupedBy === "month") {
        const [y, m] = period.split("-");
        return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    }
    return new Date(period).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const AdminAnalytics = () => {
    const { globalRefreshTrigger } = useAdminData();
    const [days, setDays] = useState(30);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState("");

    const load = useCallback(async (period) => {
        try {
            const res = await api.get("/admin/analytics/revenue", { params: { days: period } });
            setData(res.data.data);
            setError("");
        } catch (err) {
            setError(getErrorMessage(err, "Could not load analytics"));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        load(days);
    }, [days, load, globalRefreshTrigger]);

    const handleDownload = async () => {
        setDownloading(true);
        try {
            // responseType blob - without it axios parses the CSV as text and
            // the download comes out mangled
            const res = await api.get("/admin/analytics/export", {
                params: { days },
                responseType: "blob",
            });

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            link.href = url;
            link.download = "cosmosgen-revenue-" + new Date().toISOString().split("T")[0] + ".csv";
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            notifyDone("Export downloaded", "Open it in Excel or import into Google Sheets");
        } catch {
            notifyError("Could not build the export", "Try a shorter period");
        } finally {
            setDownloading(false);
        }
    };

    const summary = data?.summary || {
        totalEarnedDisplay: data?.pnl?.netCompanyDisplay ?? data?.pnl?.commissionDisplay ?? "0",
        verifiedDisplay: data?.pnl?.commissionDisplay ?? "0",
        collectedDisplay: data?.pnl?.technicianShareDisplay ?? "0",
        pendingDisplay: data?.pending?.display ?? "0",
    };

    const chartData = (data?.series || []).map((s) => ({
        ...s,
        label: formatBucket(s.period, data.groupedBy),
    }));

    return (
        <AdminLayout>
            <div className="flex items-start justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Analytics</h1>
                    <p className="text-gray-500 text-sm mt-1">Revenue, technicians, and services.</p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={() => { setRefreshing(true); load(days); }}
                        disabled={refreshing}
                        className="p-2.5 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                        <RefreshCw className={"w-4 h-4 " + (refreshing ? "animate-spin" : "")} />
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-semibold rounded-lg"
                    >
                        {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        <span className="hidden sm:inline">Export CSV</span>
                    </button>
                </div>
            </div>

            <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit overflow-x-auto max-w-full">
                {PERIODS.map((p) => (
                    <button
                        key={p.key}
                        onClick={() => setDays(p.key)}
                        className={"px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors " + (days === p.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-red-800">{error}</p>
                        <button
                            onClick={() => { setLoading(true); setError(""); load(days); }}
                            className="mt-2 text-xs font-semibold text-red-700 hover:text-red-900 underline"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-28 animate-pulse" />
                        ))}
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 h-72 animate-pulse" />
                </div>
            ) : data ? (
                <div className="space-y-4 pb-8">

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="bg-slate-900 text-white rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingUp className="w-4 h-4 text-white/60" />
                                <p className="text-sm font-medium text-white/60">Total collected</p>
                            </div>
                            <p className="text-2xl font-bold">Rs {summary.totalEarnedDisplay}</p>
                            <p className="text-xs text-white/50 mt-1">Last {data.periodDays} days</p>
                        </div>

                        <StatCard label="Verified" value={summary.verifiedDisplay} sub="Counted and confirmed" />
                        <StatCard label="Not verified yet" value={summary.collectedDisplay} sub="Waiting for settlement" />
                        <StatCard label="Awaiting payment" value={summary.pendingDisplay} sub="Invoices sent, unpaid" />
                    </div>

                    {/* Company Profit Breakdown */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100 p-4 lg:p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">Company Profit</span>
                            <h2 className="font-bold text-green-900 text-sm">Where the collected money went</h2>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-xs font-medium text-green-800/70 mb-0.5">Gross amount</p>
                                <p className="text-lg font-bold text-green-900">Rs {data.pnl.grossDisplay}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-green-800/70 mb-0.5">Technicians' share</p>
                                <p className="text-lg font-bold text-green-900">- Rs {data.pnl.technicianShareDisplay}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-green-800/70 mb-0.5">Payment gateway fees</p>
                                <p className="text-lg font-bold text-green-900">- Rs {data.pnl.gatewayFeeDisplay}</p>
                            </div>
                            <div className="border-l border-green-200/50 pl-4">
                                <p className="text-xs font-bold text-green-800 mb-0.5">Net Company Commission</p>
                                <p className="text-2xl font-black text-green-700">Rs {data.pnl.netCompanyDisplay}</p>
                            </div>
                        </div>
                    </div>

                    {/* Revenue over time */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-gray-900 text-sm">Revenue over time</h2>
                            <span className="text-xs text-gray-400">
                                Grouped by {data.groupedBy}
                            </span>
                        </div>

                        {chartData.length === 0 ? (
                            <p className="text-sm text-gray-500 py-12 text-center">No revenue in this period.</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={280} minHeight={280}>
                                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="onlineFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#d97706" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#d97706" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        formatter={(value, name) => ["Rs " + value.toLocaleString("en-IN"), name]}
                                        contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                    <Area type="monotone" dataKey="online" name="Online" stroke="#2563eb" strokeWidth={2} fill="url(#onlineFill)" />
                                    <Area type="monotone" dataKey="cash" name="Cash" stroke="#d97706" strokeWidth={2} fill="url(#cashFill)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                        {/* Top technicians */}
                        <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Wrench className="w-4 h-4 text-gray-400" />
                                <h2 className="font-bold text-gray-900 text-sm">Top technicians</h2>
                            </div>

                            {data.byTechnician.length === 0 ? (
                                <p className="text-sm text-gray-500 py-12 text-center">Nothing in this period.</p>
                            ) : (
                                <>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <BarChart
                                            data={data.byTechnician.slice(0, 6)}
                                            layout="vertical"
                                            margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                            <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                                            <YAxis
                                                type="category"
                                                dataKey="name"
                                                width={90}
                                                tick={{ fontSize: 11, fill: "#64748b" }}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <Tooltip
                                                formatter={(value) => ["Rs " + value.toLocaleString("en-IN"), "Collected"]}
                                                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
                                            />
                                            <Bar dataKey="gross" fill="#15803d" radius={[0, 6, 6, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>

                                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                                        {data.byTechnician.map((t, i) => (
                                            <div key={i} className="flex items-center justify-between gap-3 py-1.5">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">
                                                        {i + 1}
                                                    </span>
                                                    <span className="text-sm text-gray-900 truncate">{t.name}</span>
                                                    <span className="text-xs text-gray-400 shrink-0">{t.jobs} jobs</span>
                                                </div>
                                                <span className="text-sm font-bold text-gray-900 shrink-0">
                                                    Rs {t.grossDisplay}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Revenue by service */}
                        <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Package className="w-4 h-4 text-gray-400" />
                                <h2 className="font-bold text-gray-900 text-sm">Revenue by service</h2>
                            </div>

                            {data.byService.length === 0 ? (
                                <p className="text-sm text-gray-500 py-12 text-center">Nothing in this period.</p>
                            ) : (
                                <>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <Pie
                                                data={data.byService}
                                                dataKey="revenue"
                                                nameKey="service"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={55}
                                                outerRadius={85}
                                                paddingAngle={2}
                                            >
                                                {data.byService.map((_, i) => (
                                                    <Cell key={i} fill={SERVICE_COLOURS[i % SERVICE_COLOURS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value) => ["Rs " + value.toLocaleString("en-IN"), "Revenue"]}
                                                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>

                                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                                        {data.byService.map((s, i) => (
                                            <div key={i} className="flex items-center justify-between gap-3 py-1.5">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <span
                                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                                        style={{ backgroundColor: SERVICE_COLOURS[i % SERVICE_COLOURS.length] }}
                                                    />
                                                    <span className="text-sm text-gray-900 truncate">{s.service}</span>
                                                    <span className="text-xs text-gray-400 shrink-0">{s.jobs} jobs</span>
                                                </div>
                                                <span className="text-sm font-bold text-gray-900 shrink-0">
                                                    Rs {s.revenueDisplay}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Job counts */}
                    <div className="grid grid-cols-3 gap-3">
                        <StatCard label="Jobs closed" value={data.tickets.closed} sub="Completed and paid" plain />
                        <StatCard label="Still open" value={data.tickets.open} sub="In progress right now" plain />
                        <StatCard label="Cancelled" value={data.tickets.cancelled} sub="Called off" plain />
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5">
                        <Sheet className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-blue-900">Working in Google Sheets?</p>
                            <p className="text-xs text-blue-700 mt-0.5">
                                Download the CSV, then in Sheets use File &rarr; Import &rarr; Upload.
                                Every closed job in this period comes through with its commission split.
                            </p>
                        </div>
                    </div>
                </div>
            ) : !error ? (
                <div className="text-center py-16">
                    <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm font-medium">No analytics data available</p>
                    <p className="text-gray-400 text-xs mt-1">Try changing the period or check back later.</p>
                </div>
            ) : null}
        </AdminLayout>
    );
};

const StatCard = ({ label, value, sub, plain }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{plain ? value : "Rs " + value}</p>
        <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
);

export default AdminAnalytics;