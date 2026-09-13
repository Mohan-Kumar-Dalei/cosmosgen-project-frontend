import { Link } from "react-router-dom";
import { ArrowUpRight, Check, Loader2, Sparkles } from "lucide-react";
import { Art } from "./Art";
import { tintFor } from "./brand";
import { useArea } from "./area";
import { ICONS, blurbFor, imageFor, useCatalogue } from "./catalogue";

/**
 * What the company does, as a list rather than as a wall of boxes.
 *
 * Four services in four bordered cards makes the page look like a settings
 * screen: every item gets the same frame, so nothing is more important than
 * anything else and the eye has nowhere to land. A list has a reading order
 * built into it. The separation between rows comes from space and from the
 * wash that follows the cursor, not from a rule under each one - lines stack
 * up fast on a page that already has a header, a footer and section edges.
 */
const Cover = ({ row, radiusKm }) => {
    if (!row) return null;

    if (!row.available) {
        return (
            <span className="inline-flex items-center h-[22px] px-2.5 rounded-full bg-warn-tint text-warn text-[11px] font-semibold">
                Not here yet
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1 h-[22px] pl-1.5 pr-2.5 rounded-full bg-brand-tint text-brand-deep text-[11px] font-semibold">
            <Check className="w-3 h-3" strokeWidth={3} />
            {row.nearestKm !== null && row.nearestKm !== undefined
                ? row.nearestKm + " km away"
                : "Within " + radiusKm + " km"}
        </span>
    );
};

/**
 * `onPick` turns each row from a link into a control.
 *
 * On the services page the rows used to link to the services page - so a click
 * reloaded the same page and looked, correctly, like nothing had happened.
 * There the row's job is to open that trade in the browser further down, which
 * is a thing this component cannot do and its parent can.
 */
export const ServiceList = ({ onPick }) => {
    const { services, loading, failed } = useCatalogue();
    const { known, cover, radiusKm } = useArea();

    if (loading) {
        return (
            <div className="py-16 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-ink-faint" />
            </div>
        );
    }

    /*
     * A failure here is not worth a red box on a page somebody is reading to
     * decide whether to trust us. They lose nothing they came for - the number
     * to message is in the header and the footer either way.
     */
    if (failed || !services.length) {
        return (
            <p className="py-10 text-sm text-ink-soft">
                Our service list is not loading just now. Message us and we will tell you
                whether it is something we cover.
            </p>
        );
    }

    return (
        <div data-stagger className="flex flex-col">
            {services.map((service, i) => {
                const Icon = ICONS[service.key] || Sparkles;
                const row = known ? cover(service.key) : null;

                const covers = service.appliances?.length
                    ? service.appliances.length + " appliances"
                    : (service.issues?.length || 0) + " common jobs";

                const Row = onPick ? "button" : Link;
                const rowProps = onPick
                    ? { type: "button", onClick: () => onPick(service.key) }
                    : { to: "/services" };

                return (
                    <Row
                        key={service.key}
                        {...rowProps}
                        className="group relative flex w-full items-center gap-5 sm:gap-7 rounded-3xl px-4 sm:px-6 py-5 sm:py-6 text-left transition-colors duration-300 hover:bg-surface"
                    >
                        <Art
                            src={imageFor(service)}
                            alt=""
                            icon={Icon}
                            tr="w-320"
                            fit="contain"
                            tint={tintFor(i)}
                            // Shaped like the drawing it holds. These are little scenes -
                            // an engineer with three machines around him - and a
                            // square crops that down to a thumbnail of somebody's
                            // shoulder
                            className="shrink-0 w-[100px] h-[122px] sm:w-[128px] sm:h-[156px] rounded-2xl transition-transform duration-500 group-hover:-translate-y-1"
                        />

                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                <h3 className="font-display font-semibold text-[19px] sm:text-[22px] leading-tight tracking-[-0.02em]">
                                    {service.label}
                                </h3>
                                <Cover row={row} radiusKm={radiusKm} />
                            </div>

                            <p className="mt-1.5 text-[13.5px] sm:text-[14.5px] leading-relaxed text-ink-soft max-w-xl">
                                {blurbFor(service)}
                            </p>

                            <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">
                                {covers}
                            </p>
                        </div>

                        {/* Sits still until the row is wanted, then steps out to
                            meet the cursor. The row is the target, not this - so
                            it must never look like a separate button */}
                        <span className="hidden sm:grid shrink-0 w-11 h-11 place-items-center rounded-full text-ink-faint transition-all duration-300 group-hover:bg-accent group-hover:text-white group-hover:-translate-y-0.5">
                            <ArrowUpRight className="w-[18px] h-[18px]" />
                        </span>
                    </Row>
                );
            })}
        </div>
    );
};
