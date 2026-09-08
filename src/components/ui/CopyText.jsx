import { useState } from "react";
import { Copy, Check } from "lucide-react";

/**
 * A reference with a copy button next to it.
 *
 * navigator.clipboard only exists on HTTPS and localhost, and the office
 * opens this panel over the LAN on plain http - so the modern API is tried
 * first and a hidden textarea does the job everywhere else. Without the
 * fallback the button would silently do nothing on exactly the machines that
 * need it.
 */
const copyToClipboard = async (text) => {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        // fall through to the textarea
    }

    try {
        const field = document.createElement("textarea");
        field.value = text;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(field);
        return ok;
    } catch {
        return false;
    }
};

const CopyText = ({ value, className = "", textClass = "", title }) => {
    const [state, setState] = useState("idle"); // idle | done | failed

    if (!value) return null;

    const handle = async (e) => {
        e.stopPropagation();
        e.preventDefault();
        const ok = await copyToClipboard(String(value));
        setState(ok ? "done" : "failed");
        setTimeout(() => setState("idle"), 1800);
    };

    return (
        <button
            type="button"
            onClick={handle}
            title={title || "Copy " + value}
            className={"group inline-flex items-center gap-1.5 max-w-full text-left hover:text-ink " + className}
        >
            <span className={"truncate " + textClass}>{value}</span>
            {state === "done" ? (
                <Check className="w-3.5 h-3.5 shrink-0 text-brand" />
            ) : (
                <Copy
                    className={"w-3.5 h-3.5 shrink-0 " + (state === "failed" ? "text-danger" : "text-ink-faint group-hover:text-ink")}
                />
            )}
            <span className="sr-only">{state === "done" ? "Copied" : "Copy"}</span>
        </button>
    );
};

export default CopyText;
