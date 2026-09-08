import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

/**
 * The wait while a customer pays, with a clock on it.
 *
 * The technician is standing next to the customer with nothing to look at, so
 * this gives the wait a shape: a ring that empties over four minutes, the time
 * left in the middle, and a quiet check with the gateway every few seconds so
 * he does not have to keep pressing anything.
 *
 * The polling here is deliberate and bounded, unlike the background refreshes
 * elsewhere in the app: it only runs while this dialog is open, it stops on
 * its own after the window closes, and the button remains for after that.
 */
const RING = 2 * Math.PI * 26; // r = 26

const PaymentWaitTimer = ({
    onCheck,
    seconds = 240,
    intervalSeconds = 15,
    waitingLabel = "Waiting for payment",
    hint = "Anyone can pay the link — it does not have to be from their own account.",
    idleNote = "Not received yet. Ask them to finish, then check again.",
    className = "",
}) => {
    const [left, setLeft] = useState(seconds);
    const [checking, setChecking] = useState(false);
    const [note, setNote] = useState("");

    // Kept in a ref so restarting the tick does not depend on the parent
    // handing back the same function identity every render
    const checkRef = useRef(onCheck);
    useEffect(() => { checkRef.current = onCheck; }, [onCheck]);

    const runCheck = async (manual) => {
        setChecking(true);
        if (manual) setNote("");
        try {
            const found = await checkRef.current?.();
            if (!found && manual) setNote(idleNote);
        } catch {
            if (manual) setNote("Could not reach the payment gateway.");
        } finally {
            setChecking(false);
        }
    };

    // The clock and the checking are kept apart on purpose. Firing the check
    // from inside the state updater meant React could run it twice for one
    // second - a state updater has to stay free of side effects.
    useEffect(() => {
        if (left <= 0) return;
        const id = setTimeout(() => setLeft((n) => n - 1), 1000);
        return () => clearTimeout(id);
    }, [left]);

    useEffect(() => {
        if (left > 0 && left !== seconds && left % intervalSeconds === 0) runCheck(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [left]);

    const mm = String(Math.floor(Math.max(0, left) / 60)).padStart(2, "0");
    const ss = String(Math.max(0, left) % 60).padStart(2, "0");
    const ran = left <= 0;

    return (
        <div className={"flex items-center gap-4 " + className}>
            <div className="relative w-[68px] h-[68px] shrink-0">
                <svg viewBox="0 0 68 68" className="w-full h-full -rotate-90">
                    <circle cx="34" cy="34" r="26" fill="none" stroke="currentColor" strokeWidth="5" className="text-black/10" />
                    <circle
                        cx="34" cy="34" r="26" fill="none" stroke="currentColor" strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray={RING}
                        strokeDashoffset={RING * (1 - Math.max(0, left) / seconds)}
                        className={ran ? "text-ink-faint" : "text-amber-500 transition-[stroke-dashoffset] duration-1000 ease-linear"}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {ran ? (
                        <span className="text-[10px] font-bold text-ink-soft leading-none">TIME<br />UP</span>
                    ) : (
                        <span className="text-sm font-bold tabular-nums text-ink">{mm}:{ss}</span>
                    )}
                </div>
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">
                    {ran ? "Still not received" : waitingLabel}
                </p>
                <p className="text-xs text-ink-soft mt-0.5">
                    {ran
                        ? "Checking has stopped. Press the button to look again."
                        : "Checking every " + intervalSeconds + " seconds. " + hint}
                </p>

                {note && <p className="text-xs font-medium text-warn mt-1.5">{note}</p>}

                <button
                    type="button"
                    onClick={() => runCheck(true)}
                    disabled={checking}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ink bg-white border border-hairline-strong rounded-lg hover:bg-sunken disabled:opacity-50"
                >
                    <RefreshCw className={"w-3.5 h-3.5 " + (checking ? "animate-spin" : "")} />
                    {checking ? "Checking..." : "Check now"}
                </button>
            </div>
        </div>
    );
};

export default PaymentWaitTimer;
