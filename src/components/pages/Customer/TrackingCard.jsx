import { ik } from "./brand";
import { MapPin, ShieldCheck } from "lucide-react";
import { usePictures } from "./pictures";

/**
 * What the customer sees while somebody is on the way to them.
 *
 * The site can describe live tracking in a sentence, and a sentence is what
 * every company on the internet has. Showing it is different: this is the one
 * thing the product does that a reader can recognise on sight, so it is drawn
 * rather than claimed.
 *
 * Everything in it is marked as an example and nothing pretends to be live
 * data - no invented rating, no made-up distance passed off as real. The
 * route, the marker and the ticking minutes are an illustration of a screen,
 * which is exactly what the caption says.
 *
 * Drawn in SVG and CSS: a map tile would be a third-party request, a licence
 * and a thing that can fail, for a picture whose whole job is to say "this
 * works".
 */
export const TrackingCard = () => {
    const pics = usePictures();

    return (
        <figure className="m-0 w-full max-w-[380px] rounded-[28px] bg-surface shadow-lift overflow-hidden">
            {/* ---- who is coming ---- */}
            <div className="flex items-center gap-3 p-5">
                <span className="relative w-11 h-11 rounded-full bg-sunken grid place-items-center shrink-0">
                    <img src={ik(pics.LOGO, "w-96")} alt="" className="w-6 h-6 object-contain" loading="lazy" />
                    <span className="absolute -right-0.5 -bottom-0.5 w-4 h-4 rounded-full bg-brand grid place-items-center">
                        <ShieldCheck className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </span>
                </span>

                <div className="min-w-0">
                    <p className="font-display font-semibold text-[15px] tracking-[-0.01em]">
                        Your engineer is on the way
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-ink-soft">
                        Approved by the office · AC &amp; appliances
                    </p>
                </div>
            </div>

            {/* ---- the road ---- */}
            <div className="relative h-[186px] bg-sunken overflow-hidden">
                {/* Blocks first, then the grid over them: a map is buildings with
                    streets between, not graph paper with a line on it */}
                <svg
                    viewBox="0 0 380 186"
                    className="absolute inset-0 w-full h-full"
                    aria-hidden
                    preserveAspectRatio="none"
                >
                    <g fill="var(--color-hairline)" opacity="0.55">
                        <rect x="12" y="14" width="78" height="52" rx="6" />
                        <rect x="104" y="8" width="96" height="38" rx="6" />
                        <rect x="214" y="18" width="64" height="44" rx="6" />
                        <rect x="20" y="84" width="64" height="58" rx="6" />
                        <rect x="100" y="96" width="88" height="46" rx="6" />
                        <rect x="206" y="88" width="74" height="62" rx="6" />
                        <rect x="300" y="96" width="66" height="48" rx="6" />
                    </g>

                    <path
                        d="M28 158 C 96 158, 92 82, 154 78 C 218 74, 228 132, 288 120 C 312 116, 322 96, 328 72"
                        fill="none"
                        stroke="var(--color-hairline-strong)"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                    />
                    <path
                        className="cg-route"
                        d="M28 158 C 96 158, 92 82, 154 78 C 218 74, 228 132, 288 120 C 312 116, 322 96, 328 72"
                        fill="none"
                        stroke="var(--color-accent)"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                    />
                </svg>

                {/* The engineer, travelling the curve the road was drawn on, with
                    the ring a live position always has around it */}
                <span aria-hidden className="cg-runner">
                    <span className="relative block w-7 h-7">
                        <span className="cg-ping absolute inset-0 rounded-full bg-accent/30" />
                        <span className="relative block w-7 h-7 rounded-full bg-accent shadow-lift grid place-items-center">
                            <span className="block w-2.5 h-2.5 rounded-full bg-white" />
                        </span>
                    </span>
                </span>

                {/* Where they are going */}
                <span className="absolute right-[6%] top-[24%] flex items-center gap-2">
                    <span className="hidden sm:inline-flex items-center h-6 px-2.5 rounded-full bg-surface shadow-card text-[11px] font-semibold">
                        Your door
                    </span>
                    <span className="w-8 h-8 rounded-full bg-surface shadow-card grid place-items-center">
                        <MapPin className="w-4 h-4 text-brand" />
                    </span>
                </span>

                <span className="absolute left-3 bottom-3 inline-flex items-center h-6 px-2.5 rounded-full bg-surface/90 backdrop-blur-sm shadow-card text-[11px] font-semibold tabular-nums">
                    2.4 km away
                </span>
            </div>

            {/* ---- when, and what starts it ---- */}
            <div className="p-5 flex items-center justify-between gap-4">
                <div>
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-faint">
                        Arriving in
                    </p>
                    <p className="mt-1 font-display font-bold text-[22px] tabular-nums tracking-[-0.02em]">
                        12 min
                    </p>
                </div>

                <div className="text-right">
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-faint">
                        Your start code
                    </p>
                    <p className="mt-1 font-semibold text-[18px] tracking-[0.2em] text-accent tabular-nums">
                        482917
                    </p>
                </div>
            </div>

            <figcaption className="px-5 pb-5 text-[11.5px] leading-relaxed text-ink-faint">
                An illustration of the tracking screen, not a live job.
            </figcaption>
        </figure>
    );
};
