import { Link } from "react-router-dom";
import { ArrowRight, KeyRound } from "lucide-react";
import { WhatsAppMark } from "./Marks";
import { CustomerShell } from "./CustomerShell";
import { FlowStack } from "./FlowStack";
import { Art } from "./Art";
import { PageHead, Band, Head } from "./layout";
import { JobDemo } from "./JobDemo";
import { useHeroIntro, useReveal, useSmoothScroll } from "./motion";
import { WHATSAPP_LINK } from "./brand";
import { usePictures } from "./pictures";

/**
 * The whole job explained, for somebody deciding whether to trust us with the
 * run of their house.
 *
 * Money used to be set out here too. It has its own page now - there was
 * enough to say about it that it was crowding the thing this page is for, and
 * somebody worried about the bill should be able to send a link about the bill
 * rather than a link to a page with the bill halfway down it.
 */
const CustomerHowItWorks = () => {
    const pics = usePictures();
    useSmoothScroll();
    const hero = useHeroIntro();
    const page = useReveal();

    return (
        <CustomerShell>
            <div ref={hero}>
                <PageHead
                    eyebrow="How it works"
                    title="No surprises at the door, and none on the bill"
                    lede="Every job runs the same way, whether you booked it on WhatsApp or in the app. Here is the whole of it, start to finish."
                    // The five stages are a sequence and they happen to the
                    // same job, so they play in one small panel rather than
                    // being laid out as five things side by side
                    band={<JobDemo />}
                    art={(
                        <Art
                            src={pics.AT_THE_DOOR}
                            alt="A customer reading the start code at their door"
                            icon={KeyRound}
                            tr="w-900"
                            fit="contain"
                            tint="leaf"
                            eager
                            bare
                            className="w-full h-full min-h-[320px]"
                        />
                    )}
                />
            </div>

            <div ref={page}>
                <Band decor="blobs">
                    <FlowStack />
                </Band>

                {/* ---------------- THE DOOR CODES ---------------- */}
                <Band tone="white" decor="dots">
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
                                eyebrow="Why the codes"
                                title="You decide when the work starts, and when it is finished"
                                lede="Two six-digit codes reach you on WhatsApp. The first one starts the job, so nobody can mark themselves as working from the car park. The second one closes it, and until you give it there is no bill at all."
                            />

                            <p data-reveal className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-soft">
                                It means the person at your door cannot decide on their own that the
                                work is done. You do. If you are not satisfied, hold the second code
                                and tell the office instead. The job stays open until it is right.
                            </p>
                        </div>
                    </div>
                </Band>

                {/* ---------------- MONEY, ELSEWHERE ---------------- */}
                <Band decor="blobs">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                        <div className="flex-1">
                            <Head
                                eyebrow="Paying"
                                title="Four ways money moves, and you are told which before anybody starts"
                                lede="Online, cash, part of each, or a visit charge if you decide not to go ahead. All four are set out in full, along with why there is no rate card on this site."
                            />
                        </div>

                        <Link
                            to="/pricing"
                            data-reveal
                            className="group shrink-0 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-ink text-canvas font-semibold text-[15px] hover:opacity-90 transition-opacity"
                        >
                            How pricing works
                            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                    </div>
                </Band>

                {/* ---------------- BOOK ---------------- */}
                <Band tone="dark" decor="weave">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                        <div className="flex-1">
                            <Head
                                tone="dark"
                                title="Tell us what is wrong"
                                lede="In Odia, Hindi or English. You do not have to know which trade it is. Describing the problem is enough."
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

export default CustomerHowItWorks;
