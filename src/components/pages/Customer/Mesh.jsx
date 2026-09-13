/**
 * The colour behind a masthead, as one merged shape.
 *
 * The diagonal weave this replaces was the company mark spread thin, and at
 * the size a background needs it stopped reading as stripes and started
 * reading as scratches on the screen - which is the last thing a page about
 * careful work should look like.
 *
 * This is drawn instead: four circles pushed through a blur and then a very
 * steep alpha curve, which is the classic SVG "goo" filter. The steep curve is
 * what does the work - it throws away the soft edges the blur created, so two
 * circles that overlap at all merge into one continuous form with a single
 * smooth outline, and two that do not stay apart. The result is a shape that
 * could not be made with gradients, and it costs one element.
 *
 * Everything is in the brand's own variables, so it follows the page into the
 * dark, and the whole thing is masked away at the edges so no hard circle ever
 * meets the end of a band.
 */
export const Mesh = ({ tone = "light", className = "" }) => {
    const alpha = tone === "dark" ? 0.5 : 0.26;

    return (
        <div
            aria-hidden
            className={"pointer-events-none absolute inset-0 overflow-hidden " + className}
            style={{
                maskImage: "radial-gradient(ellipse 85% 80% at 60% 25%, #000 20%, transparent 100%)",
                WebkitMaskImage: "radial-gradient(ellipse 85% 80% at 60% 25%, #000 20%, transparent 100%)",
            }}
        >
            <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 1200 620"
                preserveAspectRatio="xMidYMid slice"
            >
                <defs>
                    <filter id="cg-merge" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="48" result="soft" />
                        {/* The steep alpha ramp. Without it this is four blurred
                            blobs; with it they fuse where they touch */}
                        <feColorMatrix
                            in="soft"
                            type="matrix"
                            values="1 0 0 0 0
                                    0 1 0 0 0
                                    0 0 1 0 0
                                    0 0 0 26 -13"
                        />
                    </filter>
                </defs>

                <g filter="url(#cg-merge)" opacity={alpha}>
                    <circle className="cg-mesh-a" cx="820" cy="170" r="190" fill="var(--color-accent)" />
                    <circle className="cg-mesh-b" cx="1010" cy="300" r="140" fill="var(--color-accent)" />
                    <circle className="cg-mesh-b" cx="640" cy="330" r="120" fill="var(--color-brand)" />
                    <circle className="cg-mesh-a" cx="180" cy="430" r="160" fill="var(--color-warn)" />
                </g>
            </svg>
        </div>
    );
};
