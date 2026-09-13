import { useEffect } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

/**
 * "Are you sure?", asked in the app's own voice.
 *
 * `window.confirm` was doing this job, and it is the one piece of interface a
 * product cannot style, cannot lay out and cannot say two sentences in: the
 * browser paints a grey system box with the site's hostname at the top, which
 * in the middle of a designed panel reads as something having gone wrong. It
 * also blocks the whole thread, so nothing behind it can show that it is
 * working.
 *
 * This says the same thing with room to explain the consequence, and its
 * confirm button can sit and spin while the request is in flight.
 */
export const Confirm = ({
    open,
    title,
    body,
    note,
    confirmLabel = "Delete",
    cancelLabel = "Keep it",
    tone = "danger",
    busy = false,
    onConfirm,
    onCancel,
}) => {
    // Escape closes it, the way every dialog on the platform does
    useEffect(() => {
        if (!open) return undefined;

        const onKey = (e) => {
            if (e.key === "Escape" && !busy) onCancel();
        };

        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, busy, onCancel]);

    if (!open) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[60] bg-ink/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => !busy && onCancel()}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 sm:p-6"
            >
                <div className="flex items-start gap-3">
                    <span
                        className={"shrink-0 w-10 h-10 rounded-full grid place-items-center "
                            + (tone === "danger" ? "bg-danger-tint text-danger" : "bg-info-tint text-info")}
                    >
                        <AlertTriangle className="w-5 h-5" />
                    </span>

                    <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-ink text-[16px]">{title}</h3>
                        {body && <p className="cg-sub mt-1.5 leading-relaxed">{body}</p>}
                    </div>

                    <button
                        onClick={onCancel}
                        disabled={busy}
                        aria-label="Close"
                        className="cg-icon-btn shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {note && (
                    <p className="mt-4 p-3 rounded-xl bg-sunken text-[12.5px] leading-relaxed text-ink-soft">
                        {note}
                    </p>
                )}

                <div className="flex gap-2 mt-5">
                    <button
                        onClick={onCancel}
                        disabled={busy}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-ink border border-hairline rounded-lg hover:bg-sunken disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>

                    <button
                        onClick={onConfirm}
                        disabled={busy}
                        className={"cg-btn flex-1 text-white disabled:opacity-60 "
                            + (tone === "danger" ? "bg-danger hover:opacity-90" : "cg-btn-go")}
                    >
                        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Confirm;
