import { useState } from "react";
import { Check, Copy, ExternalLink, Loader2 } from "lucide-react";

/**
 * The address a picture actually loads from, shown and editable.
 *
 * Uploading through the panel is one way a picture gets here and it is not the
 * usual one - the drawings are made elsewhere and put on ImageKit by hand, and
 * what comes back from that is a URL. A screen that only accepts a file forces
 * the office to download their own image and upload it again to change a
 * thumbnail, and hides which file a row is pointing at.
 *
 * So the link is the field: paste one and save, or copy the one that is there
 * and open it to check it is the right drawing.
 *
 * The Save button is always on screen, even with nothing to save.
 * It used to appear only once the text had changed, which is a control you
 * cannot find: somebody pasting the link a picture already had - the ordinary
 * case after re-uploading a drawing under the same name - saw no way to save
 * at all, and reasonably concluded the screen could not do it.
 */
export const PictureLink = ({ value, busy, onSave, placeholder = "https://…" }) => {
    const current = value || "";

    const [draft, setDraft] = useState(current);
    const [seen, setSeen] = useState(current);
    const [copied, setCopied] = useState(false);

    // A save elsewhere in the panel changes what this row holds; the box
    // follows it rather than keeping a stale edit
    if (seen !== current) {
        setSeen(current);
        setDraft(current);
    }

    const typed = draft.trim();
    const dirty = typed !== current;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(current);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        } catch {
            // A browser that refuses the clipboard is not worth an error
            // message - the text is right there to select
        }
    };

    return (
        <div className="mt-2 flex items-center gap-1.5">
            <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && typed) onSave(typed); }}
                placeholder={placeholder}
                spellCheck={false}
                className={"flex-1 min-w-0 h-8 px-2.5 rounded-lg border bg-white text-[12px] font-mono truncate focus:outline-none "
                    + (dirty
                        ? "border-brand text-ink"
                        : "border-hairline text-ink-soft focus:border-hairline-strong")}
            />

            <button
                onClick={() => onSave(typed)}
                disabled={busy || !typed}
                /*
                 * Saving an unchanged link is allowed on purpose. Re-uploading
                 * a drawing to ImageKit under the same name leaves the address
                 * identical, and the office needs some way to tell the site
                 * that the file behind it has moved on - pressing Save again
                 * stamps a new version and every browser fetches it afresh.
                 */
                title={dirty
                    ? "Save this link"
                    : "Save again to pick up a file you have re-uploaded under the same name"}
                className={"shrink-0 h-8 px-3 rounded-lg text-[12px] font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 "
                    + (dirty
                        ? "bg-brand text-white hover:bg-brand-deep"
                        : "bg-sunken text-ink-soft hover:bg-hairline")}
            >
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save
            </button>

            <button
                onClick={copy}
                disabled={!current}
                title="Copy the link"
                className="cg-icon-btn shrink-0 !w-8 !h-8 disabled:opacity-40"
            >
                {copied ? <Check className="w-3.5 h-3.5 text-brand" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <a
                href={current || undefined}
                target="_blank"
                rel="noreferrer"
                title="Open the picture"
                className={"cg-icon-btn shrink-0 !w-8 !h-8 " + (current ? "" : "pointer-events-none opacity-40")}
            >
                <ExternalLink className="w-3.5 h-3.5" />
            </a>
        </div>
    );
};

export default PictureLink;
