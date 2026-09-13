/**
 * The colour behind everything.
 *
 * A flat ground is honest but inert, and this company is asking somebody to
 * hand over their address and their afternoon. Three very soft orbs of the
 * brand's own colours, drifting slowly, give a page depth without putting
 * another box on it - which matters here, because the whole point of the
 * layout is that it is not made of boxes.
 *
 * The colours come from the theme's own variables rather than from hex
 * written here, so the field follows the page into the dark: the accent and
 * the green are both lifted there, and a hard-coded #0f78d0 would have gone
 * muddy the moment the ground did.
 *
 * Held deliberately faint. If a reader can name the shapes, they are too
 * strong; they should only notice that the page is not flat.
 */
const FIELDS = {
    // Behind a masthead: one large mass high and centre, a green echo to one
    // side, and a warm one so the pair does not read as a corporate gradient
    hero: [
        { ink: "var(--color-accent)", opacity: 0.2, size: 760, top: "-24%", left: "50%", drift: "a", seconds: 27 },
        { ink: "var(--color-brand)", opacity: 0.14, size: 500, top: "44%", left: "82%", drift: "b", seconds: 32 },
        { ink: "var(--color-warn)", opacity: 0.1, size: 460, top: "30%", left: "-10%", drift: "b", seconds: 36 },
    ],

    // Inside a band further down, where it must not compete with the words
    // sitting on top of it
    band: [
        { ink: "var(--color-accent)", opacity: 0.1, size: 540, top: "-22%", left: "-6%", drift: "b", seconds: 33 },
        { ink: "var(--color-brand)", opacity: 0.09, size: 440, top: "58%", left: "80%", drift: "a", seconds: 29 },
    ],

    // On the near-black panel, where the same colours have to lift rather
    // than tint
    dark: [
        { ink: "var(--color-accent)", opacity: 0.22, size: 580, top: "-28%", left: "62%", drift: "a", seconds: 30 },
        { ink: "var(--color-brand)", opacity: 0.16, size: 460, top: "46%", left: "-8%", drift: "b", seconds: 36 },
    ],
};

/**
 * The orbs stop short of the bottom of whatever they decorate.
 *
 * The page ends in a 34px curve, and the band that happens to be last has its
 * own orbs in it. One of them is the company's green, it sits at the left, and
 * the only part of it anybody ever really saw was the piece caught inside that
 * curve - which read as a green stain on the corner rather than as a tint on
 * the band. Held back by a little under an inch it never reaches the corner,
 * and on every band above it the difference is invisible: an orb is a radial
 * gradient that has faded to nothing long before its own edge.
 *
 * The footer needs the opposite of this - its curve is at the top, cut into it
 * by the sheet above - so it passes the inset the other way round.
 */
export const Blobs = ({ field = "band", className = "", top = 0, bottom = 48 }) => (
    <div
        aria-hidden
        className={"pointer-events-none absolute left-0 right-0 overflow-hidden " + className}
        style={{ top, bottom }}
    >
        {(FIELDS[field] || FIELDS.band).map((b, i) => (
            <span
                key={i}
                className={"cg-blob cg-drift-" + b.drift}
                style={{
                    width: b.size,
                    height: b.size,
                    top: b.top,
                    left: b.left,
                    animationDuration: b.seconds + "s",
                    // Radial rather than a blur filter: the same softness, and
                    // none of the cost of blurring a 700px layer on a phone
                    background: "radial-gradient(closest-side, " + b.ink + ", transparent)",
                    opacity: b.opacity,
                }}
            />
        ))}
    </div>
);
