import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode, Mousewheel, Navigation, Pagination } from "swiper/modules";
import { ArrowRight, ArrowLeft, Check, Sparkles } from "lucide-react";
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Art } from "./Art";
import { tintFor } from "./brand";
import { useArea } from "./area";
import { ICONS, imageFor, blurbFor, useCatalogue } from "./catalogue";

/**
 * The work, on a shelf you push along.
 *
 * A four-across grid says "here is all of it, that is the whole company". A
 * shelf that runs past the edge of the screen says there is more where that
 * came from - which is truer, because the catalogue is the office's to grow.
 *
 * Swiper rather than a scroll box with snap points on it. The hand-rolled
 * version worked on a phone and was poor everywhere else: no way to move it
 * with a trackpad sideways, no arrows, and a scrollbar sitting under the
 * tiles. This gives it momentum, arrows that know when they have run out of
 * shelf, and a slide count that follows the width instead of being guessed at
 * three breakpoints.
 */
export const ServiceShelf = () => {
    const { services, loading, failed } = useCatalogue();
    const { known, cover } = useArea();

    if (loading) {
        return (
            <div className="flex gap-4 overflow-hidden">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="cg-skeleton shrink-0 w-[248px] sm:w-[292px] aspect-[4/5] rounded-[26px]" />
                ))}
            </div>
        );
    }

    if (failed || !services.length) return null;

    return (
        <div className="relative group/shelf">
            <Swiper
                modules={[FreeMode, Mousewheel, Navigation, Pagination]}
                /*
                 * Not a carousel of equal tiles.
                 *
                 * Two versions came before this. A flat row of five identical
                 * cards read as filler - nothing said where to look. Coverflow
                 * fixed that and broke something worse: with the cards left
                 * aligned, the one nearest the screen's centre came forward,
                 * so the first card - the one a reader looks at first - was
                 * the one pushed furthest back.
                 *
                 * What is left is the thing that actually made a shelf read as
                 * designed: a rhythm. Every second card hangs lower, each
                 * carries its own number, and the run is free to be thrown
                 * with a thumb. Nothing is scaled or dimmed, so all five stay
                 * equally readable, which is the point of showing them at all.
                 */
                slidesPerView="auto"
                spaceBetween={18}
                grabCursor
                freeMode={{ enabled: true, momentumBounce: false }}
                // Sideways only: a vertical wheel over the shelf should scroll
                // the page, not drag the shelf and trap the reader on it
                mousewheel={{ forceToAxis: true }}
                navigation={{ prevEl: ".cg-shelf-prev", nextEl: ".cg-shelf-next" }}
                pagination={{ el: ".cg-shelf-rail", type: "progressbar" }}
                // The drop on every second card is a stylesheet rule rather than a
                // style prop: Swiper rewrites each slide's inline style to set
                // its own margin, and takes anything else there with it
                className="cg-shelf-run !px-1 !-mx-1 !pb-12 !overflow-hidden"
                watchOverflow
            >
                {services.map((service, i) => {
                    const Icon = ICONS[service.key] || Sparkles;
                    const row = known ? cover(service.key) : null;

                    const covers = service.appliances?.length
                        ? service.appliances.length + " appliances"
                        : (service.issues?.length || 0) + " jobs";

                    return (
                        <SwiperSlide
                            key={service.key}
                            className="!w-[248px] sm:!w-[292px] !h-auto"
                        >
                            <Link
                                to="/services"
                                className="group relative block rounded-[26px] bg-canvas border border-hairline overflow-hidden transition-shadow duration-300 [.swiper-slide-active_&]:shadow-lift hover:shadow-lift"
                            >
                                <Art
                                    src={imageFor(service)}
                                    alt=""
                                    icon={Icon}
                                    tr="w-620"
                                    fit="contain"
                                    tint={tintFor(i)}
                                    className="w-full aspect-[4/3.7]"
                                    imgClassName="transition-transform duration-500 group-hover:scale-[1.05] origin-bottom"
                                />

                                {row && (
                                    <span
                                        className={"absolute left-3.5 top-3.5 inline-flex items-center gap-1 h-[23px] pl-1.5 pr-2.5 rounded-full text-[11px] font-semibold "
                                            + (row.available ? "bg-brand-tint text-brand-deep" : "bg-warn-tint text-warn")}
                                    >
                                        {row.available && <Check className="w-3 h-3" strokeWidth={3} />}
                                        {row.available
                                            ? (row.nearestKm !== null && row.nearestKm !== undefined
                                                ? row.nearestKm + " km"
                                                : "Covered")
                                            : "Not here yet"}
                                    </span>
                                )}

                                <span
                                    aria-hidden
                                    className="absolute right-4 top-3 font-display font-bold text-[40px] leading-none tracking-[-0.06em] text-ink/[0.07] tabular-nums"
                                >
                                    {String(i + 1).padStart(2, "0")}
                                </span>

                                <div className="px-5 pt-4 pb-5">
                                    <h3 className="font-display font-semibold text-[17px] leading-snug tracking-[-0.02em]">
                                        {service.label}
                                    </h3>

                                    <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft line-clamp-2 min-h-[2.6em]">
                                        {blurbFor(service)}
                                    </p>

                                    <p className="mt-3 flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                                        {covers}
                                        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                                    </p>
                                </div>
                            </Link>
                        </SwiperSlide>
                    );
                })}

                {/* The end of the shelf, which is also the way off it */}
                <SwiperSlide
                    className="!w-[210px] sm:!w-[230px] !h-auto"
                >
                    <Link
                        to="/services"
                        className="group h-full flex flex-col justify-center rounded-[26px] bg-canvas border border-hairline text-center px-6 py-8 transition-shadow duration-300 [.swiper-slide-active_&]:shadow-lift hover:shadow-lift"
                    >
                        <span className="mx-auto w-11 h-11 grid place-items-center rounded-full bg-accent-tint text-accent transition-transform duration-300 group-hover:translate-x-1">
                            <ArrowRight className="w-5 h-5" />
                        </span>
                        <span className="mt-4 block font-display font-semibold text-[16px] tracking-[-0.02em]">
                            What each one covers
                        </span>
                        <span className="mt-1.5 block text-[13px] leading-relaxed text-ink-soft">
                            Every machine and every fault we are called out for
                        </span>
                    </Link>
                </SwiperSlide>
            </Swiper>

            {/* How far along the shelf you are. A carousel with no sense of
                its own length is a carousel people stop pushing. */}
            <div className="cg-shelf-rail relative -mt-3 mx-auto max-w-[320px] !h-[3px] rounded-full bg-hairline overflow-hidden" />

            {/* Arrows on the desktop, where there is no thumb to push with.
                Swiper disables them at each end on its own. */}
            <button
                aria-label="Back"
                className="cg-shelf-prev hidden lg:grid absolute left-2 top-[40%] z-10 w-11 h-11 place-items-center rounded-full bg-surface shadow-lift text-ink opacity-100 transition-all duration-300 hover:-translate-y-0.5 disabled:!opacity-0"
            >
                <ArrowLeft className="w-4 h-4" />
            </button>
            <button
                aria-label="Forward"
                className="cg-shelf-next hidden lg:grid absolute right-2 top-[40%] z-10 w-11 h-11 place-items-center rounded-full bg-surface shadow-lift text-ink opacity-100 transition-all duration-300 hover:-translate-y-0.5 disabled:!opacity-0"
            >
                <ArrowRight className="w-4 h-4" />
            </button>
        </div>
    );
};
