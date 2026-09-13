import { Link } from "react-router-dom";
import { ArrowRight, Wrench } from "lucide-react";
import { WhatsAppMark } from "./Marks";
import { CustomerShell } from "./CustomerShell";
import { ProblemBrowser } from "./ProblemBrowser";
import { AreaBar } from "./AreaPicker";
import { Art } from "./Art";
import { PageHead, HeadStrip, Band, Head } from "./layout";
import { useRef, useState } from "react";
import { useHeroIntro, useReveal, useSmoothScroll } from "./motion";
import { WHATSAPP_LINK } from "./brand";
import { useServiceImage } from "./catalogue";

/**
 * Everything the company does, and what each service actually covers.
 *
 * The home page introduces the trades; this is where somebody checks whether
 * their particular problem is on the list - the question a row of service
 * names never answers - and whether we have anybody near enough to send.
 */
const TRADES = [
    "AC & appliances",
    "Electrical",
    "Plumbing",
    "Home cleaning",
];

const CustomerServices = () => {
    useSmoothScroll();
    const hero = useHeroIntro();
    const page = useReveal();

    /*
     * The page used to list the trades and then, immediately below, list them
     * again with their faults underneath. Two headings, the same four rows, and
     * a click on the first that only scrolled you to the second. One of them had
     * to go, and the one with the work in it stayed.
     */
    const [trade, setTrade] = useState("");
    const appliancePicture = useServiceImage("AC_APPLIANCE");
    const browser = useRef(null);

    return (
        <CustomerShell>
            <div ref={hero}>
                <PageHead
                    eyebrow="Services"
                    title="If it is part of the house, somebody here does it"
                    lede="You do not have to work out which trade you need. Say what is wrong. The office decides who to send, and tells you what it will cost before anybody sets off."
                    art={(
                        <Art
                            src={appliancePicture}
                            alt="A Cosmosgen engineer with a customer's appliances"
                            icon={Wrench}
                            tr="w-900"
                            fit="contain"
                            tint="sky"
                            eager
                            bare
                            className="w-full h-full min-h-[320px]"
                        />
                    )}
                    foot={<HeadStrip items={TRADES} />}
                >
                    {/* The area question, in the masthead rather than three
                        sections down: somebody who came straight to this page
                        came to find out exactly this */}
                    <AreaBar onDark />
                </PageHead>
            </div>

            <div ref={page}>
                <Band decor="blobs" className="scroll-mt-20" anchor={browser}>
                    <Head
                        title="Is your problem on the list?"
                        lede="Everything below is work we are called out for regularly. If yours is here, it is a job we do every week. If it is not, it is still worth asking."
                    />

                    <div data-reveal className="mt-10">
                        <ProblemBrowser value={trade} onChange={setTrade} />
                    </div>
                </Band>

                <Band tone="white" decor="weave">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                        <div className="flex-1">
                            <Head
                                title="Not on the list?"
                                lede="Message us anyway. Half of what we are asked does not fit neatly under a heading, and the office will tell you straight away whether it is something we can send somebody for."
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
                                className="group inline-flex items-center gap-2 h-12 px-6 rounded-full text-ink font-semibold text-[15px] hover:bg-canvas transition-colors"
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

export default CustomerServices;
