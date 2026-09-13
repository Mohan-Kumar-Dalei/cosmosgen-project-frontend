import { useCallback, useEffect, useRef, useState } from "react";
import {
    Plus, Sparkles, Loader2, ImagePlus, EyeOff, Eye, Trash2, X, Check,
} from "lucide-react";
import { api, getErrorMessage } from "../../services/api";
import { Confirm } from "./Confirm";
import { PictureLink } from "./PictureLink";

/**
 * What the company sells, for the people who decide it.
 *
 * The catalogue used to be a file in the repository, which meant the office
 * had to ask a developer to add carpentry - and the office are the only people
 * who know when the company starts doing carpentry. This is that decision
 * moved to where it belongs.
 *
 * The form asks for two things: a name and a picture. Everything else a
 * service needs to work here - a key, a worker noun, skill keywords, a line of
 * customer copy, badges, and faults with wording in three languages inside
 * WhatsApp's row limit - is drafted by the assistant and shown for approval
 * before anything is saved. Asking the office to type all of that would be
 * asking them to do a job they did not sign up for, and the answer would be
 * different every time.
 */
const ServiceCatalogPanel = ({ isOwner }) => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyKey, setBusyKey] = useState("");
    const [error, setError] = useState("");
    const [note, setNote] = useState("");
    const [adding, setAdding] = useState(false);
    // The service the office has asked to delete, held while the dialog asks
    // whether they meant it
    const [doomed, setDoomed] = useState(null);

    const load = useCallback(async () => {
        try {
            const res = await api.get("/admin/services");
            setServices(res.data.data || []);
        } catch (err) {
            setError(getErrorMessage(err, "Could not load the catalogue."));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const say = (message) => {
        setNote(message);
        setError("");
        setTimeout(() => setNote(""), 4000);
    };

    const patch = async (key, body) => {
        setBusyKey(key);
        setError("");

        try {
            const res = await api.put("/admin/services/" + key, body);
            say(res.data.message || "Saved.");
            await load();
        } catch (err) {
            setError(getErrorMessage(err, "Could not save that."));
        } finally {
            setBusyKey("");
        }
    };

    const picture = async (key, file) => {
        if (!file) return;

        setBusyKey(key);
        setError("");

        try {
            const form = new FormData();
            form.append("image", file);
            await api.put("/admin/services/" + key, form, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            say("Picture updated.");
            await load();
        } catch (err) {
            setError(getErrorMessage(err, "Could not upload that picture."));
        } finally {
            setBusyKey("");
        }
    };

    /*
     * The bin means the bin.
     *
     * It used to flip the service to hidden and report it as removed, so the
     * row the office had just deleted was still sitting in the list - which
     * reads as a screen that ignored them. Hiding is the eye beside it, and
     * this erases the service and its price list. Old jobs are unaffected:
     * every ticket stored the service's name alongside its key when it was
     * booked, so a job from March still reads correctly afterwards.
     */
    const remove = async () => {
        if (!doomed) return;

        setBusyKey(doomed.key);
        setError("");

        try {
            const res = await api.delete("/admin/services/" + doomed.key);
            setDoomed(null);
            say(res.data.message);
            await load();
        } catch (err) {
            setDoomed(null);
            setError(getErrorMessage(err, "Could not delete that service."));
        } finally {
            setBusyKey("");
        }
    };

    return (
        <div className="cg-card p-4 sm:p-5 mb-6">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="font-display font-semibold text-[17px] tracking-[-0.01em]">
                        What the company sells
                    </h2>
                    <p className="cg-sub mt-1">
                        This list is the website, the WhatsApp menu and the assistant. A change here
                        reaches all three at once. The eye hides a service; the bin deletes it.
                    </p>
                </div>

                {isOwner && (
                    <button onClick={() => setAdding(true)} className="cg-btn cg-btn-go px-3 sm:px-4 shrink-0">
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Add a service</span>
                    </button>
                )}
            </div>

            {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
            {note && <p className="mt-3 text-[13px] text-brand-deep">{note}</p>}

            {loading ? (
                <div className="py-10 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-ink-faint" />
                </div>
            ) : (
                <div className="mt-4 flex flex-col divide-y divide-hairline">
                    {services.map((service) => (
                        <Row
                            key={service.key}
                            service={service}
                            isOwner={isOwner}
                            busy={busyKey === service.key}
                            onPicture={(file) => picture(service.key, file)}
                            onToggle={() => patch(service.key, { isActive: !service.isActive })}
                            onLink={(url) => patch(service.key, { image: url })}
                            onRemove={() => setDoomed(service)}
                        />
                    ))}
                </div>
            )}

            {adding && (
                <AddService
                    onClose={() => setAdding(false)}
                    onSaved={(message) => { setAdding(false); say(message); load(); }}
                />
            )}

            <Confirm
                open={Boolean(doomed)}
                busy={Boolean(doomed) && busyKey === doomed.key}
                title={"Delete " + (doomed?.label || "this service") + " for good?"}
                body="It goes from the website, the WhatsApp menu and the assistant at once, and its price list goes with it."
                note="Jobs already booked keep their own record of it, so nothing in the history changes. To take it off the website but keep it, use the eye instead."
                confirmLabel="Delete it"
                onCancel={() => setDoomed(null)}
                onConfirm={remove}
            />
        </div>
    );
};

const Row = ({ service, isOwner, busy, onPicture, onLink, onToggle, onRemove }) => {
    const file = useRef(null);

    const covers = service.appliances?.length
        ? service.appliances.length + " appliances"
        : (service.issues?.length || 0) + " jobs";

    return (
        <div className={"py-4 " + (service.isActive ? "" : "opacity-55")}>
            <div className="flex items-center gap-4">
                <button
                    onClick={() => isOwner && file.current?.click()}
                    disabled={!isOwner || busy}
                    title={isOwner ? "Change the picture" : ""}
                    className="relative shrink-0 w-14 h-14 rounded-xl bg-sunken grid place-items-center overflow-hidden border border-hairline disabled:cursor-default"
                >
                    {/* The stamped address, not the stored one: a drawing
                        re-uploaded under the same name leaves the URL identical
                        and the browser would go on showing the old thumbnail */}
                    {service.image
                        ? <img src={service.preview || service.image} alt="" className="w-full h-full object-contain" loading="lazy" />
                        : <ImagePlus className="w-5 h-5 text-ink-faint" />}

                    {busy && (
                        <span className="absolute inset-0 bg-surface/70 grid place-items-center">
                            <Loader2 className="w-4 h-4 animate-spin text-ink-soft" />
                        </span>
                    )}
                </button>

                <input
                    ref={file}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { onPicture(e.target.files?.[0]); e.target.value = ""; }}
                />

                <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[14.5px] truncate">{service.label}</p>
                    <p className="text-[12px] text-ink-faint truncate">
                        {service.key} · {covers}
                        {service.source === "admin" ? " · added by the office" : ""}
                    </p>
                </div>

                {isOwner && (
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            onClick={onToggle}
                            disabled={busy}
                            title={service.isActive ? "Hide from customers" : "Show to customers"}
                            className="cg-icon-btn"
                        >
                            {service.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>

                        {/* Shown whether it is live or hidden - a service parked
                            out of sight is exactly the one somebody eventually
                            wants gone */}
                        <button
                            onClick={onRemove}
                            disabled={busy}
                            title="Delete for good"
                            className="cg-icon-btn hover:text-danger"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* The link itself, on its own line under the row it belongs to.
                Pictures are uploaded to ImageKit by hand as often as through
                this screen, so the URL has to be something you can read, paste
                over and check - and the Save beside it has to be obviously
                this row's. */}
            {isOwner && (
                <PictureLink
                    value={service.image}
                    busy={busy}
                    onSave={onLink}
                    placeholder="https://ik.imagekit.io/…/service-carpentry.png"
                />
            )}
        </div>
    );
};

/**
 * Name in, draft out, then a person decides.
 *
 * The draft is never saved on the model's say-so. It can read a trade wrongly
 * - "AC" is not always air conditioning - and the first customer shown an
 * invented fault is a customer who stops believing the rest of the list.
 */
const AddService = ({ onClose, onSaved }) => {
    const [name, setName] = useState("");
    const [hint, setHint] = useState("");
    const [draft, setDraft] = useState(null);
    const [file, setFile] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const ask = async () => {
        setBusy(true);
        setError("");

        try {
            const res = await api.post("/admin/services/draft", { name, note: hint });
            setDraft(res.data.data);
        } catch (err) {
            setError(getErrorMessage(err, "Could not draft that one."));
        } finally {
            setBusy(false);
        }
    };

    const save = async () => {
        setBusy(true);
        setError("");

        try {
            const form = new FormData();
            Object.entries(draft).forEach(([field, value]) => {
                form.append(field, typeof value === "object" ? JSON.stringify(value) : value);
            });
            if (file) form.append("image", file);

            const res = await api.post("/admin/services", form, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            onSaved(res.data.message || "Added.");
        } catch (err) {
            setError(getErrorMessage(err, "Could not save that service."));
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm grid place-items-center p-4">
            <div className="w-full max-w-lg max-h-[88vh] overflow-y-auto cg-card p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="font-display font-semibold text-[17px] tracking-[-0.01em]">
                            Add a service
                        </h3>
                        <p className="cg-sub mt-1">
                            Give it a name. The assistant writes the rest and you approve it.
                        </p>
                    </div>
                    <button onClick={onClose} className="cg-icon-btn shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {!draft ? (
                    <div className="mt-5 flex flex-col gap-3">
                        <label className="block">
                            <span className="cg-label block mb-1.5">What is it called?</span>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Carpentry"
                                className="cg-input"
                            />
                        </label>

                        <label className="block">
                            <span className="cg-label block mb-1.5">Anything it should know? (optional)</span>
                            <input
                                value={hint}
                                onChange={(e) => setHint(e.target.value)}
                                placeholder="Doors, windows, cupboards — repairs and fitting"
                                className="cg-input"
                            />
                        </label>

                        <button
                            onClick={ask}
                            disabled={busy || name.trim().length < 3}
                            className="cg-btn cg-btn-go mt-1"
                        >
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            Draft it
                        </button>
                    </div>
                ) : (
                    <div className="mt-5 flex flex-col gap-4">
                        <label className="block">
                            <span className="cg-label block mb-1.5">Name customers will see</span>
                            <input
                                value={draft.label}
                                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                                className="cg-input"
                            />
                        </label>

                        <label className="block">
                            <span className="cg-label block mb-1.5">One line about it</span>
                            <textarea
                                rows={2}
                                value={draft.blurb}
                                onChange={(e) => setDraft({ ...draft, blurb: e.target.value })}
                                className="cg-input resize-none"
                            />
                        </label>

                        <div>
                            <p className="cg-label">
                                What people will be able to report ({draft.issues.length})
                            </p>
                            <ul className="mt-2 flex flex-col gap-1.5">
                                {draft.issues.map((issue) => (
                                    <li key={issue.key} className="text-[13.5px] text-ink-soft flex gap-2">
                                        <Check className="w-3.5 h-3.5 text-brand shrink-0 mt-1" />
                                        {issue.en}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <label className="block">
                            <span className="cg-label block mb-1.5">Picture</span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="cg-input py-2"
                            />
                            <span className="text-[12px] text-ink-faint mt-1">
                                A drawing on a clear background, like the others. It can be added later.
                            </span>
                        </label>

                        {error && <p className="text-[13px] text-danger">{error}</p>}

                        <div className="flex gap-2">
                            <button onClick={() => setDraft(null)} className="cg-btn flex-1">
                                Start again
                            </button>
                            <button onClick={save} disabled={busy} className="cg-btn cg-btn-go flex-1">
                                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Put it live
                            </button>
                        </div>
                    </div>
                )}

                {error && !draft && <p className="mt-3 text-[13px] text-danger">{error}</p>}
            </div>
        </div>
    );
};

export default ServiceCatalogPanel;
