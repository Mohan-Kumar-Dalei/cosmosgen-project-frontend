import { Blobs } from "./Blob";
import { Mesh } from "./Mesh";
import { Pattern } from "./Texture";
import { Art } from "./Art";
import { tintFor } from "./brand";

/**
 * The shapes every customer page is built out of.
 *
 * Eight pages written freehand drift apart within a week - one gets a heading
 * a size larger, another loses its eyebrow, a third pads differently - and the
 * site stops feeling like one company. These hold the rhythm, so a page file
 * contains its argument and almost no chrome.
 */

/**
 * The opening of a page.
 *
 * Asymmetric, and the picture runs off the edge of the screen. Three earlier
 * versions of this were, in order, a two-column split, a two-column split on a
 * navy slab, and everything centred - and all three had the same problem: they
 * were arrangements that fit inside a box, so the page looked like a box. A
 * picture that leaves the frame says the page continues past the window, which
 * is the whole trick behind why an expensive site feels larger than its
 * viewport.
 *
 * The headline is set wide and tight and is clipped open on load rather than
 * faded. `art` is the thing that bleeds; `band` is whatever runs full width
 * underneath - the work itself on the home page, a bill on the pricing page.
 */
export const PageHead = ({ eyebrow, title, lede, art, band, foot, children }) => (
    <section className="relative overflow-clip">
        <Mesh />
        <Pattern kind="dots" fade="radial" />

        {/*
          * The picture belongs to the masthead, not to the section.
          *
          * It used to be laid over the whole section and sized at a percentage
          * of it, which was fine until a page put something underneath - the
          * step demo on How it works - and the drawing promptly grew to 72% of
          * a much taller section and came down across it. Wrapping the words
          * and the picture together, with the band outside, means the art can
          * only ever be as tall as the masthead it belongs to.
          */}
        <div className="relative">
            {art && (
                <div aria-hidden className="hidden lg:block absolute inset-0 pointer-events-none">
                    <div className="relative mx-auto max-w-6xl h-full px-5 sm:px-8">
                        {/* Whatever goes in here sits level with the words. A
                            drawing fills the box either way; a card that is
                            shorter than it - the pricing page's bill - used to
                            ride at the top and read as having slipped */}
                        <div
                            data-hero-art
                            className="absolute right-0 lg:-right-4 xl:-right-10 top-6 bottom-6 w-[42%] max-w-[440px] max-h-[560px] flex items-center justify-center"
                        >
                            {art}
                        </div>
                    </div>
                </div>
            )}

            <div className="relative mx-auto max-w-6xl px-5 sm:px-8 pt-12 lg:pt-16 pb-12 lg:pb-16">
                <div className={art ? "lg:max-w-[58%]" : "max-w-4xl"}>
                {eyebrow && (
                    <p data-hero-line>
                        <span className="inline-flex items-center gap-2 h-8 pl-2.5 pr-4 rounded-full bg-surface shadow-card text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">
                            <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-brand" />
                            {eyebrow}
                        </span>
                    </p>
                )}

                <h1
                    data-hero-title
                    className="mt-7 font-display font-extrabold text-[clamp(2.5rem,6.4vw,4.6rem)] leading-[0.98] tracking-[-0.045em] text-balance"
                >
                    {title}
                </h1>

                {lede && (
                    <p data-hero-line className="mt-7 max-w-xl text-[17px] leading-relaxed text-ink-soft">
                        {lede}
                    </p>
                )}

                {/*
                  * The two rows below are ordered on purpose.
                  *
                  * Both are animated, and an animated element gets a stacking
                  * context of its own - so between these two the later one in
                  * the markup paints on top, whatever z-index sits inside it.
                  * The area box hangs a suggestion list below itself, and the
                  * strip of trades underneath was covering it: a real list,
                  * drawn, with pills sitting across its second line.
                  */}
                {children && <div data-hero-line className="relative z-20 mt-9">{children}</div>}

                    {foot && (
                        <div data-hero-line className="relative z-10 mt-10 flex flex-wrap gap-2.5">
                            {foot}
                        </div>
                    )}
                </div>

                {/* The same picture, in the flow, for a screen too narrow to bleed */}
                {art && <div className="lg:hidden mt-12">{art}</div>}
            </div>
        </div>

        {band && (
            <div className="relative mx-auto max-w-6xl px-5 sm:px-8 pb-14 lg:pb-20">
                {band}
            </div>
        )}
    </section>
);

/**
 * A row of short facts under a masthead.
 *
 * Not decoration: each one is a thing the page goes on to prove, so the strip
 * doubles as the page's own contents list.
 */
export const HeadStrip = ({ items }) => items.map((item) => (
    <span
        key={item}
        className="inline-flex items-center h-9 px-4 rounded-full bg-surface shadow-card text-[13px] font-medium text-ink-soft"
    >
        {item}
    </span>
));

/**
 * Three drawings on their own tinted grounds, as the band under a masthead.
 *
 * The drawings are cutouts with nothing behind them, so each needs a panel to
 * stand on; three at one height turns that necessity into a composition rather
 * than three stickers in a row. On a phone it becomes something you push
 * sideways, which is the one place a horizontal scroll genuinely beats a stack.
 */
export const ArtRow = ({ items }) => (
    <div
        className="flex gap-4 overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 sm:overflow-visible"
        style={{ scrollSnapType: "x mandatory" }}
    >
        {items.map((item, i) => (
            <figure
                key={item.caption}
                className="shrink-0 w-[76%] sm:w-auto m-0"
                style={{ scrollSnapAlign: "center" }}
            >
                <Art
                    src={item.src}
                    alt=""
                    icon={item.icon}
                    tr="w-620"
                    fit="contain"
                    tint={tintFor(i)}
                    className="w-full aspect-[4/4.4] rounded-[28px]"
                />
                <figcaption className="mt-3 text-center text-[13px] font-semibold text-ink-soft">
                    {item.caption}
                </figcaption>
            </figure>
        ))}
    </div>
);

/**
 * A run of page between two others.
 *
 * `tone` decides the ground - the page's own paper, the raised surface, or the
 * panel - and `decor` what sits behind it: dots for reading, blobs for colour,
 * rich for the one field of brand, weave for anything about the assistant. Both the pattern and the colour
 * field are absolutely positioned, so every band has to establish a stacking
 * context and clip; doing that here rather than in each page is the point.
 */
export const Band = ({ tone = "paper", decor = "none", className = "", anchor, children }) => {
    const ground = {
        paper: "bg-canvas text-ink",
        white: "bg-surface text-ink",
        dark: "bg-panel text-white",
        // A whole band of brand colour. The site had none anywhere, and a page
        // with no large colour on it reads as timid however well it is set.
        field: "text-[var(--color-field-ink)]",
    }[tone];

    /*
     * Clip, not hidden.
     *
     * `overflow: hidden` trims the decoration by turning the band into a
     * scroll container, which silently kills `position: sticky` for everything
     * inside it - that is what stopped the step deck from stacking the moment
     * these bands went in. `overflow: clip` trims the same way without
     * becoming a scrollport.
     */
    return (
        <section
            ref={anchor}
            className={"relative overflow-clip " + ground + " " + className}
            style={tone === "field" ? { background: "var(--color-field)" } : undefined}
        >
            {decor === "blobs" && <Blobs field={tone === "dark" || tone === "field" ? "dark" : "band"} />}
            {decor === "dots" && <Pattern kind="dots" />}
            {/* The conversation bands - the assistant and every strip that
                invites somebody into it - carry their own texture, so the
                same offer is recognisable from page to page */}
            {decor === "weave" && <Pattern kind="weave" />}

            {/* For the one band that is a field of colour. A flat rectangle of
                brand blue is a poster, not a page - it needs the same merged
                shapes and the same grain as everything else, or it reads as a
                different site spliced in */}
            {decor === "rich" && (
                <>
                    <Mesh tone="dark" />
                    <Pattern kind="cross" fade="none" className="opacity-80" />
                </>
            )}

            <div className="relative mx-auto max-w-6xl px-5 sm:px-8 py-20 lg:py-24">
                {children}
            </div>
        </section>
    );
};

/** A section heading, so twelve of them cannot quietly become twelve sizes. */
export const Head = ({ eyebrow, title, lede, tone = "light", className = "" }) => (
    <div data-reveal className={"max-w-2xl " + className}>
        {eyebrow && (
            <p className={"text-[11px] font-bold uppercase tracking-[0.2em] "
                + (tone === "dark" ? "text-white/45" : "text-accent")}>
                {eyebrow}
            </p>
        )}
        <h2 className="mt-4 font-display font-bold text-[clamp(1.8rem,3.6vw,2.5rem)] leading-[1.1] tracking-[-0.028em] text-balance">
            {title}
        </h2>
        {lede && (
            <p className={"mt-4 text-[15.5px] leading-relaxed "
                + (tone === "dark" ? "text-white/65" : "text-ink-soft")}>
                {lede}
            </p>
        )}
    </div>
);
