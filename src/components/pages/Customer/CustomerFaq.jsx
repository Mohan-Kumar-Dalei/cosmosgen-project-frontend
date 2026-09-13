import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Bot } from "lucide-react";
import { WhatsAppMark } from "./Marks";
import { CustomerShell } from "./CustomerShell";
import { PageHead, HeadStrip, Band, Head } from "./layout";
import { useHeroIntro, useReveal, useSmoothScroll } from "./motion";
import { WHATSAPP_LINK } from "./brand";

/**
 * The questions people actually ask, answered without hedging.
 *
 * An accordion rather than eleven answers on the page at once: somebody
 * arrives with one question, and making them read past ten others to reach it
 * is how a help page becomes a page nobody reads. The headings alone are the
 * index.
 *
 * The answers say no where the answer is no. "You cannot book on this website"
 * is more use than three sentences that avoid saying it, and a customer who
 * finds out later feels misled by the avoidance rather than by the fact.
 */
const GROUPS = [
    {
        title: "Booking a job",
        items: [
            {
                q: "Can I book an engineer on this website?",
                a: "No, and that is deliberate. A job needs the exact spot you are standing in and a code delivered to your phone at the door. A web form can give neither honestly. Booking happens on WhatsApp or in the app, both of which have your live location and your number.",
            },
            {
                q: "Do I have to know which trade I need?",
                a: "No. Say what is wrong in your own words: the tap is dripping, the fridge has stopped cooling, there is a smell from the switchboard. The office decides which trade that is and who to send.",
            },
            {
                q: "How soon can somebody come?",
                a: "It depends on who is approved near you and free that day. The office tells you when you book rather than promising a window on a website, because a promise made here is one the engineer has to keep in your house.",
            },
            {
                q: "What if you do not cover my area?",
                a: "The site says so plainly instead of pretending otherwise. Message the office anyway: it can often send somebody from the nearest town, and it will tell you straight if it cannot.",
            },
        ],
    },
    {
        title: "At the door",
        items: [
            {
                q: "What are the two codes for?",
                a: "Six digits reach you on WhatsApp. The first starts the job, so nobody can mark themselves as working from the road. The second closes it, and until you give it there is no bill at all. Both are yours; never give either one before you are satisfied.",
            },
            {
                q: "Will I know who is coming?",
                a: "Yes. You get the engineer's name, photograph and number before they set off, and a live link showing where they have reached. Anybody at your door should match what is on your phone.",
            },
            {
                q: "Can the engineer decide the job is finished?",
                a: "No. Only your second code closes a job. If you are not satisfied, do not give it. Tell the office instead.",
            },
        ],
    },
    {
        title: "Money",
        items: [
            {
                q: "Why is there no price list on the site?",
                a: "Because two jobs with the same complaint are rarely the same work. The engineer prices your actual problem from the office's own list, in front of you, and you see the total before agreeing. A figure printed here would be wrong for somebody, and they would find out at the door.",
            },
            {
                q: "How do I pay?",
                a: "Cash to the engineer, or online through a link that comes from the company by UPI or card, sometimes part of each. You are told which before anybody starts. Never pay into a number somebody reads out to you.",
            },
            {
                q: "Is there a charge if I decide not to go ahead?",
                a: "A small visit charge covers the trip, and you are told what it is before the engineer sets off, never after they have arrived.",
            },
            {
                q: "Where do my invoices live?",
                a: "Every invoice reaches your WhatsApp and stays in your account here, under My jobs. The assistant can also read any of them back to you once you are signed in.",
            },
        ],
    },
];

const Question = ({ item, open, onToggle }) => (
    <div data-reveal className="border-b border-hairline last:border-0">
        <button
            onClick={onToggle}
            aria-expanded={open}
            className="group w-full flex items-start gap-5 text-left py-5"
        >
            <span className="flex-1 font-display font-semibold text-[17px] sm:text-[18px] leading-snug tracking-[-0.015em] transition-colors group-hover:text-accent">
                {item.q}
            </span>

            {/* One icon doing both jobs: a plus that becomes a minus, which is
                a smaller and more legible movement than swapping two glyphs */}
            <span className="shrink-0 mt-0.5 w-7 h-7 grid place-items-center rounded-full bg-sunken text-ink-soft transition-colors duration-300 group-hover:bg-accent group-hover:text-white">
                <Plus
                    className={"w-4 h-4 transition-transform duration-300 " + (open ? "rotate-45" : "")}
                />
            </span>
        </button>

        {/* Nought to one fraction of a row: a height animation that needs no
            measuring and cannot be caught out by a long answer */}
        <div
            className="grid transition-[grid-template-rows] duration-400 ease-out"
            style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        >
            <div className="overflow-hidden">
                <p className="pb-6 pr-12 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
                    {item.a}
                </p>
            </div>
        </div>
    </div>
);

const CustomerFaq = () => {
    useSmoothScroll();
    const hero = useHeroIntro();
    const page = useReveal();

    // One open at a time, by its address in the list. An accordion where
    // everything can be open at once is just the long page with extra clicks.
    const [open, setOpen] = useState("0-0");

    return (
        <CustomerShell>
            <div ref={hero}>
                <PageHead
                    eyebrow="Questions"
                    title="The things people ask before they let somebody in"
                    lede="Short answers, including the ones that are no. If yours is not here, ask the assistant, here on the site, or in the same WhatsApp thread you book on."
                    foot={<HeadStrip items={GROUPS.map((g) => g.title)} />}
                >
                    <div className="flex flex-wrap gap-3">
                        <Link
                            to="/chat"
                            className="group inline-flex items-center gap-2 h-12 px-6 rounded-full bg-accent text-white font-semibold text-[15px] hover:bg-accent-deep transition-colors"
                        >
                            <Bot className="w-4 h-4" />
                            Ask the assistant
                        </Link>
                        <a
                            href={WHATSAPP_LINK}
                            target="_blank"
                            rel="noreferrer"
                            className="group inline-flex items-center gap-2 h-12 px-6 rounded-full border border-white/20 font-semibold text-[15px] hover:bg-white/10 transition-colors"
                        >
                            <WhatsAppMark className="w-[17px] h-[17px] transition-transform duration-300 group-hover:scale-110" />
                            Book on WhatsApp
                        </a>
                    </div>
                </PageHead>
            </div>

            <div ref={page}>
                {GROUPS.map((group, g) => (
                    <Band key={group.title} tone={g % 2 === 0 ? "white" : "paper"} decor={g % 2 === 0 ? "dots" : "blobs"}>
                        <div className="grid lg:grid-cols-[260px_1fr] gap-8 lg:gap-16 items-start">
                            <Head title={group.title} className="lg:sticky lg:top-24" />

                            <div>
                                {group.items.map((item, i) => (
                                    <Question
                                        key={item.q}
                                        item={item}
                                        open={open === g + "-" + i}
                                        onToggle={() => setOpen(open === g + "-" + i ? "" : g + "-" + i)}
                                    />
                                ))}
                            </div>
                        </div>
                    </Band>
                ))}

                <Band tone="dark" decor="weave">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                        <div className="flex-1">
                            <Head
                                tone="dark"
                                title="Still not sure?"
                                lede="Describe the problem in Odia, Hindi or English and the assistant will tell you whether it is something we handle."
                            />
                        </div>

                        <a
                            href={WHATSAPP_LINK}
                            target="_blank"
                            rel="noreferrer"
                            data-reveal
                            className="group shrink-0 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-brand text-white font-semibold text-[15px] hover:bg-brand-deep transition-colors"
                        >
                            <WhatsAppMark className="w-[17px] h-[17px] transition-transform duration-300 group-hover:scale-110" />
                            Book on WhatsApp
                        </a>
                    </div>
                </Band>
            </div>
        </CustomerShell>
    );
};

export default CustomerFaq;
