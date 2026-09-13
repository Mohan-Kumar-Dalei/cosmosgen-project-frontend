import { MessageSquare, UserCheck, KeyRound, ReceiptText, CreditCard } from "lucide-react";
import { useStack } from "./motion";

/**
 * The job, from the message to the money, as a deck that builds up under you.
 *
 * Numbered because it genuinely is a sequence and the order carries something
 * the reader needs - the code comes before the work, the bill comes after it,
 * and nothing can be reordered without changing what the company is promising.
 * Numbering a set of unrelated features would be decoration; here it is the
 * point, and the stacking says the same thing a second way: each step lands on
 * top of the one that had to happen first.
 *
 * The first version of this was too polite to read as a stack at all. The
 * panels were the height of a paragraph and each sat fourteen pixels below the
 * last, so what should have been a deck looked like a list that shuffled
 * slightly. Three things fixed it: the panels are tall enough to fill most of
 * the screen, each one carries its own colour so a new arrival is obvious, and
 * the one being covered visibly drops back instead of merely being hidden.
 *
 * Sticky does the stacking, so with the script gone the panels still pile up
 * and every word stays readable. GSAP only pushes the covered one away.
 *
 * Each panel's ground is a token rather than a gradient written here. The
 * five colours were literal pale blues and greens at first, which meant a
 * reader on the dark theme got near-white text on cream - five smears where
 * five cards should have been.
 */
const STEPS = [
    {
        icon: MessageSquare,
        eyebrow: "You start it",
        title: "You tell us what is wrong",
        body: "On WhatsApp, in the app, or to the assistant on this site, in Odia, Hindi or English. You do not have to work out which trade it falls under. Describing the problem in your own words is enough.",
        ground: "var(--step-1)",
    },
    {
        icon: UserCheck,
        eyebrow: "The office decides",
        title: "We send somebody near you",
        body: "An approved engineer from our own team who does that work and is closest to your address. You get their name, their photograph and their number before they set off. Never an unknown person at the door.",
        ground: "var(--step-2)",
    },
    {
        icon: KeyRound,
        eyebrow: "Your permission",
        title: "They arrive, and you let them start",
        body: "A live link shows them on the road. Six digits reach you on WhatsApp, and the work only begins once you read them out at the door. Nobody can mark themselves as working from the car park.",
        ground: "var(--step-3)",
    },
    {
        icon: ReceiptText,
        eyebrow: "In front of you",
        title: "The bill is built while you watch",
        body: "Every line comes off the company's price list: the service charge, anything extra, and any part used. You confirm the work is finished with a second code, and until you do, no figure exists at all.",
        ground: "var(--step-4)",
    },
    {
        icon: CreditCard,
        eyebrow: "However suits you",
        title: "You pay, and it is on record",
        body: "Cash to the engineer, or online through a link that comes from the company, never to a number somebody reads out to you. The invoice reaches your WhatsApp either way, and stays in your account here.",
        ground: "var(--step-5)",
    },
];

export const FlowStack = () => {
    const scope = useStack();

    return (
        <ol ref={scope} className="relative flex flex-col gap-6">
            {STEPS.map((step, i) => (
                <li
                    key={step.title}
                    data-stack-card
                    // Each one parks a little lower than the last, so the edge of
                    // everything underneath stays in view like a fanned deck
                    style={{ top: "calc(5.5rem + " + i * 16 + "px)", transformOrigin: "top center" }}
                    className="cg-stack-card sticky rounded-[28px] overflow-hidden border border-hairline shadow-lift"
                >
                    <div className="relative" style={{ background: step.ground }}>
                        <div className="relative p-8 sm:p-12 lg:p-14 min-h-[300px] sm:min-h-[340px] flex flex-col justify-between gap-10">
                            <div className="flex items-start justify-between gap-6">
                                <span style={{ background: "var(--step-chip)" }}
                                    className="cg-glass inline-flex items-center gap-2.5 h-8 pl-2 pr-4 rounded-full text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                                    <span className="w-5 h-5 rounded-full bg-accent text-white grid place-items-center text-[10px] tabular-nums">
                                        {i + 1}
                                    </span>
                                    {step.eyebrow}
                                </span>

                                <step.icon className="w-7 h-7 text-accent/70 shrink-0" strokeWidth={1.5} />
                            </div>

                            <div className="max-w-2xl">
                                <h3 className="font-display font-bold text-[clamp(1.5rem,3.2vw,2.3rem)] leading-[1.1] tracking-[-0.03em] text-balance">
                                    {step.title}
                                </h3>
                                <p className="mt-4 text-[14.5px] sm:text-[16px] leading-relaxed text-ink-soft">
                                    {step.body}
                                </p>
                            </div>
                        </div>

                        {/* The step number, large enough to be part of the
                            composition rather than a label on it */}
                        <span
                            aria-hidden
                            style={{ color: "var(--step-figure)" }}
                            className="absolute -bottom-6 right-6 sm:right-10 font-display font-bold text-[110px] sm:text-[150px] leading-none tracking-[-0.06em] tabular-nums select-none"
                        >
                            {String(i + 1).padStart(2, "0")}
                        </span>
                    </div>
                </li>
            ))}
        </ol>
    );
};
