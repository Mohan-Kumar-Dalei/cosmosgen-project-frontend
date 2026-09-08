import { useEffect, useState, useCallback } from "react";
import AdminLayout from "./AdminLayout";
import { api, getErrorMessage } from "../../services/api";
import { notifyDone, notifyError } from "../../services/notify";
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
    Loader2, AlertCircle, TrendingUp, Wrench,
    Package, Download, Sheet, RefreshCw,
} from "lucide-react";

const PERIODS = [
    { key: 7, label: "7 days" },
    { key: 30, label: "30 days" },
    { key: 90, label: "3 months" },
    { key: 365, label: "1 year" },
];


const SERVICE_COLOURS = ["#15803d", "#2563eb", "#d97706", "#7c3aed", "#dc2626", "#0891b2"];

const formatBucket = (period, groupedBy) => {
    if (groupedBy === "month") {
        const [y, m] = period.split("-");
        return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    }
    return new Date(period).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const AdminAnalytics = () => {
    const [days, setDays] = useState(30);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState("");
    const [refreshing, setRefreshing] = useState(false);

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
    }, [days, load]);

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

    // Share of collected money taken online, for the split bar. Guarded against
    // a period with no payments at all, where the division would be NaN and the
    // bar would render at no width.
    const splitTotal = (data?.split?.cash?.gross || 0) + (data?.split?.online?.gross || 0);
    const onlineSharePercent = splitTotal > 0
        ? Math.round(((data?.split?.online?.gross || 0) / splitTotal) * 100)
        : 0;

    return (
        <AdminLayout>
            <div className="flex items-start justify-between gap-3 mb-6">
                <div>
                    <h1 className="cg-h1">Analytics</h1>
                    <p className="cg-sub mt-1">Revenue, vendors, and services.</p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={() => { setRefreshing(true); load(days); }}
                        disabled={refreshing}
                        className="cg-icon-btn shrink-0"
                    >
                        <RefreshCw className={"w-4 h-4 " + (refreshing ? "animate-spin" : "")} />
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-ink hover:bg-black disabled:opacity-50 text-white text-sm font-semibold rounded-lg"
                    >
                        {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        <span className="hidden sm:inline">Export CSV</span>
                    </button>
                </div>
            </div>

            <div className="cg-tabs mb-6">
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

            {error && (
                <div className="mb-4 p-4 bg-danger-tint border border-hairline rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-danger">{error}</p>
                        <button
                            onClick={() => { setLoading(true); setError(""); load(days); }}
                            className="mt-2 text-xs font-semibold text-danger hover:text-red-900 underline"
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
                            <div key={i} className="cg-card p-5 h-28 animate-pulse" />
                        ))}
                    </div>
                    <div className="cg-card h-72 animate-pulse" />
                </div>
            ) : data ? (
                <div className="space-y-4 pb-8">

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="bg-ink text-white rounded-xl p-5">
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
                            <span className="bg-brand text-white text-xs font-bold px-2 py-0.5 rounded-full">Company Profit</span>
                            <h2 className="font-bold text-green-900 text-sm">Where the collected money went</h2>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-xs font-medium text-brand/70 mb-0.5">Gross amount</p>
                                <p className="text-lg font-bold text-green-900">Rs {data.pnl.grossDisplay}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-brand/70 mb-0.5">Vendors' share</p>
                                <p className="text-lg font-bold text-green-900">- Rs {data.pnl.technicianShareDisplay}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-brand/70 mb-0.5">Payment gateway fees</p>
                                <p className="text-lg font-bold text-green-900">- Rs {data.pnl.gatewayFeeDisplay}</p>
                            </div>
                            <div className="border-l border-hairline/50 pl-4">
                                <p className="text-xs font-bold text-brand mb-0.5">Net Company Commission</p>
                                <p className="text-2xl font-black text-brand">Rs {data.pnl.netCompanyDisplay}</p>
                            </div>
                        </div>
                    </div>

                    {/* Revenue over time */}
                    <div className="cg-card p-4 lg:p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="cg-h2">Revenue over time</h2>
                            <span className="text-xs text-ink-faint">
                                Grouped by {data.groupedBy}
                            </span>
                        </div>

                        {/* The split as numbers, not only as two overlapping areas.
                            A single online payment among many cash ones is almost
                            invisible on the chart but still needs to be readable. */}
                        {(data.split.cash.gross > 0 || data.split.online.gross > 0) && (
                            <div className="mb-4">
                                <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 mb-2">
                                    <span className="flex items-baseline gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 self-center" />
                                        <span className="text-xs text-ink-soft">Online</span>
                                        <span className="text-sm font-bold text-ink">Rs {data.split.online.grossDisplay}</span>
                                        <span className="text-xs text-ink-faint">{data.split.online.jobs} jobs</span>
                                    </span>
                                    <span className="flex items-baseline gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-600 self-center" />
                                        <span className="text-xs text-ink-soft">Cash</span>
                                        <span className="text-sm font-bold text-ink">Rs {data.split.cash.grossDisplay}</span>
                                        <span className="text-xs text-ink-faint">{data.split.cash.jobs} jobs</span>
                                    </span>
                                </div>
                                <div className="flex h-2 rounded-full overflow-hidden bg-sunken">
                                    <div
                                        className="bg-blue-600"
                                        style={{ width: onlineSharePercent + "%" }}
                                        title={"Online: Rs " + data.split.online.grossDisplay}
                                    />
                                    <div
                                        className="bg-amber-600"
                                        style={{ width: (100 - onlineSharePercent) + "%" }}
                                        title={"Cash: Rs " + data.split.cash.grossDisplay}
                                    />
                                </div>
                            </div>
                        )}

                        {chartData.length === 0 ? (
                            <p className="text-sm text-ink-soft py-12 text-center">No revenue in this period.</p>
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
                                    {/* Cash is drawn first on purpose. These areas both sit on
                                        the zero baseline rather than stacking, so whichever is
                                        drawn last covers the other - and cash is usually the
                                        bigger number, which was hiding the online line entirely. */}
                                    <Area type="monotone" dataKey="cash" name="Cash" stroke="#d97706" strokeWidth={2} fill="url(#cashFill)" />
                                    <Area type="monotone" dataKey="online" name="Online" stroke="#2563eb" strokeWidth={2.5} fill="url(#onlineFill)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                        {/* Top technicians */}
                        <div className="cg-card p-4 lg:p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Wrench className="w-4 h-4 text-ink-faint" />
                                <h2 className="cg-h2">Top vendors</h2>
                            </div>

                            {data.byTechnician.length === 0 ? (
                                <p className="text-sm text-ink-soft py-12 text-center">Nothing in this period.</p>
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

                                    <div className="mt-3 pt-3 border-t border-hairline space-y-1">
                                        {data.byTechnician.map((t, i) => (
                                            <div key={i} className="flex items-center justify-between gap-3 py-1.5">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <span className="w-5 h-5 rounded-full bg-sunken flex items-center justify-center text-[10px] font-bold text-ink-soft shrink-0">
                                                        {i + 1}
                                                    </span>
                                                    <span className="text-sm text-ink truncate">{t.name}</span>
                                                    <span className="text-xs text-ink-faint shrink-0">{t.jobs} jobs</span>
                                                </div>
                                                <span className="text-sm font-bold text-ink shrink-0">
                                                    Rs {t.grossDisplay}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Revenue by service */}
                        <div className="cg-card p-4 lg:p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Package className="w-4 h-4 text-ink-faint" />
                                <h2 className="cg-h2">Revenue by service</h2>
                            </div>

                            {data.byService.length === 0 ? (
                                <p className="text-sm text-ink-soft py-12 text-center">Nothing in this period.</p>
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

                                    <div className="mt-3 pt-3 border-t border-hairline space-y-1">
                                        {data.byService.map((s, i) => (
                                            <div key={i} className="flex items-center justify-between gap-3 py-1.5">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <span
                                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                                        style={{ backgroundColor: SERVICE_COLOURS[i % SERVICE_COLOURS.length] }}
                                                    />
                                                    <span className="text-sm text-ink truncate">{s.service}</span>
                                                    <span className="text-xs text-ink-faint shrink-0">{s.jobs} jobs</span>
                                                </div>
                                                <span className="text-sm font-bold text-ink shrink-0">
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

                    <div className="p-4 bg-info-tint border border-hairline rounded-xl flex items-start gap-2.5">
                        <Sheet className="w-4 h-4 text-info shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-info">Working in Google Sheets?</p>
                            <p className="text-xs text-info mt-0.5">
                                Download the CSV, then in Sheets use File &rarr; Import &rarr; Upload.
                                Every closed job in this period comes through with its commission split.
                            </p>
                        </div>
                    </div>
                </div>
            ) : !error ? (
                <div className="text-center py-16">
                    <TrendingUp className="w-10 h-10 text-ink-faint mx-auto mb-3" />
                    <p className="text-ink-soft text-sm font-medium">No analytics data available</p>
                    <p className="text-ink-faint text-xs mt-1">Try changing the period or check back later.</p>
                </div>
            ) : null}
        </AdminLayout>
    );
};

const StatCard = ({ label, value, sub, plain }) => (
    <div className="cg-card p-5">
        <p className="text-sm font-medium text-ink-soft mb-1">{label}</p>
        <p className="cg-h1">{plain ? value : "Rs " + value}</p>
        <p className="text-xs text-ink-faint mt-1">{sub}</p>
    </div>
);

export default AdminAnalytics;