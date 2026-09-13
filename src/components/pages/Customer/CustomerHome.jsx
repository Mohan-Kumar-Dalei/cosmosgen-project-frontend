import { Link } from "react-router-dom";
import {
    ArrowRight, Sparkles, KeyRound, BadgeCheck, Bot,
    Smartphone, Route, ReceiptText,
} from "lucide-react";
import { CustomerShell } from "./CustomerShell";
import { ServiceShelf } from "./ServiceShelf";
import { HomeHero } from "./HomeHero";
import { ProblemBrowser } from "./ProblemBrowser";
import { FlowStack } from "./FlowStack";
import { TrackingCard } from "./TrackingCard";
import { Art } from "./Art";
import { WhatsAppMark, PlayStoreMark, StoreBadge } from "./Marks";
import { Band, Head } from "./layout";
import { useArea } from "./area";
import { useCountUp, useHeroIntro, useParallax, useReveal, useSmoothScroll } from "./motion";
import { WHATSAPP_LINK, APP_LINK } from "./brand";
import { usePictures } from "./pictures";

/**
 * What somebody sees who has never dealt with us.
 *
 * Built to be used rather than read. The first screen carries the three things
 * a person arrives with - who are you, do you come to my street, what do you
 * actually do - and the last of those is answered by a shelf of the work
 * itself rather than a paragraph about it.
 *
 * The one thing the page will not do is take a booking. A job needs a pin on a
 * map, a live engineer near it and a code at the door, and a browser form can
 * give none of those honestly - so every route to one goes to WhatsApp or the
 * app, which have all three.
 */

/**
 * Four figures, and every one of them is checkable.
 *
 * The temptation on a page like this is a row of round numbers - jobs done,
 * happy customers, a rating out of five - and a young company has none of
 * those honestly. These are facts about how the thing is built instead: the
 * catalogue's own length, the radius the coverage check really searches, the
 * two codes, and what you owe before agreeing a total. Nothing here would
 * embarrass anybody if a customer asked where it came from.
 */
const FACTS = [
    { n: "4", unit: "services", note: "on the list today. The office adds to it whenever we approve a new trade." },
    { n: "25", unit: "km", note: "is how far out we look for somebody when you tell us where you are." },
    { n: "2", unit: "codes", note: "one to start the work and one to end it. Both of them are yours." },
    { n: "0", unit: "rupees", note: "is what you owe before you have seen the total and agreed to it." },
];

const PROMISES = [
    {
        icon: ReceiptText,
        title: "A price list, not a guess",
        body: "Every line is picked off the office's own list. Nothing can be invented at your door or added afterwards.",
    },
    {
        icon: KeyRound,
        title: "Two codes, both yours",
        body: "Six digits start the work and six more finish it. Until the second set, no bill exists at all.",
    },
    {
        icon: Route,
        title: "You watch them come",
        body: "A live link shows where they have reached, so nobody keeps a whole afternoon free.",
    },
    {
        icon: BadgeCheck,
        title: "Our own approved team",
        body: "Every engineer is checked before their first job, and the office answers for the work.",
    },
];

/**
 * A figure, and then the sentence it belongs to.
 *
 * The first version set the number and a unit in caps and left a fragment
 * underneath - "4 TRADES" over "on the list today" - which is a shape you
 * have to assemble in your head before it means anything. Now the number is
 * simply the first word of a sentence, which is how anybody reads it anyway.
 */
const Figure = ({ fact }) => {
    const number = useCountUp(fact.n);

    return (
        <div className="max-w-[15.5rem]">
            <p className="flex items-baseline gap-2.5">
                <span
                    ref={number}
                    className="font-display font-extrabold text-[clamp(2.8rem,5.6vw,4rem)] leading-none tracking-[-0.055em] tabular-nums"
                >
                    {fact.n}
                </span>
                <span className="font-display font-semibold text-[17px] tracking-[-0.02em] opacity-85">
                    {fact.unit}
                </span>
            </p>

            <p className="mt-4 text-[14px] leading-relaxed opacity-75">
                {fact.note}
            </p>
        </div>
    );
};

const CustomerHome = () => {
    useSmoothScroll();
    const hero = useHeroIntro();
    const page = useReveal();
    const drift = useParallax();
    const { known, place, covered } = useArea();
    const pics = usePictures();

    return (
        <CustomerShell>
            <div ref={hero}>
                <HomeHero />
            </div>

            <div ref={page}>
                <div ref={drift}>
                    {/* What the shelf could not say in a chip */}
                    <section className="mx-auto max-w-6xl px-5 sm:px-8 flex flex-wrap items-center justify-between gap-4">
                        {known && !covered ? (
                            <p className="text-[14px] leading-relaxed text-ink border-l-2 border-warn pl-4 max-w-2xl">
                                <span className="font-semibold">
                                    We have not reached {place.label || place.city} yet.
                                </span>{" "}
                                Message us anyway. The office can sometimes send somebody from the
                                nearest town.
                            </p>
                        ) : <span />}
                    </section>

                    {/* ---------------- THE SHELF ----------------
                        It used to sit under the headline, sharing the opening
                        with the picture and the area check - three things
                        competing in one screen, and the shelf lost. Given a
                        band of its own it has room to be pushed along, and the
                        hero is left with one job. */}
                    <Band tone="white" decor="dots">
                        <Head
                            eyebrow="What we do"
                            title="Four trades today, and the list grows"
                            lede="Push along to see what the company is called out for. Each one opens into the machines and the faults underneath it."
                        />

                        <div data-reveal className="mt-10">
                            <ServiceShelf />
                        </div>
                    </Band>

                    {/* ---------------- THE FIELD ---------------- */}
                    <Band tone="field" decor="rich">
                        <div data-stagger className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
                            {FACTS.map((f) => <Figure key={f.unit} fact={f} />)}
                        </div>

                        <div className="mt-16 lg:mt-20 h-px bg-white/15" />

                        <div data-stagger className="mt-16 lg:mt-20 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
                            {PROMISES.map((p) => (
                                <div key={p.title} className="group">
                                    <p.icon
                                        className="w-6 h-6 transition-transform duration-500 group-hover:-translate-y-1"
                                        strokeWidth={1.7}
                                    />
                                    <h3 className="mt-4 font-display font-semibold text-[16.5px] leading-snug tracking-[-0.02em]">
                                        {p.title}
                                    </h3>
                                    <p className="mt-2 text-[13.5px] leading-relaxed opacity-70">{p.body}</p>
                                </div>
                            ))}
                        </div>
                    </Band>

                    {/* ---------------- WATCHING THEM COME ---------------- */}
                    <Band decor="dots">
                        <div className="grid lg:grid-cols-[1fr_auto] gap-12 lg:gap-16 items-center">
                            <div>
                                <Head
                                    eyebrow="While you wait"
                                    title="You can see exactly where they have reached"
                                    lede="A link on your WhatsApp shows the engineer on the road and how far off they are. Nobody has to keep the whole afternoon free, and nobody has to ring to ask."
                                />

                                <ul data-stagger className="mt-8 flex flex-col gap-3.5 max-w-xl">
                                    {[
                                        "Their name, photograph and number, before they set off.",
                                        "The code that starts the job, in the same thread.",
                                        "No work begins until you read that code out at the door.",
                                    ].map((line) => (
                                        <li key={line} className="group flex gap-3.5 text-[15px] leading-relaxed text-ink-soft">
                                            <span
                                                aria-hidden
                                                className="mt-[9px] w-1.5 h-1.5 rounded-full bg-accent shrink-0 transition-transform duration-300 group-hover:scale-150"
                                            />
                                            {line}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div data-reveal className="justify-self-center lg:justify-self-end">
                                <TrackingCard />
                            </div>
                        </div>
                    </Band>

                    {/* ---------------- WHAT HAS STOPPED WORKING ---------------- */}
                    <Band tone="white" decor="dots">
                        <Head
                            eyebrow="The work itself"
                            title="Nobody wants a service. They want the fridge cold again"
                            lede="Every trade, and the faults people actually report. You never have to know which one yours falls under."
                        />

                        <div data-reveal className="mt-10">
                            <ProblemBrowser />
                        </div>
                    </Band>

                    {/* ---------------- THE MONEY ---------------- */}
                    <Band decor="dots">
                        <div className="grid lg:grid-cols-[auto_1fr] gap-10 lg:gap-16 items-center">
                            <Art
                                data-reveal
                                data-parallax="26"
                                src={pics.HERO_AC}
                                alt=""
                                icon={ReceiptText}
                                tr="w-620"
                                fit="contain"
                                tint="leaf"
                                className="hidden lg:block w-[290px] aspect-[4/4.6] rounded-[30px]"
                            />

                            <div>
                                <p
                                    data-reveal
                                    className="font-display font-extrabold text-[clamp(2rem,4.6vw,3.2rem)] leading-[1.04] tracking-[-0.045em] text-balance max-w-2xl"
                                >
                                    The price is on a list, not in
                                    {" "}
                                    <span className="text-accent">somebody&rsquo;s head.</span>
                                </p>

                                <p data-reveal className="mt-6 max-w-xl text-[15.5px] leading-relaxed text-ink-soft">
                                    The engineer builds the bill in front of you from the office&rsquo;s own
                                    list, and it reaches your WhatsApp. Pay in cash, or on a link that
                                    comes from the company, never to a number somebody reads out.
                                </p>

                                <Link
                                    to="/pricing"
                                    data-reveal
                                    className="group mt-8 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-ink text-canvas font-semibold text-[15px] hover:opacity-90 transition-opacity"
                                >
                                    How pricing works
                                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                                </Link>
                            </div>
                        </div>
                    </Band>

                    {/* ---------------- HOW IT WORKS ---------------- */}
                    <Band tone="white" decor="dots">
                        <Head eyebrow="How it works" title="From your message to a bill you agreed to" />

                        <div className="mt-12">
                            <FlowStack />
                        </div>
                    </Band>

                    {/* ---------------- ASK ---------------- */}
                    <Band decor="weave">
                        <div className="grid lg:grid-cols-[auto_1fr_auto] gap-10 items-center">
                            <Art
                                data-reveal
                                data-parallax="18"
                                src={pics.HERO_ELECTRICAL}
                                alt=""
                                icon={Sparkles}
                                tr="w-480"
                                fit="contain"
                                tint="sand"
                                className="hidden lg:block w-[200px] aspect-[4/4.6] rounded-[26px]"
                            />

                            <div>
                                <Head
                                    title="Not sure what is wrong?"
                                    lede="Describe it in Odia, Hindi or English. The assistant tells you which trade it is and what putting it right involves, and can read back your own past jobs."
                                />
                            </div>

                            <Link
                                to="/chat"
                                data-reveal
                                className="group shrink-0 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-accent text-white font-semibold text-[15px] hover:bg-accent-deep transition-colors"
                            >
                                <Bot className="w-4 h-4" />
                                Ask the assistant
                            </Link>
                        </div>
                    </Band>

                    {/* ---------------- THE APP ---------------- */}
                    <Band tone="dark" decor="blobs">
                        <div className="grid lg:grid-cols-[1fr_auto] gap-12 items-center">
                            <div className="max-w-xl">
                                <Head
                                    tone="dark"
                                    eyebrow="The app"
                                    title="Book in a few taps, and watch them arrive"
                                    lede="Booking lives in the app and on WhatsApp, because a job needs your real location and a live map. Everything you have ever booked is in there too."
                                />

                                {/* The two places a booking actually happens,
                                    each wearing its own mark. A store badge
                                    and a WhatsApp badge say "install" and
                                    "message" without being read - and the
                                    Android one is honest about not being on
                                    the store yet rather than linking nowhere */}
                                <div data-reveal className="mt-8 flex flex-wrap gap-3">
                                    <StoreBadge
                                        mark={<PlayStoreMark className="w-6 h-6" />}
                                        small={APP_LINK ? "Get it on" : "Coming soon to"}
                                        name="Google Play"
                                        href={APP_LINK}
                                        disabled={!APP_LINK}
                                        note="The Android app is in the works"
                                    />

                                    <StoreBadge
                                        mark={<WhatsAppMark className="w-6 h-6 text-[#25D366]" />}
                                        small="Book right now on"
                                        name="WhatsApp"
                                        href={WHATSAPP_LINK}
                                    />
                                </div>
                            </div>

                            <Art
                                src={pics.APP_SHOT}
                                alt="The Cosmosgen app"
                                icon={Smartphone}
                                tint="dark"
                                fit="contain"
                                tr="w-620"
                                className="hidden lg:block w-[250px] aspect-[4/5] rounded-[34px]"
                            />
                        </div>
                    </Band>
                </div>
            </div>
        </CustomerShell>
    );
};

export default CustomerHome;
