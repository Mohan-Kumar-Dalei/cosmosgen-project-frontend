import { useEffect, useState, useCallback } from "react";
import { api, getErrorMessage } from "../../services/api";
import CopyText from "../../ui/CopyText";
import {
    AlertCircle, Phone, MapPin, ArrowDownLeft, ArrowUpRight, HandCoins,
} from "lucide-react";

/**
 * Money moving between the company and its technicians - which is a different
 * thing from a customer paying a bill.
 *
 * A technician clearing what they owe on cash jobs, or the company paying out
 * their share of an online one, only existed as sentences buried in each
 * technician's passbook. Nobody could answer "who has settled in cash this
 * week" without opening every wallet in turn.
 */
const FILTERS = [
    { key: "all", label: "All" },
    { key: "in", label: "Vendor paid us" },
    { key: "out", label: "We paid the vendor" },
];

const METHOD_STYLES = {
    Cash: "bg-warn-tint text-warn",
    UPI: "bg-info-tint text-info",
    Razorpay: "bg-info-tint text-info",
    "Bank Transfer": "bg-sunken text-ink",
};

const SettlementsPanel = ({ refreshSignal, search = "" }) => {
    const [direction, setDirection] = useState("in");
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = { direction };
            if (search.trim().length >= 2) params.search = search.trim();

            const res = await api.get("/admin/settlements", { params });
            setRows(res.data.data);
            setSummary(res.data.summary);
            setError("");
        } catch (err) {
            setError(getErrorMessage(err, "Could not load settlements"));
        } finally {
            setLoading(false);
        }
    }, [direction, search]);

    useEffect(() => {
        const timer = setTimeout(load, search ? 350 : 0);
        return () => clearTimeout(timer);
    }, [load, refreshSignal, search]);

    return (
        <div>
            {error && (
                <div className="mb-4 p-4 bg-danger-tint border border-hairline rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold text-danger">{error}</p>
                </div>
            )}

            {summary && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                    <div className="cg-card p-4">
                        <div className="flex items-center gap-1.5 mb-1">
                            <ArrowDownLeft className="w-3.5 h-3.5 text-brand" />
                            <p className="text-xs font-medium text-ink-soft">Vendors paid us</p>
                        </div>
                        <p className="text-xl font-bold text-brand">Rs {summary.collectedDisplay}</p>
                        <p className="text-xs text-ink-faint">{summary.collectedCount} settlements</p>
                    </div>

                    <div className="cg-card p-4">
                        <div className="flex items-center gap-1.5 mb-1">
                            <ArrowUpRight className="w-3.5 h-3.5 text-ink-soft" />
                            <p className="text-xs font-medium text-ink-soft">We paid vendors</p>
                        </div>
                        <p className="text-xl font-bold text-ink">Rs {summary.paidOutDisplay}</p>
                        <p className="text-xs text-ink-faint">{summary.paidOutCount} payouts</p>
                    </div>

                    <div className="cg-card p-4">
                        <p className="text-xs font-medium text-ink-soft mb-1.5">How it came in</p>
                        <div className="flex flex-wrap gap-1">
                            {summary.byMethod.map((m) => (
                                <span
                                    key={m.name}
                                    className={"text-[11px] font-semibold px-1.5 py-0.5 rounded " + (METHOD_STYLES[m.name] || "bg-sunken text-ink-soft")}
                                >
                                    {m.name} Rs {m.amountDisplay}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex gap-1 mb-4 flex-wrap">
                {FILTERS.map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setDirection(f.key)}
                        className={"px-3 py-1 text-xs font-semibold rounded-full border " + (direction === f.key ? "bg-ink text-white border-ink" : "bg-white text-ink-soft border-hairline hover:border-hairline-strong")}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="cg-card p-4 h-20 animate-pulse" />
                    ))}
                </div>
            ) : rows.length === 0 ? (
                <div className="cg-card p-10 text-center">
                    <HandCoins className="w-8 h-8 text-ink-faint mx-auto mb-2" />
                    <p className="font-semibold text-ink">
                        {search.trim() ? "No match" : "Nothing recorded yet"}
                    </p>
                    <p className="text-sm text-ink-soft mt-1">
                        {search.trim()
                            ? "Nothing here for \"" + search.trim() + "\"."
                            : "Settlements show up here as vendors clear their dues."}
                    </p>
                </div>
            ) : (
                <div className="space-y-2 pb-8">
                    {rows.map((r) => <SettlementRow key={r._id} row={r} />)}
                </div>
            )}
        </div>
    );
};

const SettlementRow = ({ row }) => {
    const incoming = row.direction === "technician_paid";

    return (
        <div className={"bg-white border rounded-xl p-4 " + (incoming ? "border-hairline" : "border-hairline")}>
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={"text-[10px] font-bold px-1.5 py-0.5 rounded uppercase " + (incoming ? "bg-brand-tint text-brand" : "bg-ink text-white")}>
                            {incoming ? "Vendor paid" : "We paid out"}
                        </span>
                        {row.method ? (
                            <span className={"text-[10px] font-bold px-1.5 py-0.5 rounded uppercase " + (METHOD_STYLES[row.method] || "bg-sunken text-ink-soft")}>
                                {row.method}
                            </span>
                        ) : (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-sunken text-ink-faint">
                                method not recorded
                            </span>
                        )}
                    </div>

                    {/* A technician removed from the roster still has history,
                        and blanking the name hides who the money involved. */}
                    <p className="font-semibold text-ink">
                        {row.technician?.name || "Removed vendor"}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-ink-soft mt-0.5 flex-wrap">
                        {row.technician?.phone && (
                            <a href={"tel:" + row.technician.phone} className="flex items-center gap-0.5 hover:text-ink">
                                <Phone className="w-3 h-3" /> {row.technician.phone}
                            </a>
                        )}
                        {row.technician?.area && (
                            <span className="flex items-center gap-0.5 truncate">
                                <MapPin className="w-3 h-3 shrink-0" /> {row.technician.area}
                            </span>
                        )}
                    </div>

                    {row.reference ? (
                        <div className="mt-1.5">
                            <CopyText
                                value={row.reference}
                                className="text-xs text-ink-soft min-w-0"
                                textClass="font-mono"
                                title="Copy this reference"
                            />
                        </div>
                    ) : (
                        <p className="mt-1.5 text-xs text-ink-faint">
                            No reference on this entry
                        </p>
                    )}
                </div>

                <div className="shrink-0 text-right">
                    <p className={"text-lg font-bold " + (incoming ? "text-brand" : "text-ink")}>
                        {incoming ? "+" : "-"} Rs {row.amountDisplay}
                    </p>
                    <p className="text-xs text-ink-faint">
                        {new Date(row.createdAt).toLocaleString("en-IN", {
                            day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
                        })}
                    </p>
                    <p className="text-[11px] text-ink-faint mt-0.5">
                        Balance after: Rs {row.balanceAfterDisplay}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SettlementsPanel;
