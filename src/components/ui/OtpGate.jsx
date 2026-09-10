import { useCallback, useEffect, useRef, useState } from "react";
import { api, getErrorMessage } from "../services/api";
import { Loader2, ShieldCheck, X, RefreshCw } from "lucide-react";

/**
 * The code the customer reads out at the door.
 *
 * The technician never receives it - it goes to the customer on WhatsApp, and
 * he has to be standing in front of them to learn it. That is the whole
 * mechanism: it is what stops a job being marked started from the car park,
 * or closed from the road.
 *
 * Six separate boxes rather than one field, because this is read aloud one
 * digit at a time. Pasting still works: the whole code lands across the boxes
 * instead of only in the first.
 */
const OtpGate = ({ ticketId, purpose, title, note, actionLabel, onVerified, onClose }) => {
    const [digits, setDigits] = useState(["", "", "", "", "", ""]);
    const [sending, setSending] = useState(false);
    const [busy, setBusy] = useState(false);
    const [sentAt, setSentAt] = useState(null);
    const [error, setError] = useState("");
    const inputs = useRef([]);

    const code = digits.join("");

    const send = useCallback(async () => {
        setSending(true);
        setError("");
        try {
            await api.post("/technician/tickets/" + ticketId + "/otp/" + purpose);
            setSentAt(new Date());
            inputs.current[0]?.focus();
        } catch (err) {
            setError(getErrorMessage(err, "Could not send the code"));
        } finally {
            setSending(false);
        }
    }, [ticketId, purpose]);

    // Sent the moment this opens. Making him press "send" first is a step that
    // exists only because the screen was built that way. Once per mount, so a
    // re-render never fires a second code at the customer.
    const sentOnce = useRef(false);
    useEffect(() => {
        if (sentOnce.current) return;
        sentOnce.current = true;
        send();
    }, [send]);

    const setDigit = (i, value) => {
        const clean = value.replace(/\D/g, "");
        if (!clean) {
            setDigits((d) => d.map((x, n) => (n === i ? "" : x)));
            return;
        }

        setDigits((d) => {
            const next = [...d];
            // A pasted or autofilled code fills forward from here
            clean.split("").forEach((ch, k) => {
                if (i + k < 6) next[i + k] = ch;
            });
            return next;
        });

        const land = Math.min(5, i + clean.length);
        inputs.current[land]?.focus();
    };

    const onKeyDown = (i, e) => {
        if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
    };

    const submit = async (e) => {
        e.preventDefault();
        if (code.length !== 6) return;

        setBusy(true);
        setError("");
        try {
            await onVerified(code);
        } catch (err) {
            // The gate lives on the server, so a wrong code comes back as a
            // failed request from whatever action this was guarding.
            setError(getErrorMessage(err, "That code did not work"));
            setDigits(["", "", "", "", "", ""]);
            inputs.current[0]?.focus();
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 px-0 sm:px-4">
            <div className="cg-lift w-full sm:max-w-sm rounded-b-none sm:rounded-[18px] px-6 pt-6 pb-8">
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-accent-tint text-accent flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <button onClick={onClose} className="cg-icon-btn ml-auto" aria-label="Close">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <h2 className="cg-h2 mb-1.5">{title}</h2>
                <p className="cg-sub mb-6">{note}</p>

                <form onSubmit={submit}>
                    <div className="flex gap-2 mb-4">
                        {digits.map((d, i) => (
                            <input
                                key={i}
                                ref={(el) => { inputs.current[i] = el; }}
                                value={d}
                                onChange={(e) => setDigit(i, e.target.value)}
                                onKeyDown={(e) => onKeyDown(i, e)}
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                className="cg-input flex-1 min-w-0 text-center text-lg font-semibold px-0 py-3"
                                aria-label={"Digit " + (i + 1)}
                            />
                        ))}
                    </div>

                    {error && (
                        <p className="text-sm text-danger mb-4">{error}</p>
                    )}

                    <button type="submit" disabled={busy || code.length !== 6} className="cg-btn cg-btn-go w-full py-3">
                        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                        {busy ? "Checking" : actionLabel}
                    </button>
                </form>

                <button
                    onClick={send}
                    disabled={sending}
                    className="w-full mt-4 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-deep disabled:text-ink-faint"
                >
                    <RefreshCw className={"w-3.5 h-3.5 " + (sending ? "animate-spin" : "")} />
                    {sending ? "Sending" : sentAt ? "Send a new code" : "Send the code"}
                </button>

                {sentAt && !sending && (
                    <p className="text-center text-xs text-ink-faint mt-2">
                        Sent to the customer on WhatsApp.
                    </p>
                )}
            </div>
        </div>
    );
};

export default OtpGate;
