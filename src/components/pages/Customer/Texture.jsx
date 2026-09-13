/**
 * The pattern behind a band.
 *
 * Drawn in CSS rather than fetched. An image is the one part of a page that
 * can quietly stop working - a link rots, a licence changes, a CDN is slow on
 * the connection somebody actually has - and a background is the last place
 * worth taking that risk. These weigh nothing, print at any size, and follow
 * the theme because their ink is a variable.
 *
 * "dots" is the quiet one for long reading sections; "grid" suits anything
 * that is itself laid out on a grid; "weave" is two sets of hairlines at
 * opposing angles, kept for the bands about the assistant so that offer looks
 * the same wherever it turns up. A third, a fine diagonal hatch taken
 * from the logo, was removed: at the size a background needs it stopped
 * reading as stripes and started reading as scratches on the screen.
 *
 * All three fade out downward so a band ends softly instead of stopping at the
 * line where the tiling runs out.
 */
export const Pattern = ({ kind = "dots", fade = "bottom", className = "" }) => (
    <div
        aria-hidden
        className={"pointer-events-none absolute inset-0 cg-" + kind
            + (fade === "radial" ? " cg-fade-radial" : fade === "none" ? "" : " cg-fade-b")
            + " " + className}
    />
);

