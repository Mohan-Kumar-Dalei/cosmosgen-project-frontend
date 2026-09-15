import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Map, RefreshCw, ArrowLeft, Info, TrendingUp } from "lucide-react";
import { DeveloperShell } from "./DeveloperShell";
import { api, getErrorMessage } from "../../services/api";

/**
 * What the maps cost, and which call is costing it.
 *
 * The key ring page answers "is this key alive". This one answers the question
 * that actually arrives at the end of a month: the bill moved, why. Google
 * bills an autocomplete request and a route matrix under the same word -
 * "Maps" - and prices them an order of magnitude apart, so one total tells you
 * nothing you can act on.
 *
 * Every figure here is an estimate and the page says so out loud. The call
 * counts are exact, because this server counts them itself; the rupees are the
 * counts multiplied by list prices somebody has to keep current by hand in
 * `config/mapRates.js`, and an account's real bill has its own free allowance
 * and whatever it has negotiated. So the page is for comparing one kind of
 * call against another and one day against the next - not for reconciling
 * against an invoice, which only the Google console can do.
 */
const rupees = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const dayLabel = (day) => {
    const d = new Date(day + "T00:00:00");
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const DeveloperMaps = () => {
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [days, setDays] = useState(14);

    /*
     * "Loading" is worked out, not stored.
     *
     * It is exactly "what we hold is for a different window than the one
     * asked for", which the data already says - and storing it meant setting
     * state inside the effect, the cascading render React warns about.
     */
    const loading = !error && data?.days !== days;

    const load = useCallback(async (span) => {
        try {
            const res = await api.get("/admin/map-usage", { params: { days: span } });
            setData(res.data.data);
            setError("");
        } catch (err) {
            setError(getErrorMessage(err, "Could not read the map usage"));
        }
    }, []);

    useEffect(() => { load(days); }, [days, load]);

    const rates = data?.rates || {};
    const rows = data?.rows || [];
    const period = data?.period || { calls: 0, rupees: 0, kinds: {} };
    const todayRow = rows.find((r) => r.day === data?.today);

    // The tallest day, so the bars below have something honest to scale against
    const peak = Math.max(1, ...rows.map((r) => r.total));

    // Biggest spender first: the point of the page is which one to look at
    const kindOrder = Object.entries(period.kinds || {})
        .sort((a, b) => b[1].rupees - a[1].rupees);

    return (
        <DeveloperShell>
            <div className="mx-auto max-w-5xl px-5 sm:px-8 py-8">
                <Link
                    to="/developer"
                    className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--dev-soft)] hover:text-[var(--dev-ink)] transition-colors mb-6"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Keys
                </Link>

                <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="min-w-0">
                        <h1 className="flex items-center gap-2.5 text-[22px] font-semibold tracking-tight">
                            <Map className="w-5 h-5 text-[var(--dev-faint)]" />
                            Map spend
                        </h1>
                        <p className="mt-1 text-[13.5px] text-[var(--dev-soft)]">
                            Every paid call this server makes to a map provider, counted here and
                            priced in rupees.
                        </p>
                    </div>

                    <button
                        onClick={() => load(days)}
                        disabled={loading}
                        className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--dev-line)] bg-[var(--dev-card)] text-[12.5px] text-[var(--dev-soft)] hover:text-[var(--dev-ink)] transition-colors"
                    >
                        <RefreshCw className={"w-3.5 h-3.5 " + (loading ? "animate-spin" : "")} />
                        Refresh
                    </button>
                </div>

                {error && (
                    <p className="mt-4 p-3 rounded-lg border border-[var(--dev-line)] bg-[var(--dev-card)] text-[13px] text-red-500">
                        {error}
                    </p>
                )}

                {/* Said before any number is read, not tucked underneath it */}
                <div className="mt-6 flex gap-2.5 p-3.5 rounded-xl border border-[var(--dev-line)] bg-[var(--dev-card)]">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-[var(--dev-faint)]" />
                    <p className="text-[12.5px] leading-relaxed text-[var(--dev-soft)]">
                        <span className="text-[var(--dev-ink)] font-medium">The counts are exact; the rupees are an estimate.</span>{" "}
                        Priced at list rates last checked on {data?.config?.reviewedOn || "-"}, at{" "}
                        &#8377;{data?.config?.inrPerUsd || "-"} to the dollar.{" "}
                        {data?.config?.freeAllowanceNote}
                    </p>
                </div>

                {/* Today, then the window - the two numbers anybody opens this for */}
                <div className="mt-6 grid sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl border border-[var(--dev-line)] bg-[var(--dev-card)]">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--dev-faint)]">Today</p>
                        <p className="mt-2 text-[26px] font-semibold tracking-tight tabular-nums">
                            {rupees(todayRow?.rupees || 0)}
                        </p>
                        <p className="mt-1 text-[12.5px] text-[var(--dev-soft)] tabular-nums">
                            {(todayRow?.total || 0).toLocaleString("en-IN")} calls
                        </p>
                    </div>

                    <div className="p-4 rounded-xl border border-[var(--dev-line)] bg-[var(--dev-card)]">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--dev-faint)]">
                            Last {data?.days || days} days
                        </p>
                        <p className="mt-2 text-[26px] font-semibold tracking-tight tabular-nums">
                            {rupees(period.rupees)}
                        </p>
                        <p className="mt-1 text-[12.5px] text-[var(--dev-soft)] tabular-nums">
                            {period.calls.toLocaleString("en-IN")} calls
                        </p>
                    </div>

                    <div className="p-4 rounded-xl border border-[var(--dev-line)] bg-[var(--dev-card)]">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--dev-faint)]">
                            At this rate, a month
                        </p>
                        <p className="mt-2 text-[26px] font-semibold tracking-tight tabular-nums">
                            {rupees(period.rupees / Math.max(1, data?.days || days) * 30)}
                        </p>
                        <p className="mt-1 text-[12.5px] text-[var(--dev-soft)]">
                            the window&rsquo;s daily average, over thirty days
                        </p>
                    </div>
                </div>

                {/* Which call is the money */}
                <h2 className="mt-10 mb-3 flex items-center gap-2 text-[15px] font-semibold tracking-tight">
                    <TrendingUp className="w-4 h-4 text-[var(--dev-faint)]" />
                    Where it goes
                </h2>

                {kindOrder.length === 0 ? (
                    <p className="p-4 rounded-xl border border-[var(--dev-line)] bg-[var(--dev-card)] text-[13px] text-[var(--dev-soft)]">
                        {loading ? "Reading the counters." : "No map calls in this window."}
                    </p>
                ) : (
                    <div className="rounded-xl border border-[var(--dev-line)] bg-[var(--dev-card)] overflow-hidden">
                        {kindOrder.map(([kind, entry]) => {
                            const rate = rates[kind] || {};
                            const share = period.rupees > 0 ? (entry.rupees / period.rupees) * 100 : 0;

                            return (
                                <div key={kind} className="p-4 border-b border-[var(--dev-line)] last:border-0">
                                    <div className="flex items-baseline justify-between gap-4">
                                        <p className="text-[14px] font-medium">
                                            {rate.label || kind}
                                        </p>
                                        <p className="text-[14px] font-semibold tabular-nums shrink-0">
                                            {rupees(entry.rupees)}
                                        </p>
                                    </div>

                                    <div className="mt-2 flex items-center gap-3">
                                        <span className="h-1.5 flex-1 rounded-full bg-[var(--dev-line)] overflow-hidden">
                                            <span
                                                className="block h-full rounded-full bg-[var(--dev-ink)]"
                                                style={{ width: Math.max(2, share) + "%" }}
                                            />
                                        </span>
                                        <span className="text-[11.5px] text-[var(--dev-faint)] tabular-nums shrink-0">
                                            {entry.count.toLocaleString("en-IN")} calls
                                            {rate.usd != null && (
                                                <> &middot; ${rate.usd}/1k</>
                                            )}
                                        </span>
                                    </div>

                                    {rate.what && (
                                        <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--dev-soft)]">
                                            {rate.what}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Day by day */}
                <div className="mt-10 mb-3 flex items-center justify-between gap-4">
                    <h2 className="text-[15px] font-semibold tracking-tight">Day by day</h2>
                    <div className="flex gap-1.5">
                        {[7, 14, 30].map((n) => (
                            <button
                                key={n}
                                onClick={() => setDays(n)}
                                className={"h-7 px-2.5 rounded-lg text-[12px] border transition-colors "
                                    + (days === n
                                        ? "border-[var(--dev-ink)] text-[var(--dev-ink)]"
                                        : "border-[var(--dev-line)] text-[var(--dev-faint)] hover:text-[var(--dev-soft)]")}
                            >
                                {n}d
                            </button>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border border-[var(--dev-line)] bg-[var(--dev-card)] overflow-hidden">
                    {rows.length === 0 ? (
                        <p className="p-4 text-[13px] text-[var(--dev-soft)]">
                            {loading ? "Reading the counters." : "Nothing counted yet."}
                        </p>
                    ) : rows.map((row) => (
                        <div
                            key={row.day}
                            className="px-4 py-3 border-b border-[var(--dev-line)] last:border-0 flex items-center gap-4"
                        >
                            <span className="w-14 shrink-0 text-[12.5px] text-[var(--dev-soft)] tabular-nums">
                                {dayLabel(row.day)}
                            </span>

                            <span className="h-1.5 flex-1 rounded-full bg-[var(--dev-line)] overflow-hidden">
                                <span
                                    className="block h-full rounded-full bg-[var(--dev-ink)]"
                                    style={{ width: Math.max(2, (row.total / peak) * 100) + "%" }}
                                />
                            </span>

                            <span className="w-20 shrink-0 text-right text-[12.5px] text-[var(--dev-faint)] tabular-nums">
                                {row.total.toLocaleString("en-IN")}
                            </span>
                            <span className="w-24 shrink-0 text-right text-[12.5px] font-medium tabular-nums">
                                {rupees(row.rupees)}
                            </span>
                        </div>
                    ))}
                </div>

                {/* The rate card, including the free one - because two of the
                    three map views used to be paid for and are not any more,
                    and that is worth being able to point at */}
                <h2 className="mt-10 mb-3 text-[15px] font-semibold tracking-tight">The rate card</h2>

                <div className="rounded-xl border border-[var(--dev-line)] bg-[var(--dev-card)] overflow-hidden">
                    {[...Object.entries(rates), ...Object.entries(data?.views || {})].map(([kind, rate]) => (
                        <div key={kind} className="p-4 border-b border-[var(--dev-line)] last:border-0">
                            <div className="flex items-baseline justify-between gap-4">
                                <p className="text-[13.5px] font-medium">{rate.label}</p>
                                <p className="text-[13px] tabular-nums shrink-0 text-[var(--dev-soft)]">
                                    {rate.usd === 0
                                        ? "free"
                                        : "$" + rate.usd + " / 1,000 · " + rupees((rate.usd * (data?.config?.inrPerUsd || 0)) / 1000) + " each"}
                                </p>
                            </div>
                            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--dev-soft)]">
                                {rate.what}
                            </p>
                        </div>
                    ))}
                </div>

                <p className="mt-6 text-[12px] leading-relaxed text-[var(--dev-faint)]">
                    Rates live in <span className="font-mono">backend/src/config/mapRates.js</span>.
                    Correct them against Billing &rarr; Reports in the Google Cloud console and move
                    the review date, and everything on this page starts describing this account
                    rather than a list price.
                </p>
            </div>
        </DeveloperShell>
    );
};

export default DeveloperMaps;
