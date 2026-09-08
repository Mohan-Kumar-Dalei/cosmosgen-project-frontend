/**
 * The edge between the dark panel and the paper.
 *
 * A ruler-straight seam down the middle is the giveaway of a two-column
 * template - the two halves sit next to each other without ever meeting. This
 * carves an S through the boundary instead, so the panel leans into the paper
 * in two places and the paper takes a bite out of the panel between them.
 *
 * It is a clip path rather than an overlaid shape on purpose. An SVG laid over
 * the seam would have to be filled with a flat colour, and the panel is a
 * gradient - the join would show as a band. Clipping the panel itself means
 * the gradient, the corner squares and everything else simply end along the
 * curve.
 *
 * Coordinates are in objectBoundingBox units, so one path scales to any panel
 * width or height without a media query recomputing it.
 */
const SplitCurve = () => (
    <svg width="0" height="0" aria-hidden className="absolute pointer-events-none">
        <defs>
            {/* Wide screens: a diagonal swoop: full width at the top, cutting in
                across the middle, then a short kick back out at the foot.
                The first attempt wandered in and out twice and read as a
                wobble rather than a shape - a single arc is calmer and looks
                deliberate at any height. */}
            <clipPath id="cgSplitCurve" clipPathUnits="objectBoundingBox">
                <path d="M0,0 L1,0 C0.99,0.34 0.83,0.47 0.805,0.66 C0.785,0.83 0.86,0.9 0.84,1 L0,1 Z" />
            </clipPath>

            {/* Phones: the panel is a band, so the same swell runs along its
                bottom edge instead */}
            <clipPath id="cgSplitCurveDown" clipPathUnits="objectBoundingBox">
                <path d="M0,0 L1,0 L1,0.8 C0.74,1.01 0.5,0.84 0.26,0.93 C0.14,0.975 0.07,1 0,0.99 Z" />
            </clipPath>
        </defs>
    </svg>
);

export default SplitCurve;
