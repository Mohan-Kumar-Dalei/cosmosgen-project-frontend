import { useState } from "react";
import { api, getErrorMessage } from "../../services/api";
import { Loader2, PhoneCall, CheckCircle2, Banknote, XCircle } from "lucide-react";

const rupees = (paise) => (Number(paise || 0) / 100).toFixed(2);

/**
 * What the technician sees between saying "the customer refused" and finding
 * out what the office made of it.
 *
 * He does not leave. The office rings the customer while he stands there, and
 * if they are talked round he simply carries on - which is the entire reason
 * for holding him rather than sending him away and booking a second visit.
 * Only when the office confirms the customer will not go ahead does he take
 * the visit charge for the trip.
 */
const RefusalPanel = ({ ticket, onUpdate, onError }) => {
    const [busy, setBusy] = useState("");
    const refusal = ticket.refusal || {};

    const post = async (path, key, failure) => {
        setBusy(key);
        onError("");
        try {
            await api.post("/technician/tickets/" + ticket._id + path);
            await onUpdate();
        } catch (err) {
            onError(getErrorMessage(err, failure));
            setBusy("");
        }
    };

    /* ---------- waiting on the office ---------- */
    if (refusal.status === "awaiting_verification") {
        return (
            <div className="lg:col-span-6 rounded-xl border-2 border-amber-300 bg-warn-tint px-4 py-4 sm:px-5">
                <div className="flex items-start gap-3">
                    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-50" />
                        <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-warn">
                            <PhoneCall className="h-4 w-4 text-white" />
                        </span>
                    </span>

                    <div className="min-w-0">
                        <p className="font-semibold text-warn">The office is calling the customer</p>
                        <p className="mt-1 text-sm text-warn">
                            Please stay where you are. If they change their mind you carry straight
                            on — no second visit. You'll see the answer here.
                        </p>
                        <p className="mt-2 text-xs text-warn">
                            You told them: {refusal.reason}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    /* ---------- office says: carry on ---------- */
    if (refusal.status === "customer_agreed") {
        return (
            <div className="lg:col-span-6 rounded-xl border-2 border-green-300 bg-brand-tint px-4 py-4 sm:px-5">
                <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                    <div className="min-w-0">
                        <p className="font-semibold text-green-900">The customer agreed — carry on</p>
                        {refusal.officeNote && (
                            <p className="mt-1 text-sm text-brand">{refusal.officeNote}</p>
                        )}
                        <p className="mt-1 text-xs text-brand">
                            Finish the job and raise the bill as normal.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    /* ---------- office says: take the visit charge and go ---------- */
    if (refusal.status === "customer_declined" && !refusal.visitChargeBilled) {
        return (
            <div className="lg:col-span-6 rounded-xl border-2 border-hairline-strong bg-white px-4 py-4 sm:px-5">
                <div className="flex items-start gap-2.5">
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-ink-soft" />
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink">The customer is not going ahead</p>
                        {refusal.officeNote && (
                            <p className="mt-1 text-sm text-ink-soft">{refusal.officeNote}</p>
                        )}

                        <div className="mt-3 rounded-xl border border-hairline bg-brand-tint p-3.5">
                            <div className="flex items-baseline justify-between gap-3">
                                <span className="text-sm font-semibold text-green-900">Visit charge</span>
                                <span className="text-xl font-bold text-green-900">
                                    Rs {rupees(ticket.visitChargePaise)}
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-brand">
                                You travelled out and quoted. This is yours — the office takes no
                                commission on it.
                            </p>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                            <button
                                onClick={() => post("/visit-charge", "bill", "Could not raise the visit charge")}
                                disabled={Boolean(busy)}
                                className="flex flex-1 min-w-[150px] items-center justify-center gap-2 rounded-lg bg-brand py-3 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
                            >
                                {busy === "bill" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                                Take Rs {rupees(ticket.visitChargePaise)}
                            </button>

                            <button
                                onClick={() => post("/skip-visit-charge", "skip", "Could not close this job")}
                                disabled={Boolean(busy)}
                                className="flex items-center justify-center gap-2 rounded-lg border border-hairline px-4 py-3 text-sm font-medium text-ink-soft hover:bg-sunken disabled:opacity-60"
                            >
                                {busy === "skip" && <Loader2 className="h-4 w-4 animate-spin" />}
                                Skip it
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default RefusalPanel;
