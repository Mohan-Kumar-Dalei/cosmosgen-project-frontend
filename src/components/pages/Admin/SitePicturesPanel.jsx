import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, RotateCcw, Upload } from "lucide-react";
import { api, getErrorMessage } from "../../services/api";
import { PictureLink } from "./PictureLink";

/**
 * Every picture the customer ever sees, with the address it loads from.
 *
 * The drawings are made outside this app and put on ImageKit by hand, so the
 * thing the office actually holds is a link. A screen that only took file
 * uploads made them download their own artwork to re-upload it, and never
 * showed which file a row was pointing at - so a wrong picture could only be
 * found by squinting at a thumbnail.
 *
 * Three kinds of picture sit on one screen because to the person changing them
 * it is one job: the site's own drawings, the services, and the appliances
 * under a service. Each row takes either a pasted link or an uploaded file,
 * and shows the link it ends up with.
 */
const Thumb = ({ url, busy }) => (
    <span className="relative shrink-0 w-14 h-14 rounded-xl bg-sunken grid place-items-center overflow-hidden border border-hairline">
        {url
            ? <img src={url} alt="" className="w-full h-full object-contain" loading="lazy" />
            : <ImagePlus className="w-5 h-5 text-ink-faint" />}

        {busy && (
            <span className="absolute inset-0 bg-surface/70 grid place-items-center">
                <Loader2 className="w-4 h-4 animate-spin text-ink-soft" />
            </span>
        )}
    </span>
);

/**
 * One picture: what it is, where it loads from, and the two ways to change it.
 *
 * Two lines, not one.
 *
 * What the picture is goes on the first line with its thumbnail; where it
 * loads from, and the button that saves it, go on a line of their own
 * underneath. Squeezed into the middle column beside the upload button, the
 * link and its Save read as belonging to the panel rather than to the row they
 * sit in - and with several rows on screen that is genuinely ambiguous.
 */
const PictureRow = ({ title, note, url, preview, busy, placeholder, onLink, onFile, onRestore }) => {
    const file = useRef(null);

    return (
        <div className="py-4">
            <div className="flex items-center gap-4">
                <Thumb url={preview || url} busy={busy} />

                <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[14.5px] truncate">{title}</p>
                    {note && <p className="text-[12px] text-ink-faint">{note}</p>}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <input
                        ref={file}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }}
                    />

                    <button
                        onClick={() => file.current?.click()}
                        disabled={busy}
                        title="Upload a file instead"
                        className="cg-icon-btn"
                    >
                        <Upload className="w-4 h-4" />
                    </button>

                    {onRestore && (
                        <button
                            onClick={onRestore}
                            disabled={busy}
                            title="Back to the original drawing"
                            className="cg-icon-btn"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* The address this row loads from, and the button that saves it,
                directly beneath the row they belong to */}
            <PictureLink value={url} busy={busy} onSave={onLink} placeholder={placeholder} />
        </div>
    );
};

const SitePicturesPanel = () => {
    const [site, setSite] = useState([]);
    const [catalogue, setCatalogue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState("");
    const [error, setError] = useState("");
    const [note, setNote] = useState("");

    const load = useCallback(async () => {
        try {
            const res = await api.get("/admin/images");
            setSite(res.data.data.site || []);
            setCatalogue(res.data.data.catalogue || []);
            setError("");
        } catch (err) {
            setError(getErrorMessage(err, "Could not load the pictures."));
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

    /**
     * One saver for every row.
     *
     * A link and a file go to the same endpoint - the difference is only
     * whether the body is JSON or a form - so keeping them together means a
     * row cannot end up accepting one and not the other.
     */
    const save = async (id, path, { url, file }) => {
        setBusyId(id);
        setError("");

        try {
            let res;

            if (file) {
                const form = new FormData();
                form.append("image", file);
                res = await api.put(path, form, { headers: { "Content-Type": "multipart/form-data" } });
            } else {
                res = await api.put(path, { url, image: url });
            }

            say(res.data.message || "Saved.");
            await load();
        } catch (err) {
            setError(getErrorMessage(err, "Could not save that picture."));
        } finally {
            setBusyId("");
        }
    };

    if (loading) {
        return (
            <div className="cg-card p-4 sm:p-5 py-10 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-ink-faint" />
            </div>
        );
    }

    // The site's slots arrive in the order the config lists them, which is the
    // order they appear on the website - worth keeping, so the screen reads
    // like a walk through the pages
    const groups = site.reduce((acc, row) => {
        (acc[row.group] = acc[row.group] || []).push(row);
        return acc;
    }, {});

    return (
        <>
            {error && <p className="mb-3 text-[13px] text-danger">{error}</p>}
            {note && <p className="mb-3 text-[13px] text-brand-deep">{note}</p>}

            {Object.entries(groups).map(([group, rows]) => (
                <div key={group} className="cg-card p-4 sm:p-5 mb-5">
                    <h2 className="font-display font-semibold text-[16px] tracking-[-0.01em]">{group}</h2>

                    <div className="mt-2 flex flex-col divide-y divide-hairline">
                        {rows.map((row) => (
                            <PictureRow
                                key={row.slot}
                                title={row.label}
                                note={row.note}
                                url={row.url}
                                preview={row.preview}
                                busy={busyId === row.slot}
                                placeholder="https://ik.imagekit.io/…"
                                onLink={(url) => save(row.slot, "/admin/images/" + row.slot, { url })}
                                onFile={(file) => file && save(row.slot, "/admin/images/" + row.slot, { file })}
                                onRestore={row.overridden
                                    ? () => save(row.slot, "/admin/images/" + row.slot, { url: "" })
                                    : null}
                            />
                        ))}
                    </div>
                </div>
            ))}

            <div className="cg-card p-4 sm:p-5 mb-5">
                <h2 className="font-display font-semibold text-[16px] tracking-[-0.01em]">The services</h2>
                <p className="cg-sub mt-1">
                    The picture on each service&rsquo;s tile, on the website and in the app.
                </p>

                <div className="mt-2 flex flex-col divide-y divide-hairline">
                    {catalogue.map((service) => (
                        <PictureRow
                            key={service.key}
                            title={service.label}
                            note={service.key
                                + (service.overridden ? "" : " · the drawing it ships with")
                                + (service.isActive ? "" : " · hidden from customers")}
                            url={service.url}
                            preview={service.preview}
                            busy={busyId === service.key}
                            placeholder="https://ik.imagekit.io/…/service-carpentry.png"
                            onLink={(url) => save(service.key, "/admin/services/" + service.key, { url })}
                            onFile={(file) => file && save(service.key, "/admin/services/" + service.key, { file })}
                        />
                    ))}
                </div>
            </div>

            {catalogue.filter((s) => s.appliances.length).map((service) => (
                <div key={service.key} className="cg-card p-4 sm:p-5 mb-5">
                    <h2 className="font-display font-semibold text-[16px] tracking-[-0.01em]">
                        {service.label} — the machines
                    </h2>
                    <p className="cg-sub mt-1">
                        Shown when somebody picks their appliance, here and on WhatsApp.
                    </p>

                    <div className="mt-2 flex flex-col divide-y divide-hairline">
                        {service.appliances.map((appliance) => {
                            const path = "/admin/images/appliance/" + service.key + "/" + appliance.key;
                            const id = service.key + ":" + appliance.key;

                            return (
                                <PictureRow
                                    key={appliance.key}
                                    title={appliance.label}
                                    note={appliance.key + (appliance.overridden ? "" : " · the drawing it ships with")}
                                    url={appliance.url}
                                    preview={appliance.preview}
                                    busy={busyId === id}
                                    placeholder="https://ik.imagekit.io/…/appliance-ac.png"
                                    onLink={(url) => save(id, path, { url })}
                                    onFile={(file) => file && save(id, path, { file })}
                                />
                            );
                        })}
                    </div>
                </div>
            ))}
        </>
    );
};

export default SitePicturesPanel;
