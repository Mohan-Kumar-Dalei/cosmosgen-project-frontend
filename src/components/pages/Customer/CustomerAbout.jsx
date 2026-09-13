import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, ReceiptText, KeyRound, Headphones } from "lucide-react";
import { WhatsAppMark } from "./Marks";
import { CustomerShell } from "./CustomerShell";
import { PageHead, HeadStrip, Band, Head } from "./layout";
import { Art } from "./Art";
import { useHeroIntro, useReveal, useSmoothScroll } from "./motion";
import { WHATSAPP_LINK } from "./brand";
import { usePictures } from "./pictures";

/**
 * Who is behind the person at the door.
 *
 * Everything on this page is a fact about how the platform is built, because
 * those are the only claims a young company can make honestly. There are no
 * invented job counts, no five-star averages and no founding story with a
 * number in it - the moment one of those goes on a page it has to be defended,
 * and a customer who catches one stops believing the rest.
 */
const STANDARDS = [
    {
        icon: BadgeCheck,
        strip: "Approved before they work",
        title: "Nobody works until the office has approved them",
        body: "An engineer registers, and then waits. Until somebody in the office has looked at who they are and what they can do, the account cannot sign in and cannot be given a job. There is no open marketplace behind this: every person who knocks is somebody we chose.",
    },
    {
        icon: ReceiptText,
        strip: "The company sets the price",
        title: "The price list belongs to the company, not the engineer",
        body: "Charges are picked off a list the office maintains. The person in your house cannot type in a figure of their own, cannot round one up, and cannot add a line after you have seen the total. If a bill has to be corrected, the correction is recorded, and an honest slip looks nothing like a bill rewritten four times.",
    },
    {
        icon: KeyRound,
        strip: "Two codes, both yours",
        title: "The job is gated by you, twice",
        body: "One code from you starts the work and another finishes it. Nobody can mark a job as started from the road, and nobody can declare it done while you are still looking at the problem. Until you give the second code, no bill exists at all.",
    },
    {
        icon: Headphones,
        strip: "The office answers for it",
        title: "The office answers for the work, not the individual",
        body: "If something is wrong, you are not left arguing with a stranger you found online. The ticket, the invoice, the payment and the engineer are all on one record in the office, and that is who you take it up with.",
    },
];

const CustomerAbout = () => {
    const pics = usePictures();
    useSmoothScroll();
    const hero = useHeroIntro();
    const page = useReveal();

    return (
        <CustomerShell>
            <div ref={hero}>
                <PageHead
                    eyebrow="About us"
                    title="A repair company that answers for the repair"
                    lede="Cosmosgen Engineers Pvt. Ltd. sends its own approved engineers to homes across Odisha. Not a directory, not a lead exchange. The office picks who comes, sets what it costs and carries the job to the end."
                    foot={<HeadStrip items={STANDARDS.map((x) => x.strip)} />}
                    art={(
                        <Art
                            src={pics.HERO_VISIT}
                            alt="A Cosmosgen engineer with a customer"
                            icon={BadgeCheck}
                            tr="w-900"
                            fit="contain"
                            tint="sky"
                            eager
                            bare
                            className="w-full h-full min-h-[320px]"
                        />
                    )}
                >
                    <div className="flex flex-wrap gap-3">
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
                            to="/services"
                            className="group inline-flex items-center gap-2 h-12 px-6 rounded-full border border-white/20 font-semibold text-[15px] hover:bg-white/10 transition-colors"
                        >
                            What we do
                            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                    </div>
                </PageHead>
            </div>

            <div ref={page}>
                <Band tone="white" decor="dots">
                    <Head
                        eyebrow="Why it is built this way"
                        title="Everybody has been let down by a repair once"
                        lede="Somebody who does not turn up. A price that changes at the door. A bill with a number on it nobody can explain. None of that is a people problem. It is what happens when there is no system between the customer and whoever happened to be free."
                    />

                    <div className="mt-10 grid lg:grid-cols-2 gap-x-14 gap-y-6 max-w-5xl">
                        <p data-reveal className="text-[15.5px] leading-relaxed text-ink-soft">
                            So the parts people usually have to take on trust are the parts that are
                            written into the software here. Who may be sent is decided by the office
                            before anybody is free. What may be charged comes off a list the engineer
                            cannot edit. When work starts and when it finishes is decided by a code
                            in your hand.
                        </p>
                        <p data-reveal className="text-[15.5px] leading-relaxed text-ink-soft">
                            None of that makes a job go faster. What it does is make the job the same
                            every time: the tenth engineer we approve works the way the first one
                            does, because the rules are in the system rather than in somebody's
                            habits. That is the whole idea, and everything below is simply what it
                            looks like in practice.
                        </p>
                    </div>
                </Band>

                <Band>
                    <Head eyebrow="Our standards" title="Four things we will not bend on" />

                    <div data-stagger className="mt-12 grid gap-x-14 gap-y-12 lg:grid-cols-2">
                        {STANDARDS.map((s) => (
                            <div key={s.title} className="group flex gap-5 max-w-xl">
                                <s.icon
                                    className="w-6 h-6 text-accent shrink-0 mt-1 transition-transform duration-500 group-hover:-translate-y-1"
                                    strokeWidth={1.7}
                                />
                                <div>
                                    <h3 className="font-display font-semibold text-[18px] leading-snug tracking-[-0.015em]">
                                        {s.title}
                                    </h3>
                                    <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-soft">{s.body}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Band>

                <Band tone="white" decor="blobs">
                    <div className="grid lg:grid-cols-[auto_1fr] gap-10 lg:gap-16 items-center">
                        <Art
                            data-reveal
                            src={pics.AT_THE_DOOR}
                            alt="A customer reading the start code at their door"
                            icon={KeyRound}
                            tr="w-620"
                            fit="contain"
                            tint="leaf"
                            className="hidden lg:block w-[300px] aspect-[4/5] rounded-[28px]"
                        />

                        <div>
                            <Head
                                eyebrow="Where we work"
                                title="Odisha, town by town, as fast as we can approve people"
                                lede="The catalogue is the same everywhere. The people who do the work are not, so the site asks where you are before it promises anything, and says plainly when we have not reached you yet."
                            />

                            <p data-reveal className="mt-6 max-w-xl text-[15px] leading-relaxed text-ink-soft">
                                A service showing as unavailable on your street is not a polite no.
                                It means nobody approved for that trade is near enough today. Message
                                the office anyway. It can often arrange somebody from the next town,
                                and it will tell you honestly if it cannot.
                            </p>

                            <Link
                                to="/services"
                                data-reveal
                                className="group mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-deep"
                            >
                                Check your area
                                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                            </Link>
                        </div>
                    </div>
                </Band>

                <Band tone="dark" decor="blobs">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                        <div className="flex-1">
                            <Head
                                tone="dark"
                                eyebrow="Work with us"
                                title="If you are the engineer, not the customer"
                                lede="We are approving electricians, plumbers, appliance engineers and cleaners across Odisha. The office finds the work, you do the job, and what you earn is yours the moment it is done."
                            />
                        </div>

                        <Link
                            to="/join"
                            data-reveal
                            className="group shrink-0 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-white text-panel font-semibold text-[15px] hover:bg-white/90 transition-colors"
                        >
                            What joining is like
                            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                    </div>
                </Band>
            </div>
        </CustomerShell>
    );
};

export default CustomerAbout;
