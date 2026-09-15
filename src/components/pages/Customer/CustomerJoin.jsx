import { Link } from "react-router-dom";
import { ArrowRight, Wallet, MapPinned, CalendarClock, Smartphone, ShieldCheck } from "lucide-react";
import { WhatsAppMark, PlayStoreMark, StoreBadge } from "./Marks";
import { CustomerShell } from "./CustomerShell";
import { PageHead, HeadStrip, Band, Head } from "./layout";
import { Art } from "./Art";
import { useHeroIntro, useReveal, useSmoothScroll } from "./motion";
import { WHATSAPP_LINK, VENDOR_APP_LINK } from "./brand";
import { useServiceImage } from "./catalogue";
import { usePictures } from "./pictures";

/**
 * For the person who does the work, not the person who books it.
 *
 * Every line about money here is written from the engineer's side of the
 * ledger - what reaches them, what they hand over, whether they are square
 * with the office. The company's own share is never named as a cut and never
 * shown as a percentage, because a page that opens with "we take X%" reads as
 * the company taking something out of his pocket, whatever the figure is.
 * What he wants to know is what he ends the day with.
 */
const OFFER = [
    {
        icon: MapPinned,
        title: "Work near you, sent to you",
        body: "The office finds the customer, checks them and picks who to send. You are offered jobs close to where you already are: no chasing leads, no bidding, no paying for a customer who never answers.",
    },
    {
        icon: Wallet,
        title: "Your share is yours the day the job closes",
        body: "On a cash job you keep the money in your hand and hand the office's part over later. On an online job the customer pays the company and your share is credited straight away, then paid out to your bank account.",
    },
    {
        icon: CalendarClock,
        title: "You decide when you are available",
        body: "Switch yourself on when you can take work and off when you cannot. A job you genuinely cannot reach can be handed back to the office, and nobody is marked down for being honest about it.",
    },
    {
        icon: Smartphone,
        title: "An app that does the paperwork",
        body: "The route to the door, the codes, the price list, the invoice and your passbook are all in one place. You never write a bill by hand and never work out what you are owed on paper.",
    },
];

const STEPS = [
    {
        n: "01",
        title: "Register on your phone",
        body: "Your name, your number, where you work and what you can do. The number is checked with a code on WhatsApp, so nobody can register with somebody else's.",
    },
    {
        n: "02",
        title: "The office looks at you",
        body: "Somebody reads the application properly. Until it is approved the account cannot sign in and cannot be given work, which is exactly the check that makes a customer open the door to you.",
    },
    {
        n: "03",
        title: "Add where you want paying",
        body: "Bank account and IFSC, once. Payouts for online jobs go there. Only the last four digits are ever shown back, even to you.",
    },
    {
        n: "04",
        title: "Switch on and take the first job",
        body: "You get the customer, the address, the route and the codes. Read the first code at the door, do the work, build the bill from the list, close it with the second code.",
    },
];

const CustomerJoin = () => {
    const pics = usePictures();
    const appliancePicture = useServiceImage("AC_APPLIANCE");
    useSmoothScroll();
    const hero = useHeroIntro();
    const page = useReveal();

    return (
        <CustomerShell>
            <div ref={hero}>
                <PageHead
                    eyebrow="Work with us"
                    title="You do the work. The office finds it, prices it and stands behind it."
                    lede="Cosmosgen is approving electricians, plumbers, appliance engineers and cleaners across Odisha. You bring the skill and the tools; everything between the customer's first message and the money reaching you is ours to run."
                    foot={<HeadStrip items={["Work sent to you", "Your share, same day", "You choose your hours", "No joining fee"]} />}
                    art={(
                        <Art
                            src={pics.ON_THE_WAY}
                            alt="A Cosmosgen engineer on the way to a job"
                            icon={MapPinned}
                            tr="w-900"
                            fit="contain"
                            tint="sand"
                            eager
                            bare
                            className="w-full h-full min-h-[320px]"
                        />
                    )}
                >
                    <div className="flex flex-wrap gap-3">
                        <Link
                            to="/vendor/admin/register"
                            className="group inline-flex items-center gap-2 h-12 px-6 rounded-full bg-accent text-white font-semibold text-[15px] hover:bg-accent-deep transition-colors"
                        >
                            Register as an engineer
                            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                        <a
                            href={WHATSAPP_LINK}
                            target="_blank"
                            rel="noreferrer"
                            className="group inline-flex items-center gap-2 h-12 px-6 rounded-full border border-white/20 font-semibold text-[15px] hover:bg-white/10 transition-colors"
                        >
                            <WhatsAppMark className="w-[17px] h-[17px] transition-transform duration-300 group-hover:scale-110" />
                            Ask about joining
                        </a>

                        {/* The engineer's own app, which is where the work
                            actually arrives once somebody has joined. Honest
                            about not being on the store yet rather than
                            linking nowhere - and it is a different listing
                            from the customer's app, so it has its own link */}
                        <StoreBadge
                            mark={<PlayStoreMark className="w-6 h-6" />}
                            small={VENDOR_APP_LINK ? "Get the engineer app on" : "Coming soon to"}
                            name="Google Play"
                            href={VENDOR_APP_LINK}
                            disabled={!VENDOR_APP_LINK}
                            note="The engineer's Android app is in testing"
                        />
                    </div>
                </PageHead>
            </div>

            <div ref={page}>
                <Band tone="white" decor="dots">
                    <Head
                        eyebrow="What you get"
                        title="The part of the job nobody enjoys, handled"
                        lede="Finding customers, agreeing a price, writing a bill, chasing the money afterwards. All of it sits with the office."
                    />

                    <div data-stagger className="mt-12 grid gap-x-14 gap-y-12 lg:grid-cols-2">
                        {OFFER.map((o) => (
                            <div key={o.title} className="group flex gap-5 max-w-xl">
                                <o.icon
                                    className="w-6 h-6 text-accent shrink-0 mt-1 transition-transform duration-500 group-hover:-translate-y-1"
                                    strokeWidth={1.7}
                                />
                                <div>
                                    <h3 className="font-display font-semibold text-[18px] leading-snug tracking-[-0.015em]">
                                        {o.title}
                                    </h3>
                                    <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-soft">{o.body}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Band>

                <Band decor="blobs">
                    <Head eyebrow="Joining" title="Four steps, and none of them cost you anything" />

                    <div data-stagger className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
                        {STEPS.map((s) => (
                            <div key={s.n} className="group max-w-md">
                                <span className="font-display font-bold text-[34px] leading-none tracking-[-0.04em] text-accent/25 tabular-nums transition-colors duration-300 group-hover:text-accent/50">
                                    {s.n}
                                </span>
                                <h3 className="mt-4 font-display font-semibold text-[18px] leading-snug tracking-[-0.015em]">
                                    {s.title}
                                </h3>
                                <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-soft">{s.body}</p>
                            </div>
                        ))}
                    </div>
                </Band>

                <Band tone="white" decor="dots">
                    <div className="grid lg:grid-cols-[auto_1fr] gap-10 lg:gap-16 items-center">
                        <Art
                            data-reveal
                            src={appliancePicture}
                            alt=""
                            icon={ShieldCheck}
                            tr="w-620"
                            fit="contain"
                            tint="leaf"
                            className="hidden lg:block w-[320px] aspect-[4/3.2] rounded-[28px]"
                        />

                        <div>
                            <Head
                                eyebrow="Your money, plainly"
                                title="You always know what came in, what went out, and whether you are clear"
                                lede="The passbook in the app is written in those terms and no others. No jargon, no ledger language, no working out."
                            />

                            <ul data-stagger className="mt-7 flex flex-col gap-3.5 max-w-xl">
                                {[
                                    "A cash job shows your share with a plus, the moment it closes.",
                                    "An online job shows what was credited to you and when it was sent to your bank.",
                                    "Anything you owe the office is shown as one figure, and it is cleared by UPI from the app.",
                                    "Every entry names the job it came from, so nothing is ever a number you cannot place.",
                                ].map((line) => (
                                    <li key={line} className="group flex gap-3.5 text-[15px] leading-relaxed text-ink-soft">
                                        <span
                                            aria-hidden
                                            className="mt-[9px] w-1.5 h-1.5 rounded-full bg-brand shrink-0 transition-transform duration-300 group-hover:scale-150"
                                        />
                                        {line}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </Band>

                <Band tone="dark" decor="blobs">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                        <div className="flex-1">
                            <Head
                                tone="dark"
                                title="Register today, and the office will come back to you"
                                lede="Approval is a person reading your application, not a form disappearing into nothing."
                            />
                        </div>

                        <div data-reveal className="flex flex-wrap gap-3 shrink-0">
                            <Link
                                to="/vendor/admin/register"
                                className="group inline-flex items-center gap-2 h-12 px-6 rounded-full bg-white text-panel font-semibold text-[15px] hover:bg-white/90 transition-colors"
                            >
                                Register
                                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                            </Link>
                            <Link
                                to="/vendor/admin/login"
                                className="inline-flex items-center h-12 px-6 rounded-full border border-white/20 font-semibold text-[15px] hover:bg-white/10 transition-colors"
                            >
                                Already registered
                            </Link>
                        </div>
                    </div>
                </Band>
            </div>
        </CustomerShell>
    );
};

export default CustomerJoin;
