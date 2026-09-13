import { useCallback, useEffect, useState } from "react";
import {
    KeyRound, Plus, Loader2, Trash2, Pencil, X, Check, ArrowUpToLine,
    RotateCcw, Zap, AlertCircle, Eye, EyeOff, Copy, Gauge,
} from "lucide-react";
import { DeveloperShell } from "./DeveloperShell";
import { FIELD, LABEL } from "./theme";
import { api, getErrorMessage } from "../../services/api";

/**
 * What the platform is spending, and how much of it is left.
 *
 * This page exists because of one specific bad afternoon: the assistant stops
 * answering on WhatsApp, the website's chat stops answering, drafting a new
 * service stops working and the phone calls go quiet - all at once, all
 * because a free tier hit its daily ceiling, and none of it visible anywhere.
 * Standing on free tiers is a reasonable way to start a company; being unable
 * to see them is not.
 *
 * So every key gets the same three things, whether it is one the ring can swap
 * or one the server holds: a bar showing today against whatever ceiling has
 * been set, a ceiling that can be changed here, and the key itself, readable
 * by the one person allowed through the door.
 */
const STATUS = {
    ready: { label: "In use", tone: "text-[var(--dev-good)] bg-[var(--dev-good-tint)] border-[#cfe6d8]" },
    spent: { label: "Nothing left today", tone: "text-[var(--dev-warn)] bg-[var(--dev-warn-tint)] border-[#efdcbb]" },
    off: { label: "Switched off", tone: "text-[var(--dev-faint)] bg-[var(--dev-line-soft)] border-[var(--dev-line)]" },
};

const Chip = ({ tone, children }) => (
    <span className={"text-[10px] font-bold tracking-wide px-1.5 py-0.5 rounded border " + tone}>
        {children}
    </span>
);

const Card = ({ children, className = "" }) => (
    <div className={"rounded-2xl border border-[var(--dev-line)] bg-[var(--dev-card)] " + className}>
        {children}
    </div>
);

const Section = ({ title, lede, action, children }) => (
    <section className="mb-7">
        <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
                <h2 className="font-display font-semibold text-[16px] tracking-[-0.015em]">{title}</h2>
                {lede && (
                    <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--dev-soft)] max-w-2xl">
                        {lede}
                    </p>
                )}
            </div>
            {action}
        </div>
        {children}
    </section>
);

/**
 * How much of a day's allowance has gone.
 *
 * Three states, and the third is the one that matters: with no ceiling set
 * there is nothing honest to draw, so the bar says so and offers to take one
 * rather than drawing a full-looking bar against a number nobody knows.
 */
const Meter = ({ used, limit, peak = 0, onSetLimit, busy }) => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(limit ? String(limit) : "");

    const save = () => {
        setEditing(false);
        const next = Number(draft) || 0;
        if (next !== limit) onSetLimit(next);
    };

    if (editing) {
        return (
            <div className="flex items-center gap-1.5">
                <input
                    autoFocus
                    type="number"
                    min="0"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") save();
                        if (e.key === "Escape") setEditing(false);
                    }}
                    placeholder="Calls a day"
                    className="w-[120px] h-8 px-2.5 rounded-lg bg-[var(--dev-card)] border border-[var(--dev-blue)] text-[12.5px] tabular-nums focus:outline-none"
                />
                <button
                    onClick={save}
                    className="h-8 px-3 rounded-lg bg-[var(--dev-ink)] text-white text-[12px] font-semibold"
                >
                    Set
                </button>
                <button
                    onClick={() => setEditing(false)}
                    className="h-8 px-2 rounded-lg text-[12px] text-[var(--dev-faint)] hover:text-[var(--dev-ink)]"
                >
                    Cancel
                </button>
            </div>
        );
    }

    /*
     * A bar with something in it even when no ceiling has been set.
     *
     * Drawing an empty track until somebody types a number was technically
     * honest and useless to look at: a key that had made fifteen calls showed
     * the same flat line as one that had made none. With no quota to measure
     * against, the busiest day on record is the next best thing - it says how
     * today compares with how this key normally goes, which is the question
     * somebody scanning the column is actually asking.
     *
     * Deliberately a quieter fill than the quota bar below, and labelled with
     * what it is scaled to, so a full bar here is never mistaken for a key
     * that has run out.
     */
    if (!limit) {
        const top = Math.max(peak, used, 1);
        const share = Math.round((used / top) * 100);

        return (
            <div className="max-w-[260px]">
                <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[12.5px] tabular-nums text-[var(--dev-soft)]">
                        <span className="font-semibold text-[var(--dev-ink)]">{used}</span> today
                    </p>
                    <button
                        onClick={() => { setDraft(""); setEditing(true); }}
                        disabled={busy}
                        className="inline-flex items-center gap-1 text-[11.5px] text-[var(--dev-blue)] hover:underline"
                    >
                        <Gauge className="w-3.5 h-3.5" />
                        Set a limit
                    </button>
                </div>

                <div className="mt-1.5 h-2 rounded-full bg-[var(--dev-line-soft)] overflow-hidden">
                    <div
                        className="h-full rounded-full bg-[var(--dev-line)] transition-all duration-700"
                        style={{ width: Math.max(share, used > 0 ? 6 : 0) + "%" }}
                    />
                </div>

                <p className="mt-1 text-[11.5px] text-[var(--dev-faint)] tabular-nums">
                    {peak > 0
                        ? "No ceiling set · busiest day " + top
                        : "No ceiling set"}
                </p>
            </div>
        );
    }

    const share = Math.min(100, Math.round((used / limit) * 100));
    const hot = share >= 90;
    const warm = share >= 70;

    return (
        <div className="max-w-[260px]">
            <div className="flex items-baseline justify-between gap-3">
                <p className="text-[12.5px] tabular-nums text-[var(--dev-soft)]">
                    <span className="font-semibold text-[var(--dev-ink)]">{used}</span> of {limit} today
                </p>
                <button
                    onClick={() => { setDraft(String(limit)); setEditing(true); }}
                    disabled={busy}
                    className="text-[11.5px] text-[var(--dev-faint)] hover:text-[var(--dev-blue)]"
                >
                    {share}%
                </button>
            </div>

            <div className="mt-1.5 h-2 rounded-full bg-[var(--dev-line-soft)] overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                        width: Math.max(share, 2) + "%",
                        background: hot
                            ? "var(--dev-bad)"
                            : warm ? "var(--dev-warn)" : "var(--dev-blue)",
                    }}
                />
            </div>

            {/* The number the bar exists to answer, said in words as well -
                a percentage is not what somebody deciding whether to swap a
                key in is actually counting */}
            <p className={"mt-1 text-[11.5px] tabular-nums "
                + (hot ? "text-[var(--dev-bad)] font-semibold" : "text-[var(--dev-faint)]")}>
                {Math.max(limit - used, 0)} left today
            </p>
        </div>
    );
};

/**
 * The key itself, hidden until asked for.
 *
 * The list never carries a secret - this fetches one key on its own when the
 * eye is pressed, so a page load, a cache or a screenshot cannot leak what
 * nobody asked to see. Pressing it again puts it away.
 */
const Secret = ({ id, envVar, tail, local }) => {
    const [shown, setShown] = useState("");
    const [busy, setBusy] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState("");

    const reveal = async () => {
        if (shown) { setShown(""); return; }

        // The website's own keys are compiled into this page, so there is
        // nothing to ask the server for - and nothing it could answer, since
        // they were never in its settings
        if (local) { setShown(local); return; }

        setBusy(true);
        setError("");

        try {
            const res = await api.post("/admin/keys/reveal", id ? { id } : { envVar });
            setShown(res.data.data.secret);
        } catch (err) {
            setError(getErrorMessage(err, "Could not read that key."));
        } finally {
            setBusy(false);
        }
    };

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(shown);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        } catch {
            // A browser that refuses the clipboard is not worth an error - the
            // text is on screen to select
        }
    };

    return (
        <div className="mt-2">
            <div className="flex items-center gap-1.5">
                <code className="flex-1 min-w-0 h-8 px-2.5 rounded-lg bg-[var(--dev-paper)] border border-[var(--dev-line)] text-[12px] font-mono text-[var(--dev-soft)] flex items-center truncate">
                    {shown || (tail ? tail : "••••")}
                </code>

                <button
                    onClick={reveal}
                    disabled={busy}
                    title={shown ? "Hide it again" : "Show the whole key"}
                    aria-label={shown ? "Hide the key" : "Show the key"}
                    className="shrink-0 w-8 h-8 grid place-items-center rounded-lg border border-[var(--dev-line)] text-[var(--dev-soft)] hover:text-[var(--dev-ink)] transition-colors disabled:opacity-40"
                >
                    {busy
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : shown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>

                {shown && (
                    <button
                        onClick={copy}
                        title="Copy it"
                        aria-label="Copy the key"
                        className="shrink-0 w-8 h-8 grid place-items-center rounded-lg border border-[var(--dev-line)] text-[var(--dev-soft)] hover:text-[var(--dev-ink)] transition-colors"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-[var(--dev-good)]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                )}
            </div>

            {error && <p className="mt-1 text-[12px] text-[var(--dev-bad)]">{error}</p>}
        </div>
    );
};

/** The busiest day this key has on record, today included. */
const busiest = (row) =>
    Math.max(row.usedToday || 0, ...(row.history || []).map((d) => d.used || 0), 0);

/**
 * The fortnight behind today, as fourteen small bars.
 *
 * Today's meter answers what is left before midnight and nothing else, which
 * means a key that spent its whole allowance yesterday opens this morning
 * looking untouched. These are the days before it, scaled against the busiest
 * of them, so the shape of a habit is visible at a glance and a day that was
 * unusually heavy stands out without anybody reading a number.
 */
const History = ({ rows = [], total = 0 }) => {
    if (!rows.length) {
        return (
            <p className="text-[11.5px] text-[var(--dev-faint)] mt-2 tabular-nums">
                {total} calls in all
            </p>
        );
    }

    const peak = Math.max(...rows.map((d) => d.used), 1);

    return (
        <div className="mt-3 max-w-[260px]">
            <div className="flex items-end gap-[3px] h-7">
                {rows.map((d) => (
                    <span
                        key={d.day}
                        title={d.day + ": " + d.used}
                        className="flex-1 rounded-[2px] bg-[var(--dev-line)]"
                        style={{ height: Math.max((d.used / peak) * 100, 8) + "%" }}
                    />
                ))}
            </div>

            <div className="flex items-baseline justify-between gap-3 mt-1">
                <p className="text-[11px] text-[var(--dev-faint)]">
                    {rows.length === 1 ? "Yesterday" : "Last " + rows.length + " days"}
                </p>
                <p className="text-[11.5px] text-[var(--dev-faint)] tabular-nums">
                    {total} in all
                </p>
            </div>
        </div>
    );
};

/**
 * The keys this website itself was built with.
 *
 * They are compiled into the page rather than kept in the server's settings,
 * so the platform cannot see them and never could. This screen can, because
 * it is the website - and a key the owner has to go and find in a file is a
 * key nobody checks. Only the Maps one is listed here because it is the one
 * that is easy to confuse with the server's.
 */
const BROWSER_KEYS = {
    GOOGLE_MAPS_API_KEY: {
        envVar: "VITE_GOOGLE_MAPS_API_KEY",
        label: "Website browser key",
        kind: "key",
        where: "This website, in the browser",
        value: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    },
};

/** Everything a platform is made of, the browser's own keys included. */
const credentials = (row) => {
    const extra = BROWSER_KEYS[row.envVar];
    if (!extra) return row.fields || [];

    return [
        ...(row.fields || []),
        {
            envVar: extra.envVar,
            label: extra.label,
            kind: extra.kind,
            where: extra.where,
            calls: false,
            set: Boolean(extra.value),
            tail: extra.value ? "••••" + extra.value.slice(-4) : "",
            local: extra.value,
        },
    ];
};

/**
 * One line of a platform: what it is, what it is called, and its value.
 *
 * A platform is rarely one key. Razorpay is a key id beside a key secret
 * beside a webhook secret; Exotel is six things; and when something stops
 * working, which of them went stale is the question. So each is a row of its
 * own, named the way the provider's own dashboard names it, with the variable
 * underneath and the value behind the eye.
 */
const Credential = ({ field }) => (
    <div className="py-2.5">
        <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[12.5px] font-semibold">{field.label}</p>

            {field.calls && (
                <Chip tone="text-[var(--dev-good)] bg-[var(--dev-good-tint)] border-[#bfdcc8]">
                    IN USE HERE
                </Chip>
            )}

            {!field.set && (
                <Chip tone="text-[var(--dev-bad)] bg-[var(--dev-bad-tint)] border-[#e9c3bf]">
                    NOT SET
                </Chip>
            )}
        </div>

        <p className="text-[11.5px] font-mono text-[var(--dev-faint)] mt-0.5">
            {field.envVar}
            {field.where ? <span className="not-italic font-sans"> · {field.where}</span> : null}
        </p>

        {field.set && (
            field.kind === "url"
                ? (
                    <code className="mt-2 block h-8 px-2.5 rounded-lg bg-[var(--dev-paper)] border border-[var(--dev-line)] text-[12px] font-mono text-[var(--dev-soft)] flex items-center truncate">
                        {field.tail}
                    </code>
                )
                : <Secret envVar={field.envVar} tail={field.tail} local={field.local} />
        )}
    </div>
);

const Action = ({ title, onClick, busy, danger, children }) => (
    <button
        onClick={onClick}
        disabled={busy}
        title={title}
        aria-label={title}
        className={"w-9 h-9 grid place-items-center rounded-lg border border-[var(--dev-line)] bg-[var(--dev-card)] text-[var(--dev-soft)] transition-colors disabled:opacity-40 "
            + (danger
                ? "hover:text-[var(--dev-bad)] hover:border-[#e9c3bf]"
                : "hover:text-[var(--dev-ink)] hover:bg-[var(--dev-paper)]")}
    >
        {children}
    </button>
);

const DeveloperKeys = () => {
    const [keys, setKeys] = useState([]);
    const [env, setEnv] = useState({ keys: [], secrets: [] });
    const [health, setHealth] = useState(null);
    const [models, setModels] = useState({});
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState("");
    const [error, setError] = useState("");
    const [note, setNote] = useState("");
    const [editing, setEditing] = useState(null);
    const [adding, setAdding] = useState(false);
    const [doomed, setDoomed] = useState(null);

    const load = useCallback(async () => {
        try {
            const res = await api.get("/admin/keys");
            setKeys(res.data.data.keys || []);
            setEnv(res.data.data.environment || { keys: [], secrets: [] });
            setHealth(res.data.data.health || null);
            setModels(res.data.data.models || {});
            setError("");
        } catch (err) {
            setError(getErrorMessage(err, "Could not load the keys."));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const say = (message) => {
        setNote(message);
        setError("");
        setTimeout(() => setNote(""), 5000);
    };

    const act = async (id, path) => {
        setBusyId(id);
        setError("");

        try {
            const res = await api.post("/admin/keys/" + id + "/" + path);

            // A test reports a working key and a refused one the same way, so
            // the message is the answer rather than the HTTP status
            if (res.data.success === false) setError(res.data.message);
            else say(res.data.message || "Done.");

            await load();
        } catch (err) {
            setError(getErrorMessage(err, "That did not work."));
        } finally {
            setBusyId("");
        }
    };

    const setLimit = async (id, dailyLimit) => {
        if (!id) return;

        setBusyId(id);
        setError("");

        try {
            await api.put("/admin/keys/" + id, { dailyLimit });
            say(dailyLimit ? "Limit set to " + dailyLimit + " a day." : "Limit removed.");
            await load();
        } catch (err) {
            setError(getErrorMessage(err, "Could not set that limit."));
        } finally {
            setBusyId("");
        }
    };

    const remove = async () => {
        if (!doomed) return;
        setBusyId(doomed.id);

        try {
            const res = await api.delete("/admin/keys/" + doomed.id);
            setDoomed(null);
            say(res.data.message);
            await load();
        } catch (err) {
            setDoomed(null);
            setError(getErrorMessage(err, "Could not delete that key."));
        } finally {
            setBusyId("");
        }
    };

    const ring = keys.filter((key) => key.provider === "gemini");

    return (
        <DeveloperShell>
            <div className="mb-7">
                <h1 className="font-display font-bold text-[26px] tracking-[-0.025em]">Keys</h1>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--dev-soft)] max-w-2xl">
                    Everything the platform runs on, what each one has been asked for today, and
                    what stops working without it. Set a ceiling on any of them and the bar tells
                    you how close today has come.
                </p>
            </div>

            {error && (
                <Card className="mb-5 p-4 !border-[#e9c3bf] bg-[var(--dev-bad-tint)] flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-[var(--dev-bad)] shrink-0 mt-0.5" />
                    <p className="text-[13.5px] text-[var(--dev-bad)]">{error}</p>
                </Card>
            )}
            {note && <p className="mb-5 text-[13px] text-[var(--dev-good)]">{note}</p>}

            {/* The question anybody opening this page came to ask */}
            <Card className="p-5 mb-7">
                <div className="flex flex-wrap gap-x-10 gap-y-4">
                    {[
                        ["Gemini is using", health?.current?.label || "Nothing — every key is spent or off", false],
                        ["Chat model", health?.current?.model || models.chat || "—", true],
                        ["Voice model", models.voice || "—", true],
                        ["Ready to use", String(health?.usable ?? 0), false],
                    ].map(([label, value, mono]) => (
                        <div key={label}>
                            <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--dev-faint)]">
                                {label}
                            </p>
                            <p className={"mt-1.5 font-semibold text-[15px] " + (mono ? "font-mono" : "")}>
                                {value}
                            </p>
                        </div>
                    ))}
                </div>
            </Card>

            <Section
                title="The Gemini ring"
                lede="Tried in this order. One the provider refuses for quota is stepped past for the rest of the day and picked up again tomorrow; one it rejects outright is switched off."
                action={(
                    <button
                        onClick={() => setAdding(true)}
                        className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[var(--dev-ink)] text-white text-[13px] font-semibold hover:opacity-90 transition-opacity"
                    >
                        <Plus className="w-4 h-4" />
                        Add a key
                    </button>
                )}
            >
                {loading ? (
                    <Card className="p-10 flex justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-[var(--dev-faint)]" />
                    </Card>
                ) : ring.length === 0 ? (
                    <Card className="p-10 text-center">
                        <KeyRound className="w-8 h-8 text-[var(--dev-faint)] mx-auto mb-2" />
                        <p className="font-semibold">No keys in the ring</p>
                        <p className="text-[13px] text-[var(--dev-soft)] mt-1 max-w-md mx-auto">
                            Add one and it takes over — add two, and the second catches the first
                            running out.
                        </p>
                    </Card>
                ) : (
                    <div className="flex flex-col gap-3">
                        {ring.map((key, i) => (
                            <Card key={key.id} className="p-5">
                                <div className="flex flex-wrap items-start gap-5">
                                    <div className="min-w-[240px] flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-semibold text-[14.5px]">{key.label}</p>
                                            <Chip tone={STATUS[key.status].tone}>
                                                {STATUS[key.status].label.toUpperCase()}
                                            </Chip>
                                            {i === 0 && key.status === "ready" && (
                                                <Chip tone="text-[var(--dev-blue)] bg-[var(--dev-blue-tint)] border-[#cfe0f7]">
                                                    FIRST IN LINE
                                                </Chip>
                                            )}
                                            {key.source === "env" && (
                                                <Chip tone="text-[var(--dev-faint)] bg-[var(--dev-line-soft)] border-[var(--dev-line)]">
                                                    SERVER SETTINGS
                                                </Chip>
                                            )}
                                        </div>

                                        <p className="text-[12px] text-[var(--dev-faint)] font-mono mt-1">
                                            {key.provider}
                                            {key.model ? " · " + key.model : ""}
                                            {key.envVar ? " · " + key.envVar : ""}
                                        </p>

                                        <Secret id={key.id} tail={"••••" + key.tail} />

                                        {key.lastError && (
                                            <p className="text-[12px] text-[var(--dev-warn)] mt-2 line-clamp-2" title={key.lastError}>
                                                {key.lastError}
                                            </p>
                                        )}
                                    </div>

                                    <div className="min-w-[240px]">
                                        <Meter
                                            used={key.usedToday}
                                            limit={key.dailyLimit}
                                            peak={busiest(key)}
                                            busy={busyId === key.id}
                                            onSetLimit={(next) => setLimit(key.id, next)}
                                        />
                                        <History rows={key.history} total={key.usedTotal} />

                                        {key.failures > 0 && (
                                            <p className="text-[11.5px] text-[var(--dev-warn)] mt-1 tabular-nums">
                                                {key.failures} refused
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1 ml-auto shrink-0">
                                        {busyId === key.id && (
                                            <Loader2 className="w-4 h-4 animate-spin text-[var(--dev-faint)] mr-1" />
                                        )}

                                        <Action title="Try it now" onClick={() => act(key.id, "test")} busy={busyId === key.id}>
                                            <Zap className="w-4 h-4" />
                                        </Action>
                                        <Action title="Use this one first" onClick={() => act(key.id, "promote")} busy={busyId === key.id}>
                                            <ArrowUpToLine className="w-4 h-4" />
                                        </Action>
                                        <Action title="Clear today's count" onClick={() => act(key.id, "reset")} busy={busyId === key.id}>
                                            <RotateCcw className="w-4 h-4" />
                                        </Action>
                                        <Action title="Edit" onClick={() => setEditing(key)} busy={busyId === key.id}>
                                            <Pencil className="w-4 h-4" />
                                        </Action>
                                        {key.source !== "env" && (
                                            <Action title="Delete" onClick={() => setDoomed(key)} busy={busyId === key.id} danger>
                                                <Trash2 className="w-4 h-4" />
                                            </Action>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </Section>

            <Section
                title="Everything else the platform calls"
                lede="One key each, kept in the server's own settings. The counts are real — every send, upload, geocode and speech round trip is marked here as it happens — so a ceiling set on one of these is a warning you get before the provider gives you theirs."
            >
                <div className="flex flex-col gap-3">
                    {env.keys.map((row) => (
                        <Card key={row.envVar} className="p-5">
                            <div className="flex flex-wrap items-start gap-5">
                                <div className="min-w-[260px] flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-semibold text-[14.5px]">{row.label}</p>
                                        {row.free && (
                                            <Chip tone="text-[var(--dev-blue)] bg-[var(--dev-blue-tint)] border-[#cfe0f7]">
                                                FREE TIER
                                            </Chip>
                                        )}
                                        {row.metered && (
                                            <Chip tone="text-[var(--dev-faint)] bg-[var(--dev-line-soft)] border-[var(--dev-line)]">
                                                IN THE RING
                                            </Chip>
                                        )}
                                        {!row.set && (
                                            <Chip tone="text-[var(--dev-bad)] bg-[var(--dev-bad-tint)] border-[#e9c3bf]">
                                                NOT SET
                                            </Chip>
                                        )}
                                    </div>

                                    <p className="text-[12px] text-[var(--dev-faint)] font-mono mt-1">{row.envVar}</p>

                                    <p className="text-[13px] leading-relaxed text-[var(--dev-soft)] mt-2 max-w-xl">
                                        {row.powers}
                                    </p>

                                    {row.note && (
                                        <p className="text-[12.5px] leading-relaxed text-[var(--dev-faint)] mt-1.5 max-w-xl">
                                            {row.note}
                                        </p>
                                    )}

                                    <div className="mt-3 divide-y divide-[var(--dev-line-soft)] border-t border-[var(--dev-line-soft)] max-w-xl">
                                        {credentials(row).map((field) => (
                                            <Credential key={field.envVar} field={field} />
                                        ))}
                                    </div>
                                </div>

                                <div className="min-w-[240px]">
                                    {row.set ? (
                                        <>
                                            <Meter
                                                used={row.usedToday}
                                                limit={row.dailyLimit}
                                                peak={busiest(row)}
                                                busy={busyId === row.id}
                                                onSetLimit={(next) => setLimit(row.id, next)}
                                            />
                                            <History rows={row.history} total={row.usedTotal} />
                                        </>
                                    ) : (
                                        <p className="text-[12.5px] text-[var(--dev-faint)]">
                                            Nothing to count until it is set.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </Section>

            <Section
                title="The platform's own secrets"
                lede="No quota and no bill behind these — they are either set or the platform will not start."
            >
                <Card className="divide-y divide-[var(--dev-line-soft)]">
                    {env.secrets.map((row) => (
                        <div key={row.envVar} className="px-5 py-4 flex flex-wrap items-center gap-4">
                            <div className="min-w-[220px] flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold text-[13.5px]">{row.label}</p>
                                    {!row.set && (
                                        <Chip tone="text-[var(--dev-bad)] bg-[var(--dev-bad-tint)] border-[#e9c3bf]">
                                            NOT SET
                                        </Chip>
                                    )}
                                </div>
                                <p className="text-[12px] text-[var(--dev-soft)] mt-0.5">{row.powers}</p>
                                <p className="text-[11.5px] font-mono text-[var(--dev-faint)] mt-0.5">{row.envVar}</p>
                            </div>

                            {row.set && (
                                <div className="w-full sm:w-[300px]">
                                    <Secret envVar={row.envVar} tail="••••" />
                                </div>
                            )}
                        </div>
                    ))}
                </Card>
            </Section>

            {(adding || editing) && (
                <KeyForm
                    editing={editing}
                    defaultModel={models.chat}
                    onClose={() => { setAdding(false); setEditing(null); }}
                    onSaved={(message) => { setAdding(false); setEditing(null); say(message); load(); }}
                />
            )}

            {doomed && (
                <ConfirmDelete
                    busy={busyId === doomed.id}
                    label={doomed.label}
                    onCancel={() => setDoomed(null)}
                    onConfirm={remove}
                />
            )}
        </DeveloperShell>
    );
};

/**
 * Adding a key, and replacing one.
 *
 * Replacing is the common case, so the form is built around it: the key box is
 * empty when editing and means "leave it alone", which is what stops a rename
 * from wiping a credential. The row standing in for the server's own settings
 * can be renamed, limited and switched off, but its key is not ours to change.
 */
const KeyForm = ({ editing, defaultModel, onClose, onSaved }) => {
    const fromEnv = editing?.source === "env";

    const [form, setForm] = useState({
        label: editing?.label || "",
        secret: "",
        model: editing?.model || "",
        dailyLimit: editing?.dailyLimit ? String(editing.dailyLimit) : "",
        isActive: editing ? editing.isActive : true,
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const submit = async () => {
        setBusy(true);
        setError("");

        try {
            const body = {
                label: form.label.trim(),
                model: form.model.trim(),
                dailyLimit: Number(form.dailyLimit) || 0,
                isActive: form.isActive,
                ...(form.secret.trim() && !fromEnv ? { secret: form.secret.trim() } : {}),
            };

            const res = editing
                ? await api.put("/admin/keys/" + editing.id, body)
                : await api.post("/admin/keys", { ...body, provider: "gemini" });

            onSaved(res.data.message || "Saved.");
        } catch (err) {
            setError(getErrorMessage(err, "Could not save that key."));
            setBusy(false);
        }
    };

    const ready = form.label.trim().length > 1 && (editing || form.secret.trim().length > 7);

    return (
        <Sheet onClose={onClose}>
            <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                    <h3 className="font-display font-semibold text-[16px]">
                        {editing ? "Edit " + editing.label : "Add a Gemini key"}
                    </h3>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--dev-soft)]">
                        {fromEnv
                            ? "This key is in the server's settings. You can rename it, give it a limit or switch it off here — the key itself changes where it is set."
                            : editing
                                ? "Leave the key box empty to keep the one already saved."
                                : "From Google AI Studio. A free key is fine — that is what the ring is for."}
                    </p>
                </div>
                <button onClick={onClose} aria-label="Close" className="shrink-0 w-8 h-8 grid place-items-center rounded-lg border border-[var(--dev-line)] text-[var(--dev-soft)] hover:text-[var(--dev-ink)]">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <label className="block mb-3">
                <span className={LABEL}>What to call it</span>
                <input
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    placeholder="Gemini free — personal account"
                    className={FIELD}
                />
            </label>

            {!fromEnv && (
                <label className="block mb-3">
                    <span className={LABEL}>{editing ? "Replace the key (optional)" : "The key"}</span>
                    <input
                        value={form.secret}
                        onChange={(e) => setForm({ ...form, secret: e.target.value })}
                        placeholder={editing ? "••••" + editing.tail : "AIza…"}
                        spellCheck={false}
                        autoComplete="off"
                        className={FIELD + " font-mono"}
                    />
                </label>
            )}

            <label className="block mb-1">
                <span className={LABEL}>Model for this key (optional)</span>
                <input
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    placeholder={defaultModel || "gemini-3.1-flash-lite"}
                    spellCheck={false}
                    className={FIELD + " font-mono"}
                />
            </label>
            <p className="text-[12px] text-[var(--dev-faint)] mb-3">
                Empty means whatever the platform asks for. Set it when this key is on a different
                sort of account from the others.
            </p>

            <label className="block mb-1">
                <span className={LABEL}>Calls a day it is allowed</span>
                <input
                    type="number"
                    min="0"
                    value={form.dailyLimit}
                    onChange={(e) => setForm({ ...form, dailyLimit: e.target.value })}
                    placeholder="200"
                    className={FIELD}
                />
            </label>
            <p className="text-[12px] text-[var(--dev-faint)] mb-4">
                We step onto the next key at this number rather than waiting for the provider to
                refuse. Leave it empty if you do not know it.
            </p>

            <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4"
                />
                <span className="text-[13.5px]">Use this key</span>
            </label>

            {error && <p className="text-[13px] text-[var(--dev-bad)] mt-3">{error}</p>}

            <div className="flex gap-2 mt-6">
                <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-[var(--dev-line)] text-[13.5px] font-medium text-[var(--dev-soft)] hover:bg-[var(--dev-paper)]">
                    Cancel
                </button>
                <button
                    onClick={submit}
                    disabled={!ready || busy}
                    className="flex-1 h-11 rounded-xl bg-[var(--dev-ink)] text-white text-[13.5px] font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40"
                >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {editing ? "Save" : "Add it"}
                </button>
            </div>
        </Sheet>
    );
};

const ConfirmDelete = ({ label, busy, onCancel, onConfirm }) => (
    <Sheet onClose={busy ? () => {} : onCancel}>
        <div className="flex items-start gap-3">
            <span className="shrink-0 w-10 h-10 rounded-full bg-[var(--dev-bad-tint)] text-[var(--dev-bad)] grid place-items-center">
                <AlertCircle className="w-5 h-5" />
            </span>
            <div className="min-w-0 flex-1">
                <h3 className="font-display font-semibold text-[15.5px]">Delete {label}?</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--dev-soft)]">
                    The platform stops using it immediately, and everything it was counting goes
                    with it.
                </p>
            </div>
        </div>

        <p className="mt-4 p-3 rounded-xl bg-[var(--dev-paper)] text-[12.5px] leading-relaxed text-[var(--dev-soft)]">
            To stop using it but keep the numbers, edit it and switch it off instead.
        </p>

        <div className="flex gap-2 mt-5">
            <button
                onClick={onCancel}
                disabled={busy}
                className="flex-1 h-11 rounded-xl border border-[var(--dev-line)] text-[13.5px] font-medium text-[var(--dev-soft)] hover:bg-[var(--dev-paper)] disabled:opacity-50"
            >
                Keep it
            </button>
            <button
                onClick={onConfirm}
                disabled={busy}
                className="flex-1 h-11 rounded-xl bg-[var(--dev-bad)] text-white text-[13.5px] font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60"
            >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete it
            </button>
        </div>
    </Sheet>
);

/** The one dialog shape this platform uses. */
const Sheet = ({ onClose, children }) => (
    <div
        role="dialog"
        aria-modal="true"
        onClick={onClose}
        className="fixed inset-0 z-50 bg-[#221e1a]/35 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
        <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-[var(--dev-line)] bg-[var(--dev-card)] p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
        >
            {children}
        </div>
    </div>
);

export default DeveloperKeys;
