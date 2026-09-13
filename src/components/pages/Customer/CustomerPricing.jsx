import { Link } from "react-router-dom";
import { ArrowRight, Banknote, Smartphone, Split, Footprints, ShieldCheck, Check } from "lucide-react";
import { WhatsAppMark } from "./Marks";
import { CustomerShell } from "./CustomerShell";
import { PageHead, HeadStrip, Band, Head } from "./layout";
import { useHeroIntro, useReveal, useSmoothScroll } from "./motion";
import { WHATSAPP_LINK, ik } from "./brand";
import { usePictures } from "./pictures";

/**
 * What it costs, and when.
 *
 * There are no figures on this page, and that is the honest version rather
 * than a coy one. Charges come off a price list the office keeps and revises;
 * a rate typed into a marketing page is out of date the first time the office
 * changes it, and then it is a promise the company is held to in somebody's
 * living room. So the page explains the mechanism instead - who sets the
 * price, when it is fixed, what cannot be added - which is what people are
 * actually anxious about.
 */
const WAYS = [
    {
        icon: Smartphone,
        title: "Online",
        body: "A payment link reaches your WhatsApp from the company. You pay by UPI or card, and the engineer takes nothing at the door.",
        note: "Never pay into a number somebody reads out to you. A genuine link comes from us, in the thread you already have.",
    },
    {
        icon: Banknote,
        title: "Cash",
        body: "You hand the full amount to the person who did the work. The invoice still comes from the company and lands on your WhatsApp.",
        note: "The engineer settles their side with the office afterwards. That is between them and us, with nothing more to do at your end.",
    },
    {
        icon: Split,
        title: "Split",
        body: "Part in cash to the engineer, the rest online to the company. Used when it suits both sides.",
        note: "You are told both figures before you agree to anything, and both appear on the one invoice.",
    },
    {
        icon: Footprints,
        title: "Visit charge",
        body: "If somebody comes out and you decide not to go ahead, a small charge covers the trip.",
        note: "You are told what it is before the engineer sets off, never after they have arrived.",
    },
];

const NEVER = [
    "A price invented at your door. Every line comes off the office's list.",
    "A figure that moves after you have seen the total.",
    "A bill before you have confirmed the work is finished with your second code.",
    "A charge for the office's own paperwork, processing or 'convenience'.",
];

/**
 * The shape of a bill, in the masthead.
 *
 * A pricing page whose hero is a sentence about pricing is asking to be taken
 * on trust. Putting the document itself up there - ruled, totalled, and marked
 * as an example - answers the question the page exists for before a word of it
 * is read.
 */
/**
 * The shape of a bill, in the masthead.
 *
 * A pricing page whose hero is a sentence about pricing is asking to be taken
 * on trust. Putting the document itself up there answers the question the page
 * exists for before a word of it is read.
 *
 * It is built to look like the thing it stands for and to be impossible to
 * mistake for a real one: the header carries an invoice number and a date the
 * way ours do, the lines are ruled with leaders the way a bill is, and the
 * word EXAMPLE sits in the header rather than in small print at the bottom
 * where nobody reads it.
 */
const LINES = [
    ["Visit and inspection", "199"],
    ["AC gas top-up", "1,600"],
    ["Drain pipe cleaning", "250"],
];

const Receipt = () => {
    const pics = usePictures();

    return (
        <figure className="m-0 w-full max-w-[420px]">
            <div className="bg-surface shadow-lift rounded-t-2xl overflow-hidden">
                {/* ---- who it is from ---- */}
                <div className="px-6 pt-6 pb-5 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <img src={ik(pics.LOGO, "w-96")} alt="" className="w-8 h-8 object-contain" loading="lazy" />
                        <span className="flex flex-col leading-none">
                            <span className="font-display font-bold text-[15px] tracking-[-0.02em]">Cosmosgen</span>
                            <span className="mt-1 text-[8.5px] uppercase tracking-[0.18em] text-ink-faint">
                                Engineers Pvt. Ltd.
                            </span>
                        </span>
                    </div>

                    <span className="shrink-0 inline-flex items-center h-6 px-2.5 rounded-full bg-warn-tint text-warn text-[10px] font-bold uppercase tracking-[0.14em]">
                        Example
                    </span>
                </div>

                <div className="px-6 pb-5 flex items-center justify-between text-[11.5px] text-ink-faint">
                    <span className="tabular-nums">INV-2609-0008</span>
                    <span className="tabular-nums">26 Sep 2026</span>
                </div>

                <div className="h-px bg-hairline" />

                {/* ---- what was done ---- */}
                <div className="px-6 py-5 flex flex-col gap-3.5 text-[13.5px]">
                    {LINES.map(([what, amount]) => (
                        <div key={what} className="flex items-baseline gap-3">
                            <span className="text-ink-soft">{what}</span>
                            <span aria-hidden className="flex-1 border-b border-dotted border-hairline-strong translate-y-[-3px]" />
                            <span className="font-medium tabular-nums">&#8377;{amount}</span>
                        </div>
                    ))}
                </div>

                {/* ---- what it came to ---- */}
                <div className="px-6 py-4 bg-sunken flex items-baseline justify-between">
                    <span className="font-semibold text-[14px]">Total</span>
                    <span className="font-display font-extrabold text-[22px] tabular-nums tracking-[-0.03em]">
                        &#8377;2,049
                    </span>
                </div>

                <div className="px-6 py-3.5 bg-sunken flex items-center justify-between text-[12px]">
                    <span className="text-ink-soft">Paid by UPI, on a link from the company</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-brand-deep">
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        Settled
                    </span>
                </div>

                {/* The torn edge. A receipt that ends on a straight line is a card
                    wearing a receipt's clothes */}
                <div
                    aria-hidden
                    className="h-4 bg-sunken"
                    style={{
                        WebkitMaskImage: "radial-gradient(circle at 7px 0, transparent 0 6px, #000 6.5px)",
                        maskImage: "radial-gradient(circle at 7px 0, transparent 0 6px, #000 6.5px)",
                        WebkitMaskSize: "14px 16px",
                        maskSize: "14px 16px",
                        WebkitMaskRepeat: "repeat-x",
                        maskRepeat: "repeat-x",
                    }}
                />
            </div>

            <figcaption className="mt-4 text-[12px] leading-relaxed text-ink-faint">
                An illustration of the shape of a bill, not a quotation. Your own figures come
                from the office&rsquo;s price list on the day.
            </figcaption>
        </figure>
    );
};

const CustomerPricing = () => {
    useSmoothScroll();
    const hero = useHeroIntro();
    const page = useReveal();

    return (
        <CustomerShell>
            <div ref={hero}>
                <PageHead
                    eyebrow="Pricing"
                    title="The price is on a list, not in somebody's head"
                    lede="Every charge on your bill is picked from the price list the office keeps. The engineer standing in your house cannot invent a figure, cannot round one up, and cannot add anything once you have seen the total."
                    // Back beside the headline, which is where it belongs -
                    // the masthead's art box now centres what it holds, so it
                    // sits level with the words rather than riding at the top
                    art={<Receipt />}
                    foot={<HeadStrip items={WAYS.map((w) => w.title)} />}
                >
                    <div className="flex flex-wrap gap-3">
                        <Link
                            to="/ai-assistant/chat"
                            className="group inline-flex items-center gap-2 h-12 px-6 rounded-full bg-accent text-white font-semibold text-[15px] hover:bg-accent-deep transition-colors"
                        >
                            Ask what your job involves
                            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                        <Link
                            to="/how-it-works"
                            className="group inline-flex items-center gap-2 h-12 px-6 rounded-full border border-white/20 font-semibold text-[15px] hover:bg-white/10 transition-colors"
                        >
                            How a job runs
                            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                    </div>
                </PageHead>
            </div>

            <div ref={page}>
                <Band tone="white" decor="dots">
                    <div className="max-w-3xl">
                        <div>
                            <Head
                                eyebrow="Why there is no rate card here"
                                title="A number on a website is a promise made in the wrong room"
                                lede="Two air conditioners with the same complaint are rarely the same job. One needs a filter cleaned, the other needs gas and a new pipe. A single figure printed here would be wrong for one of them, and it is the customer who would find that out at the door."
                            />

                            <p data-reveal className="mt-6 max-w-xl text-[15px] leading-relaxed text-ink-soft">
                                So the engineer looks at the actual problem and builds the bill in
                                front of you, line by line, from the office's list. You see the total
                                before you agree to it, and the job is not finished, and no invoice
                                exists, until you say so with your second code.
                            </p>

                            <p data-reveal className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-soft">
                                If you want a sense of it beforehand, the assistant can tell you what
                                a job like yours usually involves and what it typically turns on.
                            </p>
                        </div>

                    </div>
                </Band>

                <Band decor="blobs">
                    <Head
                        eyebrow="Paying"
                        title="Four ways money moves, and you are told which before anybody starts"
                    />

                    <div data-stagger className="mt-12 grid gap-x-14 gap-y-12 lg:grid-cols-2">
                        {WAYS.map((w) => (
                            <div key={w.title} className="group flex gap-5 max-w-xl">
                                <w.icon
                                    className="w-6 h-6 text-accent shrink-0 mt-1 transition-transform duration-500 group-hover:-translate-y-1"
                                    strokeWidth={1.7}
                                />
                                <div>
                                    <h3 className="font-display font-semibold text-[19px] tracking-[-0.015em]">
                                        {w.title}
                                    </h3>
                                    <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">{w.body}</p>
                                    <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-faint">{w.note}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Band>

                <Band tone="white" decor="dots">
                    <div className="grid lg:grid-cols-[1fr_1fr] gap-12 lg:gap-16">
                        <Head
                            eyebrow="What you will never be charged"
                            title="The short list of things that cannot happen to your bill"
                            lede="Not policy on a page: these are the ones the software itself prevents."
                        />

                        <ul data-stagger className="flex flex-col gap-4 lg:pt-4">
                            {NEVER.map((line) => (
                                <li key={line} className="group flex gap-3.5 text-[15px] leading-relaxed text-ink-soft">
                                    <ShieldCheck
                                        className="w-[18px] h-[18px] text-brand shrink-0 mt-1 transition-transform duration-300 group-hover:scale-110"
                                        strokeWidth={2}
                                    />
                                    {line}
                                </li>
                            ))}
                        </ul>
                    </div>
                </Band>

                <Band tone="dark" decor="blobs">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                        <div className="flex-1">
                            <Head
                                tone="dark"
                                title="Tell us the problem and we will tell you what it takes"
                                lede="No obligation, and no engineer sent until you ask for one."
                            />
                        </div>

                        <div data-reveal className="flex flex-wrap gap-3 shrink-0">
                            <a
                                href={WHATSAPP_LINK}
                                target="_blank"
                                rel="noreferrer"
                                className="group inline-flex items-center gap-2 h-12 px-6 rounded-full bg-brand text-white font-semibold text-[15px] hover:bg-brand-deep transition-colors"
                            >
                                <WhatsAppMark className="w-[17px] h-[17px] transition-transform duration-300 group-hover:scale-110" />
                                Book on WhatsApp
                            </a>
                            <Link
                                to="/ai-assistant/chat"
                                className="group inline-flex items-center gap-2 h-12 px-6 rounded-full border border-white/20 font-semibold text-[15px] hover:bg-white/10 transition-colors"
                            >
                                Ask the assistant
                                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                            </Link>
                        </div>
                    </div>
                </Band>
            </div>
        </CustomerShell>
    );
};

export default CustomerPricing;
