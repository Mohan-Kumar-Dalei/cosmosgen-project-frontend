import { useCallback, useEffect, useState } from "react";
import {
    AlertCircle, Bell, ExternalLink, Image as ImageIcon, Loader2,
    Plus, Send, Trash2, X,
} from "lucide-react";
import { api, getErrorMessage } from "../../services/api";
import { PictureLink } from "./PictureLink";
import { Confirm } from "./Confirm";

/**
 * What the office is saying to every customer at once.
 *
 * Two kinds, edited on one screen because writing them is one job:
 *
 *   Posters - the carousel above the area card on the app's home screen. A
 *             picture the customer comes across. Nothing interrupts anybody.
 *   Notices - the bell beside their avatar, and a push to every phone the
 *             moment the office presses Send.
 *
 * Save and Send are deliberately two buttons. A notice is written, read back,
 * corrected and only then pushed; a screen where typing a title and pressing
 * Save puts it on thirty thousand lock screens is a screen nobody can work in.
 * Send asks first, says how many phones, and cannot be taken back - so it says
 * that too.
 *
 * Pictures are links, not uploads. Mohan puts the artwork on ImageKit himself
 * and pastes the address, which is how every other picture in this system is
 * managed - an upload box here would be a second place for the same files to
 * live.
 */

const BLANK = {
    placement: "poster",
    title: "",
    body: "",
    imageUrl: "",
    action: { kind: "none", serviceKey: "", url: "" },
    order: 0,
    startsAt: "",
    endsAt: "",
    isActive: true,
};

/** A date the browser's date input will accept, or nothing. */
const forInput = (value) => (value ? String(value).slice(0, 10) : "");

const AnnouncementsPanel = () => {
    const [rows, setRows] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [flash, setFlash] = useState("");

    const [form, setForm] = useState(null);       // null = not writing one
    const [saving, setSaving] = useState(false);
    const [sending, setSending] = useState(null); // the row being pushed
    const [doomed, setDoomed] = useState(null);
    const [pushing, setPushing] = useState(null);

    const load = useCallback(async () => {
        try {
            const res = await api.get("/admin/announcements");
            setRows(res.data.data || []);
            setError("");
        } catch (err) {
            setError(getErrorMessage(err, "Could not load what has been posted"));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // For the "opens" dropdown. The same list the app books from, so a poster
    // can never point at a trade the company has stopped offering.
    useEffect(() => {
        api.get("/admin/services")
            .then((res) => setServices(res.data.data || []))
            .catch(() => { /* the dropdown falls back to "nothing", which is safe */ });
    }, []);

    const say = (text) => {
        setFlash(text);
        setTimeout(() => setFlash(""), 4000);
    };

    const save = async () => {
        if (!form.title.trim()) return setError("Give it a title.");
        if (form.placement === "poster" && !form.imageUrl.trim()) {
            return setError("A poster needs a picture. Paste its ImageKit link.");
        }

        setSaving(true);
        setError("");

        const body = {
            ...form,
            order: Number(form.order) || 0,
            startsAt: form.startsAt || null,
            endsAt: form.endsAt || null,
        };

        try {
            if (form.id) await api.put("/admin/announcements/" + form.id, body);
            else await api.post("/admin/announcements", body);

            setForm(null);
            await load();
            say(form.id ? "Saved." : "Written. It is not sent until you press Send.");
        } catch (err) {
            setError(getErrorMessage(err, "Could not save it"));
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        setPushing(null);
        try {
            await api.delete("/admin/announcements/" + doomed.id);
            setDoomed(null);
            await load();
            say("Deleted.");
        } catch (err) {
            setError(getErrorMessage(err, "Could not delete it"));
            setDoomed(null);
        }
    };

    const push = async () => {
        const row = sending;
        setPushing(row.id);

        try {
            await api.post("/admin/announcements/" + row.id + "/push");
            setSending(null);
            await load();
            say("Going out now. It is already in the bell; the phones follow.");
        } catch (err) {
            setError(getErrorMessage(err, "Could not send it"));
            setSending(null);
        } finally {
            setPushing(null);
        }
    };

    const posters = rows.filter((r) => r.placement === "poster");
    const notices = rows.filter((r) => r.placement === "notice");

    if (loading) {
        return (
            <div className="cg-card p-10 grid place-items-center">
                <Loader2 className="w-5 h-5 animate-spin text-ink-faint" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {error && (
                <div className="p-4 bg-danger-tint border border-hairline rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold text-danger">{error}</p>
                </div>
            )}

            {flash && (
                <div className="p-3 bg-brand-tint border border-hairline rounded-lg text-sm text-brand font-semibold">
                    {flash}
                </div>
            )}

            {/* ---- the two lists ---- */}
            <Section
                icon={ImageIcon}
                title="Posters"
                note="The carousel on the app's home screen. A picture people come across - nothing buzzes."
                rows={posters}
                empty="No posters. The home screen simply has none, which is fine."
                onNew={() => { setError(""); setForm({ ...BLANK, placement: "poster" }); }}
                onEdit={(row) => { setError(""); setForm(toForm(row)); }}
                onDelete={setDoomed}
            />

            <Section
                icon={Bell}
                title="Notices"
                note="The bell beside the customer's name, and a push to every phone when you send it."
                rows={notices}
                empty="Nothing has been sent. Write one, read it back, then press Send."
                onNew={() => { setError(""); setForm({ ...BLANK, placement: "notice" }); }}
                onEdit={(row) => { setError(""); setForm(toForm(row)); }}
                onDelete={setDoomed}
                onSend={setSending}
                pushing={pushing}
            />

            {/* ---- writing one ---- */}
            {form && (
                <Editor
                    form={form}
                    setForm={setForm}
                    services={services}
                    saving={saving}
                    onSave={save}
                    onClose={() => { setForm(null); setError(""); }}
                />
            )}

            <Confirm
                open={Boolean(doomed)}
                title={"Delete " + (doomed?.title || "this") + "?"}
                body={doomed?.pushedAt
                    ? "It has already gone out to people's phones. Deleting it takes it out of the bell - it cannot un-ring anybody."
                    : "It has not been sent, so nobody has seen it."}
                confirmLabel="Delete it"
                onConfirm={remove}
                onCancel={() => setDoomed(null)}
            />

            <Confirm
                open={Boolean(sending)}
                tone="info"
                title={"Send \"" + (sending?.title || "") + "\" to everybody?"}
                body="Every customer with the app installed gets this on their phone, straight away. There is no way to take it back."
                note={sending?.pushedAt
                    ? "This has been sent once already. Sending it again buzzes the same people a second time."
                    : undefined}
                confirmLabel="Send it"
                busy={pushing === sending?.id}
                onConfirm={push}
                onCancel={() => setSending(null)}
            />
        </div>
    );
};

/** A row's server shape, as the editor's fields. */
const toForm = (row) => ({
    id: row.id,
    placement: row.placement,
    title: row.title,
    body: row.body || "",
    imageUrl: row.imageUrl || "",
    action: {
        kind: row.action?.kind || "none",
        serviceKey: row.action?.serviceKey || "",
        url: row.action?.url || "",
    },
    order: row.order || 0,
    startsAt: forInput(row.startsAt),
    endsAt: forInput(row.endsAt),
    isActive: row.isActive !== false,
});

const Section = ({ icon: Icon, title, note, rows, empty, onNew, onEdit, onDelete, onSend, pushing }) => (
    <div className="cg-card p-5">
        <div className="flex items-start justify-between gap-4">
            <div>
                <h2 className="font-semibold flex items-center gap-2">
                    <Icon className="w-4 h-4 text-ink-soft" />
                    {title}
                </h2>
                <p className="cg-sub mt-1">{note}</p>
            </div>

            <button onClick={onNew} className="cg-btn shrink-0 inline-flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                New
            </button>
        </div>

        {!rows.length ? (
            <p className="cg-sub mt-5">{empty}</p>
        ) : (
            <div className="mt-5 space-y-2">
                {rows.map((row) => (
                    <div
                        key={row.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-hairline"
                    >
                        {row.imageUrl ? (
                            <img
                                src={row.imageUrl}
                                alt=""
                                className="w-20 h-12 rounded-lg object-cover bg-sunken shrink-0"
                            />
                        ) : (
                            <span className="w-20 h-12 rounded-lg bg-sunken grid place-items-center shrink-0">
                                <Bell className="w-4 h-4 text-ink-faint" />
                            </span>
                        )}

                        <button onClick={() => onEdit(row)} className="flex-1 min-w-0 text-left">
                            <p className="font-semibold text-sm truncate">{row.title}</p>
                            <p className="cg-sub text-xs truncate">
                                {row.body || "No second line"}
                            </p>

                            <p className="text-[11px] text-ink-faint mt-0.5">
                                {row.isActive ? "Live" : "Off"}
                                {row.pushedAt
                                    ? " · sent " + new Date(row.pushedAt).toLocaleDateString("en-IN")
                                      + (row.pushedCount ? " to " + row.pushedCount + " phones" : "")
                                    : (onSend ? " · not sent" : "")}
                            </p>
                        </button>

                        {onSend && (
                            <button
                                onClick={() => onSend(row)}
                                disabled={pushing === row.id}
                                title={row.pushedAt ? "Send it again" : "Send it to every phone"}
                                className="cg-icon-btn shrink-0"
                            >
                                {pushing === row.id
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <Send className="w-4 h-4" />}
                            </button>
                        )}

                        <button
                            onClick={() => onDelete(row)}
                            title="Delete"
                            className="cg-icon-btn shrink-0 text-danger"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        )}
    </div>
);

/**
 * The sheet a poster or a notice is written on.
 *
 * The placement is shown and not editable once it exists: a notice that has
 * been pushed and is then turned into a poster leaves a send record attached to
 * something that was never sent, and nobody reading that screen later can tell.
 */
const Editor = ({ form, setForm, services, saving, onSave, onClose }) => {
    const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));
    const setAction = (patch) => setForm((prev) => ({ ...prev, action: { ...prev.action, ...patch } }));

    const isPoster = form.placement === "poster";

    return (
        <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[60] bg-ink/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => !saving && onClose()}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
            >
                <div className="flex items-start justify-between gap-4 mb-5">
                    <div>
                        <h3 className="cg-h2">
                            {form.id ? "Edit" : "New"} {isPoster ? "poster" : "notice"}
                        </h3>
                        <p className="cg-sub mt-1">
                            {isPoster
                                ? "It appears in the carousel on the app's home screen."
                                : "It sits in the bell. Saving does not send it - that is a separate button."}
                        </p>
                    </div>

                    <button onClick={onClose} className="cg-icon-btn shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="cg-label">Title</label>
                        <input
                            value={form.title}
                            onChange={(e) => set({ title: e.target.value })}
                            maxLength={80}
                            placeholder={isPoster ? "Diwali week" : "20% off AC servicing this week"}
                            className="cg-input"
                        />
                    </div>

                    <div>
                        <label className="cg-label">
                            Second line {isPoster ? "(usually left empty - the artwork says it)" : ""}
                        </label>
                        <textarea
                            value={form.body}
                            onChange={(e) => set({ body: e.target.value })}
                            maxLength={300}
                            rows={2}
                            placeholder="One sentence. It is read on a lock screen."
                            className="cg-input resize-none"
                        />
                    </div>

                    <div>
                        <label className="cg-label">
                            Picture {isPoster ? "" : "(optional)"}
                        </label>
                        <PictureLink
                            value={form.imageUrl}
                            onSave={(url) => set({ imageUrl: url })}
                            placeholder="https://ik.imagekit.io/…"
                        />
                        {form.imageUrl && (
                            <img
                                src={form.imageUrl}
                                alt=""
                                className="mt-3 w-full h-36 rounded-xl object-cover bg-sunken"
                            />
                        )}
                    </div>

                    {/* ---- where a tap goes ---- */}
                    <div>
                        <label className="cg-label">When they tap it</label>
                        <select
                            value={form.action.kind}
                            onChange={(e) => setAction({ kind: e.target.value })}
                            className="cg-input"
                        >
                            <option value="none">Nothing happens</option>
                            <option value="service">Open a service, ready to book</option>
                            <option value="url">Open a web page</option>
                        </select>

                        {form.action.kind === "service" && (
                            <select
                                value={form.action.serviceKey}
                                onChange={(e) => setAction({ serviceKey: e.target.value })}
                                className="cg-input mt-2"
                            >
                                <option value="">Pick a service</option>
                                {services.map((s) => (
                                    <option key={s.key} value={s.key}>{s.label}</option>
                                ))}
                            </select>
                        )}

                        {form.action.kind === "url" && (
                            <input
                                value={form.action.url}
                                onChange={(e) => setAction({ url: e.target.value })}
                                placeholder="https://…"
                                className="cg-input mt-2 font-mono text-[12px]"
                            />
                        )}
                    </div>

                    {/* ---- when it runs ---- */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="cg-label">From (optional)</label>
                            <input
                                type="date"
                                value={form.startsAt}
                                onChange={(e) => set({ startsAt: e.target.value })}
                                className="cg-input"
                            />
                        </div>
                        <div>
                            <label className="cg-label">Until (optional)</label>
                            <input
                                type="date"
                                value={form.endsAt}
                                onChange={(e) => set({ endsAt: e.target.value })}
                                className="cg-input"
                            />
                        </div>
                    </div>

                    {isPoster && (
                        <div>
                            <label className="cg-label">Order in the carousel</label>
                            <input
                                type="number"
                                value={form.order}
                                onChange={(e) => set({ order: e.target.value })}
                                className="cg-input"
                            />
                            <p className="cg-sub text-xs mt-1">Lowest leads. Ties fall back to newest first.</p>
                        </div>
                    )}

                    <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.isActive}
                            onChange={(e) => set({ isActive: e.target.checked })}
                            className="w-4 h-4 accent-brand"
                        />
                        <span className="text-sm font-medium">
                            Live — the app shows it
                        </span>
                    </label>
                </div>

                <div className="flex items-center gap-2 mt-6">
                    <button onClick={onSave} disabled={saving} className="cg-btn flex-1 inline-flex items-center justify-center gap-2">
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        Save
                    </button>

                    {form.imageUrl && (
                        <a
                            href={form.imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="Open the picture"
                            className="cg-icon-btn"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    )}
                </div>

                {!isPoster && (
                    <p className="cg-sub text-xs mt-3">
                        Saving only writes it down. Press Send on the list to put it on people&rsquo;s phones.
                    </p>
                )}
            </div>
        </div>
    );
};

export default AnnouncementsPanel;
