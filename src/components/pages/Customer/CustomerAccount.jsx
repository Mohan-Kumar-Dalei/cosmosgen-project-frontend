import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    Loader2,
    MapPin,
    Phone,
    ReceiptText,
    ArrowRight,
    ShieldCheck,
    LogOut,
    Clock,
    CheckCircle2,
} from "lucide-react";
import { WhatsAppMark } from "./Marks";
import { api, getErrorMessage } from "../../services/api";
import { CustomerShell } from "./CustomerShell";
import { useCustomer } from "./customerAuth";
import { useSmoothScroll } from "./motion";
import { Blobs } from "./Blob";
import { WHATSAPP_LINK } from "./brand";

/**
 * A customer's own jobs, and the door they come through to see them.
 *
 * No booking here on purpose. What this page can honestly do is show what has
 * already happened and where the running jobs have got to - and hand over to
 * WhatsApp or the app for anything new.
 */
const STAGE = {
    Pending: { label: "Finding somebody", tone: "bg-warn-tint text-warn" },
    Queued: { label: "Booked in", tone: "bg-info-tint text-info" },
    Assigned: { label: "On the way", tone: "bg-info-tint text-info" },
    "In-Progress": { label: "Work in progress", tone: "bg-accent-tint text-accent" },
    "Payment-Pending": { label: "Awaiting payment", tone: "bg-warn-tint text-warn" },
    Closed: { label: "Finished", tone: "bg-brand-tint text-brand-deep" },
    Cancelled: { label: "Cancelled", tone: "bg-sunken text-ink-soft" },
};

const day = (value) =>
    value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

const CustomerAccount = () => {
    useSmoothScroll();
    const { customer, ready, signOut } = useCustomer();

    return (
        <CustomerShell>
            {!ready ? (
                <div className="min-h-[60vh] grid place-items-center">
                    <Loader2 className="w-5 h-5 animate-spin text-ink-faint" />
                </div>
            ) : customer ? (
                <SignedIn customer={customer} onSignOut={signOut} />
            ) : (
                <SignIn />
            )}
        </CustomerShell>
    );
};

/* ================================================================== */
/* SIGNING IN - a number, then six digits from WhatsApp                 */
/* ================================================================== */

const SignIn = () => {
    const { requestCode, signIn } = useCustomer();

    const [phone, setPhone] = useState("");
    const [code, setCode] = useState("");
    const [sent, setSent] = useState(false);
    const [returning, setReturning] = useState(null);
    const [wait, setWait] = useState(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (wait <= 0) return undefined;
        const t = setTimeout(() => setWait((n) => n - 1), 1000);
        return () => clearTimeout(t);
    }, [wait]);

    const ask = async () => {
        if (!/^[6-9]\d{9}$/.test(phone)) return setError("Enter a valid 10 digit mobile number.");

        setBusy(true);
        setError("");

        const res = await requestCode(phone);
        setBusy(false);

        if (!res.ok) {
            if (res.retryAfter) setWait(res.retryAfter);
            return setError(res.message);
        }

        setSent(true);
        setReturning(res.returning ? res.name : null);
        setWait(res.retryAfter || 45);
    };

    const enter = async () => {
        if (code.length !== 6) return setError("Enter the six digits from WhatsApp.");

        setBusy(true);
        setError("");

        const res = await signIn(phone, code);
        setBusy(false);

        if (!res.ok) setError(res.message);
    };

    return (
        <section className="relative overflow-clip">
            <Blobs field="hero" />

            <div className="relative mx-auto max-w-6xl px-5 sm:px-8 py-14 lg:py-20">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-ink-faint">
                        Your account
                    </p>
                    <h1 className="mt-5 font-display font-bold text-[clamp(2.1rem,5.2vw,3.4rem)] leading-[1.02] tracking-[-0.04em] text-balance">
                        Every job you have booked, in one place
                    </h1>
                    <p className="mt-6 max-w-md text-[16px] leading-relaxed text-ink-soft">
                        Sign in with the number you book on. We send six digits to that number on
                        WhatsApp, so there is no password to remember or lose.
                    </p>

                    <div className="mt-8 flex flex-col gap-3 max-w-md">
                        {[
                            "What you have had done, and what each one cost",
                            "Where a running job has got to, and who is coming",
                            "The invoice for anything already finished",
                        ].map((line) => (
                            <p key={line} className="flex items-start gap-2.5 text-[14.5px] text-ink-soft">
                                <CheckCircle2 className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                                {line}
                            </p>
                        ))}
                    </div>
                </div>

                <div className="rounded-[28px] bg-surface p-7 sm:p-9 shadow-lift">
                    {!sent ? (
                        <>
                            <h2 className="font-display font-semibold text-xl tracking-[-0.01em]">
                                Your mobile number
                            </h2>
                            <p className="mt-1.5 text-[14px] text-ink-soft">
                                The one you message us on.
                            </p>

                            <div className="mt-6 flex">
                                <span className="h-12 px-4 grid place-items-center rounded-l-[10px] border border-r-0 border-hairline-strong bg-sunken text-ink-soft font-semibold text-[15px]">
                                    +91
                                </span>
                                <input
                                    value={phone}
                                    onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(""); }}
                                    onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
                                    inputMode="numeric"
                                    placeholder="10 digit number"
                                    className="cg-input rounded-l-none h-12"
                                />
                            </div>

                            {error && <p className="mt-3 text-sm text-danger">{error}</p>}

                            <button
                                onClick={ask}
                                disabled={busy}
                                className="mt-5 w-full h-12 rounded-[10px] bg-brand hover:bg-brand-deep disabled:opacity-50 text-white font-semibold text-[15px] flex items-center justify-center gap-2 transition-colors"
                            >
                                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <WhatsAppMark className="w-[17px] h-[17px]" />}
                                Send WhatsApp code
                            </button>

                            <p className="mt-4 text-xs text-ink-faint leading-relaxed">
                                Never booked with us? Signing in creates your account, and you can still
                                only book from WhatsApp or the app.
                            </p>
                        </>
                    ) : (
                        <>
                            <h2 className="font-display font-semibold text-xl tracking-[-0.01em]">
                                {returning ? "Welcome back, " + returning.split(" ")[0] : "Check your WhatsApp"}
                            </h2>
                            <p className="mt-1.5 text-[14px] text-ink-soft">
                                Six digits have gone to +91 {phone}.
                            </p>

                            <input
                                value={code}
                                onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                                onKeyDown={(e) => { if (e.key === "Enter") enter(); }}
                                inputMode="numeric"
                                placeholder="000000"
                                autoFocus
                                className="cg-input mt-6 h-14 text-center text-2xl font-bold tracking-[0.5em]"
                            />

                            {error && <p className="mt-3 text-sm text-danger">{error}</p>}

                            <button
                                onClick={enter}
                                disabled={busy || code.length !== 6}
                                className="mt-5 w-full h-12 rounded-[10px] bg-brand hover:bg-brand-deep disabled:opacity-50 text-white font-semibold text-[15px] flex items-center justify-center gap-2 transition-colors"
                            >
                                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                Sign in
                            </button>

                            <div className="mt-5 flex items-center justify-between text-[13px]">
                                <button
                                    onClick={() => { setSent(false); setCode(""); setError(""); }}
                                    className="text-ink-soft hover:text-ink"
                                >
                                    Change the number
                                </button>

                                <button
                                    onClick={wait > 0 || busy ? undefined : ask}
                                    disabled={wait > 0 || busy}
                                    className="font-semibold text-accent disabled:text-ink-faint disabled:font-normal"
                                >
                                    {wait > 0 ? "Send again in " + wait + "s" : "Send it again"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
            </div>
        </section>
    );
};

/* ================================================================== */
/* SIGNED IN - the running jobs, then the finished ones                 */
/* ================================================================== */

const SignedIn = ({ customer, onSignOut }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        try {
            const res = await api.get("/customer/tickets");
            setData(res.data.data);
            setError("");
        } catch (err) {
            setError(getErrorMessage(err, "Could not load your jobs."));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const open = data?.open || [];
    const closed = data?.closed || [];

    return (
        <>
            <section className="relative overflow-clip">
                <Blobs field="hero" />

                <div className="relative mx-auto max-w-6xl px-5 sm:px-8 py-12 lg:py-16 flex flex-wrap items-end justify-between gap-6">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-ink-faint">
                            Your account
                        </p>
                        <h1 className="mt-4 font-display font-bold text-[clamp(2rem,4.6vw,3rem)] tracking-[-0.035em]">
                            {customer.name ? "Hello, " + customer.name.split(" ")[0] : "Your jobs"}
                        </h1>
                        <p className="mt-3 text-[14.5px] text-ink-soft flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span className="inline-flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5" /> +91 {customer.phone}
                            </span>
                            {customer.area && (
                                <span className="inline-flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5" /> {customer.area}
                                </span>
                            )}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <a
                            href={WHATSAPP_LINK}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-brand text-white font-semibold text-[14px] hover:bg-brand-deep transition-colors"
                        >
                            <WhatsAppMark className="w-[17px] h-[17px]" />
                            Book something
                        </a>
                        <button
                            onClick={onSignOut}
                            className="inline-flex items-center gap-2 h-11 px-5 rounded-full border border-hairline-strong font-semibold text-[14px] hover:bg-sunken transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign out
                        </button>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-5 sm:px-8 py-12 lg:py-16">
                {error && (
                    <p className="mb-8 p-4 rounded-xl bg-danger-tint border border-hairline text-sm text-danger">
                        {error}
                    </p>
                )}

                {loading ? (
                    <div className="py-20 flex justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-ink-faint" />
                    </div>
                ) : (
                    <>
                        <h2 className="font-display font-semibold text-xl tracking-[-0.01em]">
                            Running now
                        </h2>

                        {open.length === 0 ? (
                            <div className="mt-4 rounded-[28px] bg-surface p-10 text-center shadow-card">
                                <p className="font-semibold text-ink">Nothing running</p>
                                <p className="mt-1.5 text-sm text-ink-soft max-w-sm mx-auto">
                                    Message us on WhatsApp and we will send somebody out.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-4 flex flex-col gap-3">
                                {open.map((job) => <JobCard key={job.id} job={job} live />)}
                            </div>
                        )}

                        <History jobs={closed} />
                    </>
                )}
            </section>
        </>
    );
};

/**
 * Everything already done, as a ledger rather than a wall of cards.
 *
 * A running job is a card because there are three or four things you might
 * want to do with it. A finished one is a line in a record: when, what, who
 * came, what it cost. Rendering twenty of those as full cards made the page
 * enormous and buried the one thing people come back for - the invoice.
 *
 * Grouped by year, with the year's own total on the divider, because "what
 * have I spent with these people" is the other question this page answers.
 */
const rupees = (display) => Number(String(display || "0").replace(/[^0-9.]/g, "")) || 0;

const money = (amount) => amount.toLocaleString("en-IN", { maximumFractionDigits: 0 });

const History = ({ jobs }) => {
    if (!jobs.length) {
        return (
            <>
                <h2 className="mt-14 font-display font-semibold text-xl tracking-[-0.01em]">
                    Finished
                </h2>
                <p className="mt-4 text-sm text-ink-soft">
                    Nothing here yet. Jobs appear once they are closed.
                </p>
            </>
        );
    }

    const spent = jobs.reduce((sum, job) => sum + rupees(job.bill?.totalDisplay), 0);

    // Newest first, and the API already sorts them that way - this only groups
    const years = [];
    jobs.forEach((job) => {
        const year = new Date(job.updatedAt || job.createdAt).getFullYear();
        const bucket = years.find((y) => y.year === year);
        if (bucket) bucket.jobs.push(job);
        else years.push({ year, jobs: [job] });
    });

    return (
        <>
            <div className="mt-14 flex flex-wrap items-end justify-between gap-4">
                <h2 className="font-display font-semibold text-xl tracking-[-0.01em]">Finished</h2>

                <p className="text-[13.5px] text-ink-soft">
                    <span className="font-semibold text-ink tabular-nums">{jobs.length}</span>
                    {" "}job{jobs.length === 1 ? "" : "s"}
                    {spent > 0 && (
                        <>
                            {" · "}
                            <span className="font-semibold text-ink tabular-nums">&#8377;{money(spent)}</span>
                            {" "}with us
                        </>
                    )}
                </p>
            </div>

            <div className="mt-5 rounded-[24px] bg-surface shadow-card overflow-hidden">
                {years.map((bucket) => (
                    <div key={bucket.year}>
                        <div className="flex items-baseline justify-between gap-4 px-5 sm:px-6 py-3 bg-sunken">
                            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint tabular-nums">
                                {bucket.year}
                            </span>
                            <span className="text-[12px] text-ink-faint tabular-nums">
                                &#8377;{money(bucket.jobs.reduce((sum, j) => sum + rupees(j.bill?.totalDisplay), 0))}
                            </span>
                        </div>

                        {bucket.jobs.map((job) => <HistoryRow key={job.id} job={job} />)}
                    </div>
                ))}
            </div>
        </>
    );
};

const HistoryRow = ({ job }) => {
    const cancelled = job.status === "Cancelled";

    return (
        <div className="group flex items-center gap-4 px-5 sm:px-6 py-4 border-t border-hairline first:border-0 transition-colors hover:bg-sunken/60">
            <div className="w-[52px] shrink-0 text-center">
                <p className="font-display font-bold text-[17px] leading-none tabular-nums">
                    {new Date(job.updatedAt || job.createdAt).getDate()}
                </p>
                <p className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                    {new Date(job.updatedAt || job.createdAt).toLocaleString("en-IN", { month: "short" })}
                </p>
            </div>

            <div className="min-w-0 flex-1">
                <p className="font-semibold text-[14.5px] truncate">{job.serviceLabel}</p>
                <p className="mt-0.5 text-[12.5px] text-ink-faint truncate">
                    {job.ticketNumber}
                    {job.technician ? " · " + job.technician.name : ""}
                    {job.bill?.invoiceNumber ? " · " + job.bill.invoiceNumber : ""}
                </p>
            </div>

            <div className="shrink-0 text-right">
                {cancelled ? (
                    <span className="text-[12px] font-semibold text-ink-faint">Cancelled</span>
                ) : job.bill ? (
                    <>
                        <p className="font-display font-bold text-[16px] tabular-nums tracking-[-0.02em]">
                            &#8377;{job.bill.totalDisplay}
                        </p>
                        <p className="mt-0.5 text-[11px] text-ink-faint capitalize">
                            {job.bill.method || "paid"}
                        </p>
                    </>
                ) : (
                    <span className="text-[12px] text-ink-faint">No bill</span>
                )}
            </div>
        </div>
    );
};

const JobCard = ({ job, live }) => {
    const stage = STAGE[job.status] || { label: job.status, tone: "bg-sunken text-ink-soft" };

    return (
        <article className="rounded-[24px] bg-surface p-5 sm:p-6 shadow-card transition-shadow duration-300 hover:shadow-lift">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <span className={"text-[10.5px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-full " + stage.tone}>
                            {stage.label}
                        </span>
                        <span className="font-mono text-[11.5px] text-ink-faint">{job.ticketNumber}</span>
                    </div>

                    <h3 className="mt-2.5 font-display font-semibold text-[17px] tracking-[-0.01em]">
                        {job.serviceLabel}
                    </h3>

                    {job.problemDescription && (
                        <p className="mt-1.5 text-[14px] text-ink-soft leading-relaxed max-w-xl">
                            {job.problemDescription}
                        </p>
                    )}

                    {job.technician && (
                        <div className="mt-4 flex items-center gap-3">
                            {job.technician.photo ? (
                                <img src={job.technician.photo} alt="" className="w-9 h-9 rounded-full object-cover" />
                            ) : (
                                <span className="w-9 h-9 rounded-full bg-sunken grid place-items-center text-xs font-bold text-ink-soft">
                                    {job.technician.name.charAt(0)}
                                </span>
                            )}
                            <div className="text-[13.5px]">
                                <p className="font-semibold text-ink">{job.technician.name}</p>
                                <p className="text-ink-faint">
                                    {live ? "Coming to you" : "Did this job"}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="text-right shrink-0">
                    {job.bill ? (
                        <>
                            <p className="font-display font-bold text-xl tracking-[-0.02em] tabular-nums">
                                Rs {job.bill.totalDisplay}
                            </p>
                            <p className="mt-0.5 text-[11.5px] text-ink-faint font-mono">
                                {job.bill.invoiceNumber}
                            </p>
                            <p className={"mt-1.5 text-[11.5px] font-semibold " + (job.bill.paid ? "text-brand-deep" : "text-warn")}>
                                {job.bill.paid ? "Paid" : "Not paid yet"}
                            </p>
                        </>
                    ) : (
                        <p className="text-[13px] text-ink-faint flex items-center gap-1.5 justify-end">
                            <Clock className="w-3.5 h-3.5" />
                            {day(job.createdAt)}
                        </p>
                    )}
                </div>
            </div>

            {/* What the customer can actually do from here: watch them come, or
                read what was done. Nothing else on a job belongs to them. */}
            {(live && job.trackingToken) || job.bill?.workDone ? (
                <div className="mt-5 pt-4 border-t border-hairline flex flex-wrap items-center justify-between gap-3">
                    {job.bill?.workDone ? (
                        <p className="text-[13.5px] text-ink-soft flex items-start gap-2 max-w-xl">
                            <ReceiptText className="w-3.5 h-3.5 shrink-0 mt-0.5 text-ink-faint" />
                            {job.bill.workDone}
                        </p>
                    ) : <span />}

                    {live && job.trackingToken && (
                        <Link
                            to={"/track/" + job.trackingToken}
                            className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-deep"
                        >
                            Track on the map
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    )}
                </div>
            ) : null}
        </article>
    );
};

export default CustomerAccount;
