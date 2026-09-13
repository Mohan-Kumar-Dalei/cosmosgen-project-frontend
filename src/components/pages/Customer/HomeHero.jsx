import { Link } from "react-router-dom";
import { ArrowRight, CalendarClock, ReceiptText, ShieldCheck } from "lucide-react";
import { Mesh } from "./Mesh";
import { Pattern } from "./Texture";
import { AreaBar } from "./AreaPicker";
import { WhatsAppMark } from "./Marks";
import { usePictures } from "./pictures";
import { WHATSAPP_LINK, ik } from "./brand";

/**
 * The opening, built as one composition rather than as a column of blocks.
 *
 * Three arrangements came before this and all three had the same fault: the
 * words sat in one box and the picture in another, so the screen read as a
 * form somebody had filled in. What replaces them is layered - the team stands
 * in the middle at full height, the claim is set into the top left corner, and
 * everything a visitor can actually do is gathered into the bottom right.
 *
 * That shape does real work. The eye lands on four people in uniform, reads
 * the sentence beside them, and finds the controls exactly where a hand
 * expects them - and because the drawing is a cutout with nothing behind it,
 * the layers can overlap without a single card or panel anywhere on the
 * screen.
 *
 * The layering starts at `xl`, not at `lg`. Below about 1280 the three
 * columns and a picture large enough to be worth looking at genuinely do not
 * fit beside one another - the search box and the buttons ran out over the
 * drawing - so a laptop that narrow gets the honest stacked version: the
 * claim, the picture, the doubts, and then what to do about them.
 */
/**
 * The three things that have already happened to everybody, answered.
 *
 * They sit in the opening rather than in a section further down, and that is
 * the point of them: the reader is deciding whether to let a stranger into
 * their house, and the objection is already in their head before they have
 * scrolled. Each answer is a mechanism this platform actually has - the live
 * link, the price list, the record - so every one of them is proved again
 * later on the page with the detail attached.
 *
 * No headline over them and no paragraph around them. The moment this becomes
 * an essay it stops being read.
 */
const TROUBLES = [
    {
        icon: CalendarClock,
        said: "Nobody turned up, and nobody rang",
        answer: "The office assigns the job and you get the engineer's name, photograph and number before they set off, plus a live link showing where they have reached.",
    },
    {
        icon: ReceiptText,
        said: "The price went up once he saw the flat",
        answer: "Every line on the bill is picked from the company's own price list, in front of you, and nothing can be added after you have agreed the total.",
    },
    {
        icon: ShieldCheck,
        said: "It broke again and the number stopped working",
        answer: "The job, the engineer and the invoice are all on record here. You take it up with the company, not with whoever came.",
    },
];

export const HomeHero = () => {
    const pics = usePictures();

    return (
        <section className="relative overflow-clip">
            <Mesh />
            <Pattern kind="dots" fade="radial" />

            {/*
              * The full width, not the reading column.
              *
              * The drawing turned out to be a full-bleed composition rather
              * than a sparse cutout - measured, its opaque pixels run edge to
              * edge - so words laid over it would sit on somebody's shoulder.
              * Pushing the claim and the controls out to the window's own
              * margins is what buys the middle for the picture: at every width
              * from a laptop up, the three sit side by side and none of them
              * touches another.
              */}
            <div className="relative px-5 sm:px-8 xl:px-[3vw] flex flex-col xl:min-h-[min(90vh,880px)]">
                {/*
                  * The team, at the height of the opening itself.
                  *
                  * Absolute from `lg` so the words can sit over it; in the flow
                  * below that, where an overlap would only be a collision. It
                  * stands on the bottom edge - a cutout that floats above the
                  * fold line looks like it was pasted on.
                  */}
                {/* The wrapper exists only to carry the shadow under the
                    figure - a cutout with nothing beneath it floats */}
                <div
                    data-hero-art
                    /*
                     * The cap grows with the screen.
                     *
                     * It was a flat 520px below the composed layout, which is
                     * the right size on a phone - there it never bites, the
                     * width does - and steadily wrong above it. At 768 the
                     * picture took 69% of the row and at 1024 barely half,
                     * so the wider the tablet the smaller the group looked,
                     * which is the opposite of what a masthead should do.
                     * These keep it in the same band a phone gets.
                     */
                    className="cg-stand order-2 xl:order-none pointer-events-none
                        mx-auto w-[min(100%,520px)]
                        sm:w-[min(100%,600px)] md:w-[min(100%,660px)] lg:w-[min(100%,820px)]
                        xl:absolute xl:left-1/2 xl:-translate-x-1/2 xl:bottom-0
                        xl:w-auto xl:mx-0"
                >
                {/*
                  * Asked for at the size it will actually be drawn.
                  *
                  * This was the original file - 1024 by 1536, six megabytes
                  * once decoded - handed to every device including a phone
                  * that draws it about 340 pixels wide. It is the first thing
                  * the page fetches and the browser cannot lay the opening out
                  * until it has it, so on a slow connection it was the whole
                  * of the wait, and on a cheap Android the decode alone was a
                  * visible stall. ImageKit resizes on the URL, so the phone
                  * now takes a tenth of the pixels and the desktop still gets
                  * a sharp one.
                  */}
                <img
                    src={ik(pics.HERO_TEAM, "w-900")}
                    srcSet={[
                        ik(pics.HERO_TEAM, "w-480") + " 480w",
                        ik(pics.HERO_TEAM, "w-720") + " 720w",
                        ik(pics.HERO_TEAM, "w-900") + " 900w",
                    ].join(", ")}
                    sizes="(min-width: 1280px) 34vw, 92vw"
                    alt="Cosmosgen engineers from each trade, with the tools they work with"
                    width="1000"
                    height="1100"
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                    onError={(e) => {
                        // One fallback, and only one - a second failure would loop
                        const spare = ik(pics.HERO_VISIT, "w-900");
                        if (e.currentTarget.src !== spare) {
                            // The set has to go too, or the browser simply
                            // picks another broken URL out of it
                            e.currentTarget.srcset = "";
                            e.currentTarget.src = spare;
                        }
                    }}
                    /* The height cap has to move with the width, or a wider
                       tablet just letterboxes the same picture - `contain`
                       gives back in width whatever the height takes away */
                    /*
                     * Sized by its width, because the picture is a wide one.
                     *
                     * The composed layout was written for the old artwork: a
                     * single figure standing, taller than it was wide, so it
                     * was given a height (88vh) and a narrow width cap (34vw)
                     * and `contain` did the rest. The picture has since been
                     * replaced with the group, which is landscape - and against
                     * a tall narrow box a wide picture shrinks to fit the
                     * width and leaves the height empty. On a landscape tablet
                     * the box measured 464 by 676 with only 464 by 348 of
                     * actual picture in it: a third of a screen of nothing,
                     * and a group that looked small for no reason anybody
                     * could see.
                     *
                     * So the width leads now and the height follows, with a
                     * ceiling so a short screen is not swallowed whole.
                     */
                    className="select-none w-full max-h-[56vh] md:max-h-[64vh] lg:max-h-[72vh]
                        xl:w-[52vw] xl:h-auto xl:max-w-none xl:max-h-[70vh]
                        2xl:w-[46vw] 2xl:max-h-[76vh]
                        object-contain object-bottom"
                />
                </div>

                {/* ---- the claim, top left ---- */}
                <div className="order-1 xl:order-none relative z-10 pt-12 xl:pt-[6vh] xl:w-[27vw] 2xl:w-[25vw] xl:max-w-[30rem] xl:min-w-0">
                    {/*
                      * A wash of the page's own ground behind the words, only
                      * where they overlap the drawing. Not a panel and not a
                      * shadow - just enough that a headline never has to
                      * compete with a shoulder behind it.
                      */}
                    <div
                        aria-hidden
                        className="hidden xl:block absolute -inset-x-10 -inset-y-8 -z-10"
                        style={{
                            background: "radial-gradient(68% 62% at 28% 46%, var(--color-canvas) 0%, color-mix(in srgb, var(--color-canvas) 70%, transparent) 58%, transparent 100%)",
                        }}
                    />

                    <p data-hero-line>
                        <span className="inline-flex items-center gap-2 h-8 pl-2.5 pr-4 rounded-full bg-surface shadow-card text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">
                            <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-brand" />
                            Cosmosgen · Odisha
                        </span>
                    </p>

                    <h1
                        data-hero-title
                        className="mt-6 font-display font-extrabold text-[clamp(2.3rem,4vw,3.4rem)] leading-[0.97] tracking-[-0.045em] text-balance"
                    >
                        Someone who can actually fix it,{" "}
                        <span className="text-accent">at your door.</span>
                    </h1>

                    <p data-hero-line className="mt-6 max-w-md text-[16.5px] leading-relaxed text-ink-soft">
                        Electricians, plumbers, appliance engineers and cleaners. Our own approved
                        team, at a price agreed before the work begins.
                    </p>
                </div>

                {/* ---- what they are already thinking, top right ---- */}
                <div
                    data-hero-line
                    className="order-3 xl:order-none relative z-10 mt-10 xl:mt-0
                        xl:absolute xl:right-[3vw] xl:top-[6vh]
                        xl:w-[27vw] 2xl:w-[25vw] xl:max-w-[30rem] xl:min-w-0"
                >
                    {/*
                      * What the reader is already thinking, answered before
                      * they are asked to do anything - and set at the top of
                      * the right-hand side rather than stacked on the
                      * controls, so the opening reads across: the claim, the
                      * team, the doubts, and only then what to do about them.
                      */}
                    <ul className="w-full flex flex-col gap-4 xl:gap-5 text-left">
                        {TROUBLES.map((item) => (
                            <li key={item.said} className="group flex gap-3 xl:gap-3.5">
                                <span className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-surface shadow-card grid place-items-center text-accent transition-transform duration-300 group-hover:-translate-y-0.5">
                                    <item.icon className="w-4 h-4" strokeWidth={1.8} />
                                </span>

                                <div className="min-w-0">
                                    <p className="font-display font-semibold text-[15px] xl:text-[15.5px] leading-snug tracking-[-0.02em] text-ink">
                                        {item.said}
                                    </p>
                                    {/*
                                      * Always here, tighter where the window
                                      * is short.
                                      *
                                      * This used to be hidden below a certain
                                      * window size to keep the buttons on the
                                      * first screen, which solved a layout
                                      * problem by deleting the argument. The
                                      * type steps down on a short screen
                                      * instead, and the row below it fits two
                                      * buttons however narrow the column gets.
                                      */}
                                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft
                                        [@media(max-height:860px)]:text-[12.5px] [@media(max-height:860px)]:leading-[1.5]">
                                        {item.answer}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* ---- everything you can do, bottom right ---- */}
                <div
                    data-hero-line
                    className="order-4 xl:order-none relative z-10 mt-8 xl:mt-auto mb-12 xl:mb-10 xl:mb-14
                        flex flex-col items-stretch xl:items-end gap-3.5 xl:gap-4
                        xl:w-[27vw] 2xl:w-[25vw] xl:max-w-[30rem] xl:min-w-0 xl:self-end"
                >
                    {/* The question standing between a visitor and everything
                        else, asked where a delivery app asks it */}
                    <div className="w-full xl:mt-1 flex xl:justify-end">
                        <AreaBar />
                    </div>

                    <div className="flex flex-nowrap w-full xl:justify-end gap-2.5">
                        <a
                            href={WHATSAPP_LINK}
                            target="_blank"
                            rel="noreferrer"
                            className="group inline-flex flex-1 xl:flex-none items-center justify-center gap-2 h-12 px-5 rounded-full bg-brand text-white font-semibold text-[14.5px] whitespace-nowrap hover:bg-brand-deep transition-colors"
                        >
                            <WhatsAppMark className="w-[17px] h-[17px] transition-transform duration-300 group-hover:scale-110" />
                            Book on WhatsApp
                        </a>

                        <Link
                            to="/how-it-works"
                            className="group inline-flex flex-1 xl:flex-none items-center justify-center gap-2 h-12 px-5 rounded-full bg-surface shadow-card font-semibold text-[14.5px] whitespace-nowrap hover:shadow-lift transition-all duration-300"
                        >
                            How it works
                            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
};
