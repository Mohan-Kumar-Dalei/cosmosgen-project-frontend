import { useEffect, useState } from "react";
import { BadgeCheck, Check, KeyRound, MapPin, ReceiptText, UserCheck } from "lucide-react";
import { WhatsAppMark } from "./Marks";

/**
 * What actually happens, played out small.
 *
 * Two earlier versions of this were diagrams: five chips, then five numbered
 * nodes on a wire. Both described the process accurately and neither showed
 * it. A reader deciding whether to let a stranger into their house does not
 * want a diagram of a booking, they want to see one - the message going to the
 * assistant, an engineer being assigned, the code arriving, the bill being
 * built, the job closing.
 *
 * So this is a single small panel that plays those five moments as the
 * interfaces they really are, one after another, on a loop. Deliberately one
 * panel and not a row of them: the whole point is that these happen in
 * sequence, in the same place, to the same job - and a compact card says that
 * where a full-width track just took up the page.
 *
 * Every stage is rebuilt from scratch when it becomes current (`key={step}`),
 * which is what lets each little interface animate itself in with nothing but
 * CSS delays. Somebody who has asked for less movement gets the finished state
 * of every stage instead, listed quietly, with no timer running at all.
 */
const still = () =>
    typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- the five moments ---------- */

/** 1. The message, and the assistant picking it up. */
const Chat = () => (
    <div className="flex flex-col gap-2">
        <div className="cg-pop self-end max-w-[78%] px-3 py-2 rounded-2xl rounded-br-md bg-brand text-white text-[12.5px] leading-snug">
            AC is not cooling since morning
        </div>

        <div className="cg-pop flex items-end gap-2" style={{ "--d": "0.55s" }}>
            <span className="shrink-0 w-6 h-6 rounded-full bg-accent-tint text-accent grid place-items-center">
                <WhatsAppMark className="w-3 h-3" />
            </span>

            {/* The dots go, and the answer takes their place */}
            <span className="cg-typing px-3 py-2.5 rounded-2xl rounded-bl-md bg-sunken inline-flex items-center gap-1">
                {[0, 1, 2].map((d) => (
                    <span key={d} className="cg-dot" style={{ "--d": d * 0.16 + "s" }} />
                ))}
            </span>
        </div>

        <div
            className="cg-pop self-start max-w-[82%] ml-8 px-3 py-2 rounded-2xl rounded-bl-md bg-sunken text-[12.5px] leading-snug text-ink-soft"
            style={{ "--d": "1.45s" }}
        >
            Which room is it in, and roughly how old?
        </div>
    </div>
);

/** 2. The office choosing somebody and telling you who. */
const Assign = () => (
    <div className="flex flex-col gap-3">
        <p className="cg-pop text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">
            Assigned by the office
        </p>

        <div className="cg-pop flex items-center gap-3 p-2.5 rounded-2xl bg-sunken" style={{ "--d": "0.35s" }}>
            <span className="shrink-0 w-9 h-9 rounded-full bg-accent-tint text-accent grid place-items-center text-[13px] font-bold">
                RM
            </span>

            <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold truncate">Rakesh M.</span>
                <span className="block text-[11.5px] text-ink-faint">AC &amp; appliance engineer</span>
            </span>

            <span className="cg-pop shrink-0 inline-flex items-center gap-1 h-6 px-2 rounded-full bg-brand-tint text-brand-deep text-[11px] font-semibold"
                style={{ "--d": "0.95s" }}>
                <MapPin className="w-3 h-3" />
                2.4 km
            </span>
        </div>

        <p className="cg-pop flex items-center gap-1.5 text-[12px] text-ink-soft" style={{ "--d": "1.3s" }}>
            <BadgeCheck className="w-3.5 h-3.5 text-brand" />
            Checked before his first job
        </p>
    </div>
);

/** 3. Six digits at the door, and nothing starting without them. */
const Code = () => (
    <div className="flex flex-col gap-3">
        <p className="cg-pop text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">
            Read this out at the door
        </p>

        <div className="flex gap-1.5">
            {[4, 1, 9, 2, 7, 3].map((digit, i) => (
                <span
                    key={i}
                    className="cg-pop flex-1 h-11 rounded-xl bg-sunken grid place-items-center font-display font-bold text-[16px] tabular-nums"
                    style={{ "--d": 0.2 + i * 0.13 + "s" }}
                >
                    {digit}
                </span>
            ))}
        </div>

        <p className="cg-pop flex items-center gap-1.5 text-[12px] text-ink-soft" style={{ "--d": "1.15s" }}>
            <Check className="w-3.5 h-3.5 text-brand" strokeWidth={3} />
            Work starts. A second code ends it.
        </p>
    </div>
);

/** 4. The bill, built in front of you off the office's list. */
const Bill = () => (
    <div className="flex flex-col gap-2">
        <p className="cg-pop text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">
            Built in front of you
        </p>

        {[
            ["Visit and diagnosis", "399"],
            ["Gas top-up (1.5 ton)", "850"],
        ].map(([line, amount], i) => (
            <p
                key={line}
                className="cg-pop flex items-baseline justify-between gap-3 text-[12.5px] text-ink-soft"
                style={{ "--d": 0.25 + i * 0.35 + "s" }}
            >
                <span className="truncate">{line}</span>
                <span className="tabular-nums text-ink">Rs {amount}</span>
            </p>
        ))}

        <p
            className="cg-pop flex items-baseline justify-between gap-3 pt-2 mt-1 border-t border-hairline text-[13px] font-semibold"
            style={{ "--d": "1.05s" }}
        >
            <span>Total</span>
            <span className="tabular-nums">Rs 1,249</span>
        </p>
    </div>
);

/** 5. Paid, and on the record. */
const Done = () => (
    <div className="h-full flex flex-col items-center justify-center text-center gap-3">
        <span className="cg-pop cg-tick w-12 h-12 rounded-full bg-brand text-white grid place-items-center">
            <Check className="w-6 h-6" strokeWidth={3} />
        </span>

        <p className="cg-pop text-[13px] font-semibold" style={{ "--d": "0.45s" }}>
            Paid, and the invoice is on your WhatsApp
        </p>

        <p className="cg-pop text-[12px] text-ink-faint" style={{ "--d": "0.7s" }}>
            Cash, online, or part of each
        </p>
    </div>
);

const STAGES = [
    {
        label: "You tell us",
        note: "On WhatsApp, in the app, or to the assistant on this site, in Odia, Hindi or English.",
        Icon: (props) => <WhatsAppMark {...props} />,
        Panel: Chat,
    },
    {
        label: "We send somebody",
        note: "An approved engineer from our own team who does that work and is nearest you.",
        Icon: UserCheck,
        Panel: Assign,
    },
    {
        label: "Your code starts it",
        note: "Six digits reach you on WhatsApp. Nothing begins until you read them out at the door.",
        Icon: KeyRound,
        Panel: Code,
    },
    {
        label: "The bill, in front of you",
        note: "Every line comes off the office's own price list while you watch it being built.",
        Icon: ReceiptText,
        Panel: Bill,
    },
    {
        label: "You pay",
        note: "Cash to the engineer or a link from the company. The invoice reaches your WhatsApp either way.",
        Icon: Check,
        Panel: Done,
    },
];

/** Long enough to read the little interface, short enough not to be a film. */
const HOLD_MS = 3200;

export const JobDemo = () => {
    const [step, setStep] = useState(0);

    /*
     * Two different questions, and they were one variable for a while, which
     * meant pressing a node replaced the whole demo with the still list meant
     * for somebody who had asked for no movement at all.
     *
     * The motion flag is the reader's standing preference and decides whether
     * there is a demo here at all. The auto flag is only whether it advances
     * on its own, and pressing a stage turns that off.
     */
    const [motion] = useState(() => !still());
    const [auto, setAuto] = useState(true);

    useEffect(() => {
        if (!motion || !auto) return undefined;

        const next = setTimeout(() => setStep((n) => (n + 1) % STAGES.length), HOLD_MS);
        return () => clearTimeout(next);
    }, [step, motion, auto]);

    /** Choosing a stage hands the pace to the reader and keeps it there. */
    const pick = (i) => {
        setAuto(false);
        setStep(i);
    };

    if (!motion) {
        return (
            <ol className="w-full max-w-[420px] flex flex-col gap-2.5 m-0 p-0 list-none">
                {STAGES.map((stage, i) => (
                    <li key={stage.label} className="flex items-center gap-3 text-[13.5px]">
                        <span className="shrink-0 w-6 h-6 rounded-full bg-accent-tint text-accent grid place-items-center text-[11px] font-bold tabular-nums">
                            {i + 1}
                        </span>
                        {stage.label}
                    </li>
                ))}
            </ol>
        );
    }

    const { label, note, Panel } = STAGES[step];

    return (
        <figure className="m-0 w-full max-w-xl">
            {/*
              * One rail, not four separate wires.
              *
              * Each gap used to be its own bar, drawn from the middle of one
              * cell to the middle of the next - which left half a cell of
              * nothing outside the first and last nodes and read as a stray
              * length of bar tacked on the end. A single rail from the first
              * circle to the last, with one fill growing along it, is what a
              * progress bar actually is.
              */}
            <div className="relative">
                <span
                    aria-hidden
                    className="absolute left-[18px] right-[18px] top-[16px] h-[3px] rounded-full bg-hairline overflow-hidden"
                >
                    <span
                        className="cg-rail block h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                        style={{ width: (step / (STAGES.length - 1)) * 100 + "%" }}
                    />
                </span>

                <ol className="relative flex justify-between m-0 p-0 list-none">
                    {STAGES.map((stage, i) => (
                        <li key={stage.label}>
                            <button
                                onClick={() => pick(i)}
                                aria-label={stage.label}
                                aria-current={i === step ? "step" : undefined}
                                className={"relative block w-9 h-9 rounded-full grid place-items-center transition-all duration-300 "
                                    + (i < step
                                        ? "bg-accent-tint text-accent"
                                        : i === step
                                            ? "bg-accent text-white scale-110 shadow-lift"
                                            : "bg-sunken text-ink-faint hover:text-ink-soft")}
                            >
                                <stage.Icon className="w-4 h-4" strokeWidth={2.1} />
                            </button>
                        </li>
                    ))}
                </ol>
            </div>

            {/* What that stage is, in the page's own voice */}
            <div key={"head-" + step} className="cg-stage mt-6">
                <h3 className="font-display font-semibold text-[18px] tracking-[-0.02em]">
                    {label}
                </h3>
                <p className="mt-1.5 max-w-md text-[13.5px] leading-relaxed text-ink-soft">
                    {note}
                </p>
            </div>

            {/* And what it looks like while it happens */}
            <div
                key={step}
                className="cg-stage mt-5 w-full max-w-[420px] rounded-[24px] border border-hairline bg-surface shadow-card"
            >
                <div className="relative px-4 py-4 h-[178px]">
                    <Panel />
                </div>
            </div>
        </figure>
    );
};
