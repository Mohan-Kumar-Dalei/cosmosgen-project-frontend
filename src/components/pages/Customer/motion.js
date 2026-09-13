import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Motion for the customer pages, and only for them.
 *
 * The staff panels are tools - people open them to do a job and leave, and
 * smoothed scrolling in a ticket list is an obstacle. These pages are the
 * company's face to somebody who has never dealt with us, so they get the
 * treatment: Lenis for the scroll and GSAP for what moves as it arrives.
 *
 * Both are set up here rather than in each page, because Lenis is a single
 * loop over the whole window - two of them fight for the same scroll and the
 * page judders.
 */

/** Somebody who has asked their system to stop animating gets a plain page. */
const stillPlease = () =>
    typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Smooth scrolling for as long as the page that asked for it is mounted.
 *
 * ScrollTrigger has to be told where the scroll position now comes from, or
 * every reveal below fires against the browser's own scrollTop and lands at
 * the wrong moment - which reads as the page animating at random.
 */
/*
 * The live smooth-scroll instance, so a page can ask it to move.
 *
 * Lenis owns the scroll position while it is running, and a plain
 * scrollIntoView fights it - the browser sets a position, Lenis carries on
 * from where it thought it was, and nothing appears to happen. Anything that
 * wants to jump has to go through the same instance.
 */
let engine = null;

/** Scroll to an element, through Lenis when it is running. */
export const scrollToEl = (el, offset = -72) => {
    if (!el) return;
    if (engine) engine.scrollTo(el, { offset, duration: 0.9 });
    else el.scrollIntoView({ behavior: stillPlease() ? "auto" : "smooth", block: "start" });
};

/**
 * A finger is not a wheel, and this engine is only for wheels.
 *
 * Lenis was already told not to take over touch scrolling - `syncTouch` is
 * false below - but it was still being built on a phone, and a built engine
 * runs a requestAnimationFrame loop for the life of the page and pushes an
 * update into ScrollTrigger on every scroll the browser reports. On a low-end
 * Android that is a frame of work per frame, every frame, in exchange for
 * nothing at all: the smoothing it provides is on an input the device does not
 * have. So on a coarse pointer the page simply scrolls the way the phone
 * scrolls, which was always the better of the two.
 */
const wheelDevice = () =>
    typeof window === "undefined"
    || !window.matchMedia
    || !window.matchMedia("(pointer: coarse)").matches;

export const useSmoothScroll = () => {
    useEffect(() => {
        if (stillPlease() || !wheelDevice()) return undefined;

        /*
         * Fetched only by the machines that will use it.
         *
         * Skipping the engine on a phone saved the frames it would have cost,
         * and none of the kilobytes: the library still sat in the same chunk
         * as everything else here, downloaded and parsed on a device that had
         * already decided not to touch it. Asked for separately, a phone never
         * sees it at all.
         */
        let lenis = null;
        let tick = null;
        let alive = true;

        import("lenis").then(({ default: Lenis }) => {
            if (!alive) return;

            lenis = new Lenis({
                duration: 1.05,
                // Long and shallow. A steep curve overshoots and then settles,
                // which on a marketing page reads as the page being slow
                // rather than as it being smooth.
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                smoothWheel: true,
                // Touch devices already scroll beautifully; taking that over
                // makes a phone feel laggy and drains the battery for nothing
                syncTouch: false,
            });

            /*
             * Driven by GSAP's clock, not by a second one of its own.
             *
             * This used to run its own requestAnimationFrame loop beside the
             * one GSAP already runs, and that is the whole of why the reveals
             * stuttered. Two loops means the scroll position was advanced in
             * one frame and the animations that depend on it in another, so
             * every reveal was reading a position from a frame ago and
             * arriving a beat late - which reads exactly like a slow page even
             * though nothing is slow. One ticker puts them in the same frame,
             * in order: Lenis moves, then ScrollTrigger reads, then the tweens
             * draw.
             *
             * GSAP's ticker counts in seconds and Lenis in milliseconds, hence
             * the thousand.
             */
            tick = (time) => lenis.raf(time * 1000);

            gsap.ticker.add(tick);

            /*
             * And no catching up after a stall.
             *
             * GSAP normally smooths over a long frame by pretending less time
             * passed than really did, which is kind to a standalone animation
             * and wrong for anything tied to a scroll position: the page has
             * moved, and an animation that insists it has not is the jump
             * everybody sees after a janky frame.
             */
            gsap.ticker.lagSmoothing(0);

            engine = lenis;
            lenis.on("scroll", ScrollTrigger.update);
            ScrollTrigger.refresh();
        });

        /*
         * Nothing listens to the window's scroll here any more.
         *
         * There used to be a second `ScrollTrigger.update` bound to it, on the
         * grounds that Lenis only reports the scrolls it drives. ScrollTrigger
         * has always had its own listener on the window for exactly that, so
         * the only thing the extra one added was a second update per scroll
         * event - work paid for on every frame of every scroll, for nothing.
         */

        return () => {
            alive = false;

            if (tick) {
                gsap.ticker.remove(tick);
                // Put GSAP's own behaviour back for whatever comes next
                gsap.ticker.lagSmoothing(500, 33);
            }

            if (engine === lenis) engine = null;
            if (lenis) lenis.destroy();

            /*
             * Only what this hook made.
             *
             * It used to kill every ScrollTrigger on the page, which meant it
             * tore down the reveals that the hook beside it had just created -
             * and in development, where effects run twice, that left whole
             * sections parked at zero opacity with nothing left to play them.
             */
        };
    }, []);
};

/**
 * Everything inside the returned ref that carries `data-reveal` rises into
 * place as it is scrolled to.
 *
 * `gsap.from` rather than a class that starts invisible: the start state is
 * written by the script at runtime, so if the script never runs - a blocked
 * bundle, an old browser, a reader with motion turned off - the page is simply
 * there, fully readable. A stylesheet that parks content at zero opacity and
 * waits for an observer has no such fallback, and that is how a landing page
 * ends up blank for the people least able to fix it.
 */
export const useReveal = () => {
    const scope = useRef(null);

    useEffect(() => {
        if (stillPlease() || !scope.current) return undefined;

        /**
         * Anything already on screen is left alone.
         *
         * A scroll trigger can only fire on a scroll, so an element that is
         * visible the moment the page loads is relying on a refresh happening
         * at exactly the right time - and when that does not happen, it stays
         * invisible for ever. Which is how the whole top of a page ends up
         * blank for the reader least able to work out why. Nothing above the
         * fold is worth that risk, and animating what somebody is already
         * looking at only reads as a flicker anyway.
         */
        const onScreen = (el) => el.getBoundingClientRect().top < window.innerHeight * 0.9;

        const ctx = gsap.context(() => {
            gsap.utils.toArray("[data-reveal]").forEach((el) => {
                if (onScreen(el)) return;

                gsap.from(el, {
                    y: 26,
                    opacity: 0,
                    duration: 0.7,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: el,
                        /*
                         * Just past the fold.
                         *
                         * This was 88%, which on a phone meant a section had
                         * been on screen for most of a thumb-flick before it
                         * began to move - read as the page being slow to
                         * respond rather than as anything arriving. A few
                         * percent earlier and the movement happens as the
                         * section comes in, which is what it was always for.
                         */
                        start: "top 94%",
                        toggleActions: "play none none none",
                    },
                });
            });

            // Children of a [data-stagger] arrive one after another, which is
            // what makes a grid read as a set rather than as six separate
            // things that happened to appear
            gsap.utils.toArray("[data-stagger]").forEach((group) => {
                if (onScreen(group)) return;

                gsap.from(group.children, {
                    y: 20,
                    opacity: 0,
                    duration: 0.6,
                    ease: "power2.out",
                    stagger: 0.07,
                    // Earlier than a single block for the same reason, and a
                    // shade earlier again because a stagger finishes last
                    scrollTrigger: { trigger: group, start: "top 92%", toggleActions: "play none none none" },
                });
            });
        }, scope);

        /*
         * Measured after the triggers exist, not before.
         *
         * Positions are worked out when a trigger is created, and at that
         * moment the web font has usually not swapped in and the images have
         * no height - so every start point is wrong by a few hundred pixels.
         * One refresh on the next frame settles them against the page as it
         * actually is.
         */
        const settle = requestAnimationFrame(() => ScrollTrigger.refresh());

        return () => {
            cancelAnimationFrame(settle);
            ctx.revert();
        };
    }, []);

    return scope;
};

/**
 * The opening, which runs on load rather than on scroll.
 *
 * Only transforms move. The hero's words are readable in the first frame -
 * that frame is what a link preview and an impatient reader both get, and a
 * headline that fades up from nothing is a headline that is missing when it
 * matters most.
 */
export const useHeroIntro = () => {
    const scope = useRef(null);

    useEffect(() => {
        if (stillPlease() || !scope.current) return undefined;

        const ctx = gsap.context(() => {
            /*
             * The headline moves, and nothing more.
             *
             * A clip that opens upward looked better and was the wrong trade.
             * gsap.from starts the element at the hidden end of the tween, so
             * anything that hides the words - opacity, a clip - leaves them
             * hidden for as long as the ticker is not running: a backgrounded
             * tab, a throttled phone, a blocked bundle. The headline is the one
             * thing on this page that has to survive all three, so it only ever
             * slides. Everything below the fold can afford a fade; this cannot.
             */
            gsap.from("[data-hero-title]", {
                y: 26,
                duration: 0.9,
                ease: "power3.out",
            });

            gsap.from("[data-hero-line]", {
                y: 18,
                duration: 0.8,
                ease: "power3.out",
                stagger: 0.09,
                delay: 0.12,
            });

            // Small: the opening picture now stands on the bottom edge of the
            // masthead, and anything that starts it lower starts it clipped
            gsap.from("[data-hero-art]", {
                y: 14,
                duration: 1,
                ease: "power2.out",
                delay: 0.15,
            });
        }, scope);

        return () => ctx.revert();
    }, []);

    return scope;
};

/**
 * The stack: a run of panels that pile up on one another as the page scrolls.
 *
 * The stacking itself is CSS - each panel is sticky, each one parked a little
 * lower than the one before it, so the previous panel's top edge stays visible
 * underneath like a deck of cards held slightly fanned. That much works with
 * the script switched off, which matters: a pinned section built purely in
 * JavaScript is a section that collapses into nothing when the bundle fails.
 *
 * What GSAP adds is the part CSS cannot do - shrinking and dimming a panel as
 * the next one climbs over it, tied to the scroll position rather than to a
 * duration. That is what makes the one underneath read as being further away
 * instead of merely being covered up.
 */
export const useStack = () => {
    const scope = useRef(null);

    useEffect(() => {
        if (stillPlease() || !scope.current) return undefined;

        const ctx = gsap.context(() => {
            const cards = gsap.utils.toArray("[data-stack-card]");

            cards.forEach((card, i) => {
                // The last one is never covered, so it never recedes
                if (i === cards.length - 1) return;

                /*
                 * It shrinks back, and that is the whole effect.
                 *
                 * Two attempts at dimming the covered panel came before this
                 * and both were worse than nothing. Fading the panel itself
                 * made it transparent, so three stacked steps printed their
                 * headings through one another. Laying a sheet of paper over it
                 * instead fixed the smear but left every panel you had already
                 * passed looking washed out, which reads as a page that has
                 * failed rather than a deck that is stacking. A panel that is
                 * simply further away needs no help being read as further
                 * away, and nothing that can go wrong.
                 */
                gsap.to(card, {
                    scale: 0.92,
                    ease: "none",
                    scrollTrigger: {
                        // Driven by the arrival of the next panel, not by this
                        // one's own position - the two are the same movement
                        trigger: cards[i + 1],
                        start: "top bottom",
                        end: "top top+=150",
                        // Straight to the scroll position rather than eased
                        // towards it: Lenis has already smoothed the scroll, and
                        // a second smoothing needs the ticker running, which a
                        // backgrounded tab does not give it
                        scrub: true,
                    },
                });
            });
        }, scope);

        const settle = requestAnimationFrame(() => ScrollTrigger.refresh());

        return () => {
            cancelAnimationFrame(settle);
            ctx.revert();
        };
    }, []);

    return scope;
};

/**
 * A quick cross-fade for content that is swapped in place - a tab panel, say.
 *
 * Called with whatever changed, so the new content moves in each time the
 * reader picks something rather than only on first render. Transform and
 * opacity only, and short: this runs on a click, and anything slower than
 * about a fifth of a second stops reading as a response to the click and
 * starts reading as the page being slow.
 */
export const useSwap = (token) => {
    const scope = useRef(null);

    useEffect(() => {
        if (stillPlease() || !scope.current) return undefined;

        const ctx = gsap.context(() => {
            gsap.from("[data-swap]", {
                y: 10,
                opacity: 0,
                duration: 0.32,
                ease: "power2.out",
                stagger: 0.04,
            });
        }, scope);

        return () => ctx.revert();
    }, [token]);

    return scope;
};

/**
 * A figure that counts up to itself once it is scrolled to.
 *
 * Only where the number is the point - a strip of four facts, not a price in
 * a table. The element keeps its final value in the markup, so a reader with
 * the script blocked or motion turned off sees the figure rather than a zero
 * that never moves.
 */
export const useCountUp = (value) => {
    const node = useRef(null);

    useEffect(() => {
        const el = node.current;
        if (!el || stillPlease()) return undefined;

        const target = Number(String(value).replace(/[^0-9.]/g, ""));
        if (!Number.isFinite(target) || target === 0) return undefined;

        const prefix = String(value).slice(0, String(value).search(/[0-9]/));
        const suffix = String(value).replace(/^[^0-9]*[0-9.]+/, "");
        const counter = { n: 0 };

        const tween = gsap.to(counter, {
            n: target,
            duration: 1.1,
            ease: "power2.out",
            onUpdate: () => { el.textContent = prefix + Math.round(counter.n) + suffix; },
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });

        return () => {
            tween.scrollTrigger?.kill();
            tween.kill();
            el.textContent = String(value);
        };
    }, [value]);

    return node;
};

/**
 * The footer lies underneath the page, and the page slides off it.
 *
 * A footer stuck to the bottom of a long column is the last thing anybody sees
 * and it always looks like the place the design ran out. This one is fixed to
 * the window from the start, with the whole site sitting on top of it like a
 * sheet of paper on a desk - so the last screen of scrolling lifts the sheet
 * away and uncovers what was there all along.
 *
 * Two things keep it honest. The lift is only taken when the footer genuinely
 * fits under the window, so a phone in landscape or a footer that grew a
 * column gets the ordinary stacked one instead of a fixed panel eating the
 * screen. And the whole arrangement is just a margin and a fixed position - if
 * the measurement never happens, the footer is simply where it always was.
 *
 * GSAP does the part that cannot be done with position alone: the footer's own
 * content rises as it is uncovered, so it reads as something underneath being
 * revealed rather than a picture painted on the window.
 */
export const useLiftedFooter = () => {
    const footer = useRef(null);
    const page = useRef(null);
    const [lift, setLift] = useState(0);

    /* What the last measurement decided, readable from inside the observer
       below without making it tear down and rebuild on every change */
    const lifted = useRef(0);

    useEffect(() => {
        const el = footer.current;
        if (!el || typeof ResizeObserver === "undefined") return undefined;

        /*
         * A tablet gets the lift; a phone does not.
         *
         * It used to start at 1024, which put tablets in with phones and gave
         * them the plain stacked footer. A tablet has the height for it and is
         * held the way a laptop is looked at, so it reads the same. Below this
         * the footer is simply the end of the page, which is what a phone
         * wants: a panel pinned under a short screen is a second page in the
         * way, not a reveal.
         */
        const wide = window.matchMedia("(min-width: 768px)");

        const measure = () => {
            const height = el.offsetHeight;

            // A footer taller than four fifths of the window is not a reveal,
            // it is a second page pinned over the first
            const room = wide.matches && height > 0 && height < window.innerHeight * 0.8;

            /*
             * And the page above has to be worth lifting.
             *
             * On a short screen - the account page with nobody signed in, say -
             * the sheet ends halfway down the window, so its rounded bottom edge
             * sits in the middle of the screen with the footer already showing
             * underneath it. That is not a lift, it is a page that looks broken.
             * Those pages get the ordinary footer at the end of the content.
             */
            /*
             * And it takes more to start lifting than to keep lifting.
             *
             * Without the gap between those two numbers this is a switch
             * sitting exactly on its own threshold: a page only a little
             * taller than the window - the services page is one - crosses the
             * line every time a lazy image finishes loading or the window
             * changes by a hair, and the reader watches the bottom corner
             * round itself and go square again while they scroll. Once the
             * page has earned the lift it keeps it until it is clearly too
             * short to deserve it.
             */
            const floor = window.innerHeight + (lifted.current ? 40 : 120);
            const tall = !page.current || page.current.offsetHeight > floor;

            /*
             * The sheet stops short of the footer's top, on purpose.
             *
             * Lifting it by the footer's whole height put its bottom edge
             * exactly on the footer's top edge - which meant the sheet's
             * rounded corners had nothing dark behind them and cut two pale
             * notches out of the page instead, at the end of every scroll.
             *
             * So the reveal stops a little above the footer's first line: the
             * sheet keeps covering the footer's top padding, the corners sit
             * on the dark panel where they read as corners, and the scroll
             * simply has nowhere further to go.
             */
            const inner = el.querySelector("[data-footer-inner]");
            const air = inner ? parseFloat(getComputedStyle(inner).paddingTop) || 0 : 0;
            // Never less than the corner is deep, or the notches come back
            const overlap = Math.max(air - 20, 44);

            const next = room && tall ? Math.max(height - overlap, 0) : 0;

            lifted.current = next;
            setLift(next);
        };

        measure();

        const watch = new ResizeObserver(measure);
        watch.observe(el);
        // The page changes height on every navigation, and this shell stays
        // mounted through all of them
        if (page.current) watch.observe(page.current);
        window.addEventListener("resize", measure);
        wide.addEventListener("change", measure);

        return () => {
            watch.disconnect();
            window.removeEventListener("resize", measure);
            wide.removeEventListener("change", measure);
        };
    }, []);

    useEffect(() => {
        if (!lift || stillPlease() || !footer.current || !page.current) return undefined;

        const inner = footer.current.querySelector("[data-footer-inner]");
        if (!inner) return undefined;

        const tween = gsap.fromTo(inner,
            { y: 36 },
            {
                y: 0,
                ease: "none",
                scrollTrigger: {
                    // The page's own bottom edge crossing the last screen is
                    // exactly the stretch in which the footer is uncovered
                    trigger: page.current,
                    start: "bottom bottom",
                    end: "bottom bottom-=" + lift,
                    scrub: true,
                },
            });

        // The margin below only exists once the lift is known, so every
        // trigger on the page was measured against a shorter document
        const settle = requestAnimationFrame(() => ScrollTrigger.refresh());

        return () => {
            cancelAnimationFrame(settle);
            tween.scrollTrigger?.kill();
            tween.kill();
            gsap.set(inner, { clearProps: "transform" });
        };
    }, [lift]);

    return { footer, page, lift };
};

/**
 * Anything carrying [data-parallax] drifts a little against the scroll.
 *
 * Transform only, and a small one - the point is that a picture and the words
 * beside it do not move as one flat sheet. Anything larger than this stops
 * being depth and starts being a thing sliding about on the page.
 */
export const useParallax = () => {
    const scope = useRef(null);

    useEffect(() => {
        if (stillPlease() || !scope.current) return undefined;

        const ctx = gsap.context(() => {
            gsap.utils.toArray("[data-parallax]").forEach((el) => {
                const depth = Number(el.dataset.parallax) || 40;

                gsap.fromTo(el,
                    { y: depth },
                    {
                        y: -depth,
                        ease: "none",
                        scrollTrigger: {
                            trigger: el,
                            start: "top bottom",
                            end: "bottom top",
                            scrub: true,
                        },
                    });
            });
        }, scope);

        const settle = requestAnimationFrame(() => ScrollTrigger.refresh());

        return () => {
            cancelAnimationFrame(settle);
            ctx.revert();
        };
    }, []);

    return scope;
};
