import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ik } from "./brand";

/**
 * A picture that is never a broken image, and never a cropped cutout.
 *
 * The customer set is drawn in 3D on a transparent ground - figures and
 * machines with no scene behind them - so these cannot be treated the way a
 * photograph is. A cutout stretched to fill a frame loses whatever hangs off
 * the edges, which on a standing figure means its feet. So `fit="contain"`
 * sits the drawing on a tinted panel and stands it on the panel's own bottom
 * edge, and the panel stays visible underneath rather than being covered.
 *
 * The same panel is the placeholder. Half of this set is still being drawn and
 * the rest lives on a CDN that can be slow or blocked; a plain `<img>` answers
 * both of those with the browser's torn-page icon, which is the single most
 * unfinished-looking thing a page can show. Here a missing picture is simply a
 * tinted panel with the service's own icon on it, and the layout never moves.
 *
 * `tr` is an ImageKit transform - "w-800,q-80" and so on - so a thumbnail
 * fetches a thumbnail rather than the original.
 */
const GROUNDS = {
    sky: "var(--art-sky)",
    leaf: "var(--art-leaf)",
    sand: "var(--art-sand)",
    dark: "var(--art-dark)",
};

/**
 * The same drawing at a few widths, for the browser to choose between.
 *
 * Only the cuts narrower than the one asked for, and only when the ask is a
 * plain width - anything else (a crop, a height, no transform at all) is
 * handed back untouched rather than guessed at.
 */
const WIDTHS = [320, 480, 640, 720, 900];

const askedWidth = (tr) => {
    const m = /^w-(\d+)$/.exec(String(tr || ""));
    return m ? Number(m[1]) : 0;
};

const cuts = (url, tr) => {
    const want = askedWidth(tr);
    if (!want || !url) return undefined;

    const set = [...new Set([...WIDTHS.filter((w) => w < want), want])];
    return set.map((w) => ik(url, "w-" + w) + " " + w + "w").join(", ");
};

export const Art = ({
    src,
    /*
     * No panel at all - just the drawing on the page.
     *
     * The set is cut out on a transparent ground, and the mastheads look
     * better for admitting it: a tinted rectangle behind a standing figure
     * reads as a sticker, and the figure's feet on the panel's own bottom edge
     * read as a crop. Tiles in a grid still want their ground, which is why
     * this is a choice rather than a change.
     */
    bare = false,
    // A second picture to try when the first one is not there yet. The set is
    // still being drawn, and a page that names a drawing nobody has uploaded
    // should fall back to a picture of the same company rather than to an
    // empty panel with an icon on it.
    fallback = "",
    alt = "",
    icon: Icon,
    tr,
    fit = "cover",
    tint = "sky",
    className = "",
    imgClassName = "",
    eager,
    // So a caller can hang a [data-reveal] on the frame itself rather than
    // wrapping every picture in a spare div
    ...rest
}) => {
    const [asked, setAsked] = useState(src);
    const [showing, setShowing] = useState(src);
    const [state, setState] = useState(src ? "loading" : "gone");

    // Adjusted while rendering rather than in an effect: a new `src` means the
    // old picture's loaded-or-missing verdict is stale, and waiting a frame to
    // say so would flash the previous drawing in the new one's frame
    if (asked !== src) {
        setAsked(src);
        setShowing(src);
        setState(src ? "loading" : "gone");
    }

    const missed = () => {
        if (fallback && showing !== fallback) {
            setShowing(fallback);
            setState("loading");
            return;
        }
        setState("gone");
    };

    const contain = fit === "contain";
    const dark = tint === "dark";

    // The width the caller says this is drawn at on a wide screen, which is
    // the only thing `sizes` below can honestly claim to know
    const wide = askedWidth(tr);

    /*
     * A picture nobody can see is not fetched.
     *
     * Half the drawings on this site are `hidden lg:block` - they belong to a
     * layout that only exists on a wide screen. A browser does not care: an
     * <img> inside a display:none branch is downloaded exactly like any other,
     * so every phone was pulling a hundred and twenty kilobytes of artwork it
     * would never draw a pixel of, on every page.
     *
     * Measured rather than guessed at with a media query, because the rule
     * that hides these lives in their own class names and each one is
     * different. Measured in a layout effect, so on a wide screen the image is
     * asked for in the same frame it always was and nothing is slower than it
     * used to be.
     */
    const box = useRef(null);
    const [visible, setVisible] = useState(true);

    useLayoutEffect(() => {
        const el = box.current;
        if (el) setVisible(el.offsetWidth > 0 || el.offsetHeight > 0);
    }, []);

    useEffect(() => {
        const el = box.current;
        if (!el || typeof ResizeObserver === "undefined") return undefined;

        // A window dragged wider, or a phone turned on its side
        const watch = new ResizeObserver(() => {
            setVisible(el.offsetWidth > 0 || el.offsetHeight > 0);
        });

        watch.observe(el);
        return () => watch.disconnect();
    }, []);

    // A cutout needs its panel for ever; a photograph only needs it until the
    // photograph arrives
    const showGround = !bare && (contain || state !== "ready");

    return (
        <div ref={box} className={(bare ? "relative cg-stand " : "relative overflow-hidden ") + className} {...rest}>
            {showGround && (
                <div
                    aria-hidden
                    // The sweep runs only while there is nothing to look at.
                    // On a panel that stays for good - a contained cutout
                    // keeps its ground - a shimmer under a finished picture
                    // would be movement for its own sake.
                    className={"absolute inset-0 grid place-items-center "
                        + (state === "ready" ? "" : "cg-skeleton")}
                    style={{
                        background: GROUNDS[tint] || GROUNDS.sky,
                        boxShadow: dark ? "none" : "var(--art-edge)",
                    }}
                >
                    {Icon && state !== "ready" ? (
                        <Icon
                            className={"w-8 h-8 " + (dark ? "text-white/25" : "text-accent/30")}
                            strokeWidth={1.4}
                        />
                    ) : null}
                </div>
            )}

            {/*
              * And the same for a drawing with no panel of its own.
              *
              * `bare` art had nothing in its place at all until the picture
              * arrived - a hole in the layout that a reader cannot tell apart
              * from a missing image. This is a soft shape rather than a card,
              * rounded and unbordered, and it fades as the picture fades in so
              * one crosses into the other instead of blinking.
              */}
            {bare && visible && state === "loading" && (
                <div
                    aria-hidden
                    className="cg-skeleton absolute inset-x-[8%] inset-y-[6%] rounded-[28px] transition-opacity duration-500"
                />
            )}

            {state !== "gone" && visible && (
                <img
                    key={showing}
                    src={ik(showing, tr)}
                    /*
                     * A phone does not need the desktop's copy of a drawing.
                     *
                     * `tr` is the width this picture is drawn at on a wide
                     * screen, and until now every device was handed exactly
                     * that - a service tile on a 375px phone was pulling a
                     * 900px file, which is most of a hundred kilobytes spent
                     * on pixels the screen cannot show. The narrower cuts are
                     * offered alongside it and the browser takes whichever
                     * matches the box it is about to draw into, at whatever
                     * pixel density the device has.
                     *
                     * `sizes` is an approximation on purpose: the declared
                     * width on a wide screen, and nearly the full width of a
                     * narrow one, which is how every one of these is laid out.
                     */
                    srcSet={cuts(showing, tr)}
                    sizes={wide ? "(min-width: 1024px) " + wide + "px, 92vw" : undefined}
                    alt={alt}
                    loading={eager ? "eager" : "lazy"}
                    decoding="async"
                    onLoad={() => setState("ready")}
                    onError={missed}
                    className={"relative w-full h-full transition-opacity duration-500 "
                        + (contain ? "object-contain object-bottom " : "object-cover ")
                        + (state === "ready" ? "opacity-100 " : "opacity-0 ")
                        + imgClassName}
                    /*
                     * Room on every side, including a little underneath.
                     *
                     * It used to be flush with the bottom so a figure stood on
                     * the panel rather than floating in it - and at a glance
                     * that is exactly what a cropped picture looks like, a
                     * person cut off by a hard line under their feet. A few
                     * percent of air fixes it and costs almost no size.
                     */
                    style={contain ? { padding: bare ? 0 : "6% 8% 5%" } : undefined}
                />
            )}
        </div>
    );
};
