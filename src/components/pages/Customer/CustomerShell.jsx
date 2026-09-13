import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X, Smartphone, Volume2, VolumeX, Sun, Moon } from "lucide-react";
import { WhatsAppMark } from "./Marks";
import { useCustomer } from "./customerAuth";
import { AreaPill, AreaForm } from "./AreaPicker";
import { useInterfaceSounds, useSoundSetting, setSound } from "./sound";
import { SoundInvite } from "./SoundInvite";
import { useTheme, setTheme } from "./theme";
import { useLiftedFooter } from "./motion";
import { Blobs } from "./Blob";
import { WHATSAPP_LINK, ik } from "./brand";
import { loadPictures, usePictures } from "./pictures";
import { warmCustomerRoutes, warmRoute } from "../../../router/customerRoutes";

/**
 * The frame every customer page sits in.
 *
 * The staff panels have a sidebar because staff live in them all day. A
 * visitor does not live here: they arrive, read, and either message us or
 * install the app. So the chrome is one thin bar and one footer, and the two
 * things they might actually do - find out whether we cover their street, and
 * send that message - are never more than a glance away.
 */
const NAV = [
    { to: "/services", label: "Services" },
    { to: "/how-it-works", label: "How it works" },
    { to: "/pricing", label: "Pricing" },
    // "Ask us" implied a person on the other end, and there is not one - the
    // assistant is the whole of it, and naming it is fairer than letting
    // somebody find that out after they have typed their question
    { to: "/ai-assistant/chat", label: "Ask AI" },
    // Who the company is, in the bar rather than three clicks down: a visitor
    // deciding whether to let a stranger into their house asks this early
    { to: "/about", label: "About us" },
];

/*
 * Where the bar was when the last page went away.
 *
 * Kept out here on purpose. Every page renders its own CustomerShell, so
 * moving between them tears the header down and builds a new one - and a
 * freshly created element has no previous position to travel from, which is
 * exactly why the bar appeared at its destination instead of going there.
 * Held at module level it survives the swap, so the new bar is born where the
 * old one died and then moves.
 */
let lastMark = null;

const MORE = [
    { to: "/faq", label: "Questions" },
    { to: "/join", label: "Work with us" },
    { to: "/account", label: "My jobs" },
];

/**
 * There is no light-on-dark variant of this bar any more, and that is the
 * point. The site used to open every page on a navy slab with a paper body
 * underneath it, which read as two designs meeting in the middle - and no
 * amount of tuning the navy fixed that. Now a page is one ground the whole way
 * down, and whether that ground is light or dark is the reader's choice,
 * carried by the class on the wrapper below.
 */
export const CustomerShell = ({ children }) => {
    const { customer, ready } = useCustomer();
    const pics = usePictures();
    const { pathname } = useLocation();
    const { footer, page, lift } = useLiftedFooter();
    const [open, setOpen] = useState(false);
    const [lifted, setLifted] = useState(false);
    /*
     * Where the bar under the navigation is, and how wide.
     *
     * Measured rather than guessed: the labels are different lengths, the row
     * re-gaps at xl, and the font swapping in moves everything by a few
     * pixels. Null until the first measurement, so the bar is not drawn at all
     * before it knows where it belongs.
     */
    const rail = useRef(null);
    const [mark, setMark] = useState(lastMark);

    /* Which element carries the sheet's bottom edge: "band", "page" or none */
    const [ends, setEnds] = useState("");

    // One request for the whole site, on whichever page is opened first
    useEffect(() => { loadPictures(); }, []);

    /*
     * And the rest of the site is fetched while nobody is waiting for it.
     *
     * Each page is its own chunk, so pressing a link used to mean a request
     * going out before anything could happen - a tenth of a second on a desk
     * and a second or two on a phone, where the wait is the round trip rather
     * than the bytes. Warmed on idle after this page has loaded, every link
     * after the first is instant.
     */
    useEffect(() => { warmCustomerRoutes(pathname); }, [pathname]);

    useInterfaceSounds();
    const audible = useSoundSetting();
    const theme = useTheme();
    const dark = theme === "dark";

    /*
     * The bar earns its ground once the page has moved.
     *
     * Sitting flat on the hero it is part of the hero; over the content below
     * it has to separate from it, or headings slide underneath a transparent
     * strip and become unreadable for the length of the scroll.
     */
    useEffect(() => {
        const onScroll = () => setLifted(window.scrollY > 12);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    /*
     * The page itself takes the theme, not only the wrapper.
     *
     * Everything on this site is painted inside one scoped div, which is what
     * keeps the office's screens out of it - but the document behind that div
     * is still the browser's white. It shows in two places a reader definitely
     * notices: the rubber band at the end of a scroll, and any sliver the
     * layout leaves under the page. Set while these pages are mounted and put
     * back on the way out, so a staff screen is never left wearing it.
     */
    useEffect(() => {
        const ground = dark ? "#0d1116" : "#faf9f6";
        const previous = document.body.style.backgroundColor;

        document.body.style.backgroundColor = ground;
        document.documentElement.style.colorScheme = dark ? "dark" : "light";

        return () => {
            document.body.style.backgroundColor = previous;
            document.documentElement.style.colorScheme = "";
        };
    }, [dark]);

    /*
     * How the page ends.
     *
     * The shell cannot know how a page is built - one nests its sections two
     * divs deep, another does not - so it asks the DOM what the page finishes
     * on. Once per page, and nothing to do with scrolling.
     */
    useEffect(() => {
        const host = page.current;
        if (!host) return undefined;

        /*
         * Every page keeps its curve. What differs is which element draws it.
         *
         * It has to be the element that actually paints the bottom of the
         * page, and on most pages that is the sheet itself: it carries the
         * strip of footer colour the curve opens onto. Rounding anything
         * inside it left that strip square, so two hard corners of it went on
         * showing past the curve - and against the footer, which is not flat
         * under its blobs, they read as notches.
         *
         * The Ask AI page has no strip: its last band is deliberately see
         * through, its texture and wash sitting on the paper, and painting the
         * strip behind it put a dark bar across the bottom of the page. There
         * the paper is what a reader can see ending, so the paper - the sheet
         * this page is printed on - takes the corner instead.
         *
         * The answer comes from the DOM, so it is read just after this effect
         * rather than inside it, which keeps the change out of the render
         * React is in the middle of. A timer and not a frame callback: frames
         * do not run in a hidden tab, and a page opened in one would sit there
         * with a square corner until somebody looked at it.
         */
        const decide = () => {
            /*
             * No corner on a phone, because there is nothing behind it.
             *
             * The curve exists so the page can end over the footer rather than
             * against it, and the footer is only underneath from a tablet up.
             * On a phone it is simply the next thing on the page, so a rounded
             * sheet and a strip of footer colour behind it round onto nothing
             * and read as a lift that has gone wrong.
             *
             * A media query, not the lift measurement: this is a fact about
             * the screen, settled before anybody scrolls, and it stays settled.
             */
            if (!window.matchMedia("(min-width: 768px)").matches) {
                setEnds("");
                return;
            }

            const bands = host.querySelectorAll("section");
            const last = bands[bands.length - 1];

            const ground = last && getComputedStyle(last).backgroundColor;
            const opaque = Boolean(ground)
                && !/^rgba\(.*,\s*0\)$/.test(ground)
                && ground !== "transparent";

            setEnds(opaque ? "band" : "page");
        };

        const read = setTimeout(decide);

        // Turning a tablet on its side crosses that line, so the answer is
        // worked out again - on the screen changing, never on a scroll
        const wide = window.matchMedia("(min-width: 768px)");
        wide.addEventListener("change", decide);

        return () => {
            clearTimeout(read);
            wide.removeEventListener("change", decide);
        };
        // `page` is a ref from the hook above and never changes identity;
        // naming it here only to satisfy the rule would suggest otherwise
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    /*
     * Re-measured on every navigation, and whenever the row could have moved.
     *
     * `aria-current` is what react-router puts on the active link, so this
     * asks the DOM which link is current rather than working it out from the
     * path a second time - one source of truth, and it cannot disagree with
     * what the reader can see. Fonts land late and windows get dragged, so a
     * resize and the font loading both ask again.
     */
    useEffect(() => {
        const row = rail.current;
        if (!row) return undefined;

        const place = () => {
            const current = row.querySelector("[aria-current='page']");

            if (!current) {
                lastMark = null;
                return setMark(null);
            }

            /*
             * Measuring is itself what makes the move possible: reading these
             * boxes forces the browser to resolve the style the bar was just
             * created with, so the value it is leaving is a real one. Set
             * without that, the change would be the element's first style and
             * a first style does not animate.
             */
            const a = current.getBoundingClientRect();
            const b = row.getBoundingClientRect();

            const next = { left: Math.round(a.left - b.left), width: Math.round(a.width) };

            lastMark = next;
            return setMark(next);
        };

        const settle = setTimeout(place);
        window.addEventListener("resize", place);
        document.fonts?.ready?.then(place).catch(() => { /* no font API */ });

        return () => {
            clearTimeout(settle);
            window.removeEventListener("resize", place);
        };
    }, [pathname]);

    /*
     * Nothing in the bar wraps.
     *
     * Adding a fifth item pushed the row past the space it had, and flex did
     * what flex does - it broke "How it works" and "About us" over two lines
     * each, which turned the navigation into a paragraph. A nav item is a
     * label, not a sentence: it stays on one line and the bar gives ground
     * elsewhere instead.
     */
    const linkClass = ({ isActive }) =>
        "relative whitespace-nowrap text-[13.5px] font-medium transition-colors py-1 "
        + (isActive ? "text-ink" : "text-ink-soft hover:text-ink");

    return (
        // Every colour in this app is already a variable, so the dark palette
        // is one class on one wrapper - and it stops here, which is why the
        // office's own screens are unaffected by a button on the public site
        <div
            className={"cg-site min-h-screen bg-canvas text-ink font-sans " + (dark ? "cg-dark" : "")}
            /*
             * The room the footer sits in is padding here, not a margin on the
             * page above.
             *
             * A bottom margin on the last child collapses straight out of this
             * wrapper, so the wrapper's own ground stopped where the content
             * stopped and the browser's white page showed through underneath -
             * a pale line across the full width, right where the sheet is
             * supposed to lift. Padding cannot collapse, so the dark ground now
             * runs the whole way down and the footer is uncovered rather than
             * revealed through a gap.
             */
            /*
             * Short of the footer's height on purpose.
             *
             * The hook works out how much of the footer's top the sheet should
             * go on covering, and hands back the rest as this room. So the
             * sheet always ends inside the footer rather than on its edge:
             * there is no fractional gap for the ground behind to show
             * through, and the sheet's corners have the dark panel behind them
             * instead of the page's own paper.
             */
            style={lift ? { paddingBottom: lift } : undefined}
        >
            <header
                className={"cg-bar fixed inset-x-0 top-0 z-50 transition-colors duration-300 "
                    + (lifted
                        ? "cg-bar-glass border-b border-hairline"
                        : "bg-transparent border-b border-transparent")}
            >
                <div className="mx-auto max-w-6xl px-5 sm:px-8 h-16 flex items-center gap-6">
                    <Link to="/" className="flex items-center gap-2.5 shrink-0" onClick={() => setOpen(false)}>
                        <img src={ik(pics.LOGO, "w-96")} alt="" className="h-7 w-7 object-contain" />
                        <span className="flex flex-col leading-none">
                            <span className="font-display font-semibold text-[15px] tracking-tight text-ink">
                                Cosmosgen
                            </span>
                            <span className="text-[8.5px] uppercase tracking-[0.18em] mt-1 text-ink-faint">
                                Engineers Pvt. Ltd.
                            </span>
                        </span>
                    </Link>

                    {/*
                      * One bar that travels, rather than one per link.
                      *
                      * Each link used to own a rule that grew out of its own
                      * middle while the last one shrank away - which reads as
                      * two separate things happening, not as one thing moving.
                      * A single bar measured onto whichever link is current
                      * says what a change of page actually is: you were there,
                      * now you are here, and this is the distance between them.
                      */}
                    <nav ref={rail} className="relative hidden lg:flex items-center gap-5 xl:gap-6 ml-2 xl:ml-3 shrink-0">
                        {NAV.map((l) => (
                            <NavLink
                                key={l.to}
                                to={l.to}
                                className={linkClass}
                                // Belt as well as braces: a browser that never
                                // goes idle still fetches the page a hand is
                                // already moving towards
                                onPointerEnter={() => warmRoute(l.to)}
                                onTouchStart={() => warmRoute(l.to)}
                            >
                                {l.label}
                            </NavLink>
                        ))}

                        {/* Only drawn once there is something to sit under, so
                            it never starts life parked at the left edge and
                            slides in from nowhere on the first page */}
                        {mark && (
                            <span
                                aria-hidden
                                style={{ left: mark.left, width: mark.width }}
                                className="cg-navbar absolute -bottom-0.5 h-px bg-accent"
                            />
                        )}
                    </nav>

                    <div className="ml-auto flex items-center gap-1 sm:gap-2">
                        {/* The first question anybody has, answered where a
                            delivery app puts the address rather than three
                            sections down the page */}
                        <AreaPill />

                        <button
                            // The invitation below the bar points at this, so
                            // it has to be findable without knowing the markup
                            data-sound-toggle
                            onClick={() => setSound(!audible)}
                            aria-label={audible ? "Turn the interface sounds off" : "Turn the interface sounds on"}
                            title={audible ? "Sound on" : "Sound off"}
                            className="hidden sm:grid w-9 h-9 place-items-center rounded-full text-ink-faint hover:bg-sunken hover:text-ink transition-colors"
                        >
                            {audible ? <Volume2 className="w-[17px] h-[17px]" /> : <VolumeX className="w-[17px] h-[17px]" />}
                        </button>

                        <button
                            onClick={() => setTheme(dark ? "light" : "dark")}
                            aria-label={dark ? "Switch to the light theme" : "Switch to the dark theme"}
                            title={dark ? "Light" : "Dark"}
                            className="hidden sm:grid w-9 h-9 place-items-center rounded-full text-ink-faint hover:bg-sunken hover:text-ink transition-colors"
                        >
                            {dark ? <Sun className="w-[17px] h-[17px]" /> : <Moon className="w-[17px] h-[17px]" />}
                        </button>

                        <a
                            href={WHATSAPP_LINK}
                            target="_blank"
                            rel="noreferrer"
                            /* Between the nav appearing and the window being
                               wide, the label is the first thing that has to
                               go - a wrapped nav item reads as broken, a green
                               WhatsApp circle does not */
                            className="group hidden sm:inline-flex shrink-0 items-center gap-2 h-9 w-9 xl:w-auto xl:px-4 justify-center rounded-full bg-brand text-white text-[13px] font-semibold hover:bg-brand-deep transition-colors"
                            title="Book on WhatsApp"
                        >
                            <WhatsAppMark className="w-[17px] h-[17px] shrink-0 transition-transform duration-300 group-hover:scale-110" />
                            <span className="hidden xl:inline whitespace-nowrap">Book on WhatsApp</span>
                        </a>

                        <Link
                            to="/account"
                            className="hidden sm:inline-flex shrink-0 items-center h-9 px-3.5 rounded-full text-[13px] font-semibold text-ink whitespace-nowrap max-w-[120px] truncate hover:bg-sunken transition-colors"
                        >
                            {ready && customer ? (customer.name?.split(" ")[0] || "My jobs") : "Sign in"}
                        </Link>

                        <button
                            onClick={() => setOpen((v) => !v)}
                            className="lg:hidden w-9 h-9 grid place-items-center rounded-full text-ink hover:bg-sunken transition-colors"
                            aria-label={open ? "Close the menu" : "Open the menu"}
                        >
                            {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {open && (
                    <div className="lg:hidden border-t border-hairline bg-canvas px-5 py-4 max-h-[calc(100vh-4rem)] overflow-y-auto">
                        <div className="flex flex-col">
                            {[...NAV, ...MORE].map((l) => (
                                <NavLink
                                    key={l.to}
                                    to={l.to}
                                    onClick={() => setOpen(false)}
                                    className="py-2.5 text-[15px] font-medium text-ink"
                                >
                                    {l.label}
                                </NavLink>
                            ))}
                        </div>

                        <a
                            href={WHATSAPP_LINK}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 flex items-center justify-center gap-2 h-11 rounded-full bg-brand text-white text-sm font-semibold"
                        >
                            <WhatsAppMark className="w-[17px] h-[17px]" />
                            Book on WhatsApp
                        </a>

                        <button
                            onClick={() => setSound(!audible)}
                            className="mt-3 w-full flex items-center justify-center gap-2 h-11 rounded-full bg-sunken text-ink-soft text-sm font-semibold"
                        >
                            {audible ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                            {audible ? "Sound on" : "Sound off"}
                        </button>

                        <button
                            onClick={() => setTheme(dark ? "light" : "dark")}
                            className="mt-3 w-full flex items-center justify-center gap-2 h-11 rounded-full bg-sunken text-ink-soft text-sm font-semibold"
                        >
                            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                            {dark ? "Light theme" : "Dark theme"}
                        </button>

                        <div className="mt-5 pt-5 border-t border-hairline">
                            <AreaForm onDone={() => setOpen(false)} />
                        </div>
                    </div>
                )}
            </header>

            {/*
              * The sheet the whole site is printed on.
              *
              * It carries its own ground and its own bottom edge because the
              * footer is underneath it rather than after it - without a
              * background here, the panel below would show through every gap
              * between two bands.
              */}
            <main
                ref={page}
                className={"relative z-10 bg-canvas pt-16 "
                    + (ends ? "cg-sheet-end " : "")
                    + (ends === "band" ? "cg-page-ground" : "")}
                /*
                 * This is the sheet, so this is what ends in a curve.
                 *
                 * The corner went on one inner wrapper and then another before
                 * that was obvious, and both times the same thing happened:
                 * whatever was rounded had this element behind it, and this
                 * element is opaque paper running square to the bottom. Two
                 * pale wedges of it showed at the corners, outside the curve.
                 *
                 * So the edge, the clip and the strip of footer colour all sit
                 * here. Nothing light is left behind the arc - the strip is
                 * dark and the footer behind that is the same colour - and the
                 * bands inside are trimmed to the same curve. The one page
                 * that skips the strip is the Ask AI page, which ends on open
                 * paper; the effect above works that out per page.
                 */
            >
                {/*
                  * A new page arrives rather than being swapped in.
                  *
                  * Keyed on the path, so React replaces the subtree and the
                  * animation runs again on every navigation. It is a CSS
                  * animation and not a tween on purpose: this fires on every
                  * click, and a keyframe on two compositor properties costs
                  * nothing and finishes on its own even in a tab nobody is
                  * looking at - which a script-driven fade does not.
                  */}
                {/*
                  * And, while the page is lifted, the sheet's last inch is the
                  * footer's colour.
                  *
                  * That is the strip the curve above cuts across. Left as the
                  * page's paper it showed through the corner as a pale edge
                  * tracing the whole arc - the white border. Only the last
                  * forty pixels change, so everything above them, the hero
                  * included, keeps the page's own colour.
                  */}
                <div
                    key={pathname}
                    className="cg-page-in"
                >
                    {children}
                </div>
            </main>

            <Footer inner={footer} lifted={Boolean(lift)} mark={ik(pics.LOGO, "w-96")} />

            {/* Asked once, a few seconds in, and never again once answered */}
            <SoundInvite />
        </div>
    );
};

const Footer = ({ inner, lifted, mark }) => (
    <footer
        ref={inner}
        style={{ background: "var(--color-footer)" }}
        className={"text-white overflow-hidden "
            + (lifted ? "fixed inset-x-0 bottom-0 z-0" : "relative")}
    >
        {/*
          * The footer's own colour is what the sheet's corner opens onto.
          *
          * The page above ends in a 34px curve, and through that curve you see
          * the footer - which is fine when the footer is a flat panel there
          * and wrong when it is not. It was not: a green orb sits at the
          * footer's top left, and the only part of it anybody ever saw was the
          * wedge showing through that corner, which read as a green stain on
          * the curve rather than as anything the footer was doing.
          *
          * So the decoration starts below the curve. Not below the radius -
          * below where the sheet actually ends, which is a little deeper: the
          * sheet overlaps the footer's top by about forty pixels so that no
          * sliver of ground can show between them, and the notch the corner
          * cuts is widest at its very bottom edge. Forty-eight clears all of
          * it. Nothing else changes - the orbs are 460px across and their
          * top inch was never the point of them.
          */}
        <Blobs field="dark" top={48} bottom={0} />

        <div data-footer-inner className="relative mx-auto max-w-6xl px-5 sm:px-8 py-16">
            <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
                <div>
                    <div className="flex items-center gap-2.5">
                        <img src={mark} alt="" className="h-8 w-8 object-contain" />
                        <span className="font-display font-semibold text-lg tracking-tight">Cosmosgen</span>
                    </div>
                    <p className="mt-4 text-sm text-white/55 max-w-xs leading-relaxed">
                        Electricians, plumbers, appliance engineers and cleaners across Odisha,
                        sent to your door at a price set before anybody starts.
                    </p>
                </div>

                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/35">The work</p>
                    <div className="mt-4 flex flex-col gap-2.5 text-sm text-white/60">
                        <Link to="/services" className="hover:text-white transition-colors">Services</Link>
                        <Link to="/how-it-works" className="hover:text-white transition-colors">How it works</Link>
                        <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
                        <Link to="/ai-assistant/chat" className="hover:text-white transition-colors">Ask AI</Link>
                    </div>
                </div>

                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/35">Company</p>
                    <div className="mt-4 flex flex-col gap-2.5 text-sm text-white/60">
                        <Link to="/about" className="hover:text-white transition-colors">About us</Link>
                        <Link to="/faq" className="hover:text-white transition-colors">Questions</Link>
                        <Link to="/account" className="hover:text-white transition-colors">My jobs</Link>
                        {/* "Message us" used to sit here and it was a promise
                            nobody can keep: there is no inbox with a person in
                            it. Booking is WhatsApp, questions are the
                            assistant, and both are already named above */}
                    </div>
                </div>

                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/35">Work with us</p>
                    <div className="mt-4 flex flex-col gap-2.5 text-sm text-white/60">
                        <Link to="/join" className="hover:text-white transition-colors">Join as an engineer</Link>
                        <Link to="/technician/admin/register" className="hover:text-white transition-colors">Register</Link>
                        <Link to="/technician/admin/login" className="hover:text-white transition-colors">Engineer sign in</Link>
                    </div>
                </div>
            </div>

            <div className="mt-14 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-white/40">
                    © {new Date().getFullYear()} Cosmosgen Engineers Pvt. Ltd. · Odisha, India
                </p>
                <p className="text-xs text-white/40 flex items-center gap-1.5">
                    <Smartphone className="w-3 h-3" />
                    Booking happens on WhatsApp and in the app
                </p>
            </div>

            {/*
              * The name, once, at the size a name deserves.
              *
              * The last thing on the page is the company saying what it is
              * called. Set across the foot of the footer and kept quiet in
              * tone, it closes the page the way a masthead opens it - and it
              * is the one place on the site where the wordmark can be large
              * without taking room from anything that has work to do.
              */}
            <p
                aria-hidden
                /* Kept in check: the footer is only lifted while it fits
                   inside the window, and a wordmark set at eleven rem was
                   spending that allowance on one word */
                className="mt-8 font-display font-extrabold leading-[0.78] tracking-wide text-white/[0.07] select-none
                    text-[clamp(2.8rem,11vw,7.5rem)] text-center"
            >
                COSMOSGEN
            </p>
        </div>
    </footer>
);
