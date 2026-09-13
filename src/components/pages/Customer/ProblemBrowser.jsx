import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Art } from "./Art";
import { APPLIANCE_IMAGE, tintFor } from "./brand";
import { useArea } from "./area";
import { ICONS, blurbFor, imageFor, useCatalogue } from "./catalogue";
import { useSwap } from "./motion";

/**
 * Everything we are actually called out for, one service at a time.
 *
 * The page used to answer this with the appliance list alone, which quietly
 * said the company was an appliance repair shop - the electrician, the plumber
 * and the cleaners were nowhere. Every service is here now, and the two shapes
 * the catalogue comes in are both handled: a service with machines under it
 * shows the machines and the faults reported on each, and a service without
 * shows the jobs themselves.
 *
 * Tabs rather than everything at once, because the whole list is sixty-odd
 * lines long. Somebody looking for their own problem wants one trade's worth
 * in front of them, not all of it.
 */
export const ProblemBrowser = ({ value, onChange }) => {
    const { services, loading, failed } = useCatalogue();
    const { known, cover, radiusKm } = useArea();

    /*
     * Controlled when a page hands in a choice, and perfectly happy on its own
     * when nothing does. The services page needs the first, because the list of
     * trades further up the page opens a tab down here - and the home page
     * needs the second, because there is nothing else on it to say which trade
     * somebody meant.
     */
    const [own, setOwn] = useState("");
    const chosen = value !== undefined ? value : own;
    const pick = onChange || setOwn;

    const active = services.find((s) => s.key === chosen) || services[0] || null;

    const panel = useSwap(active?.key);

    /*
     * The marker that slides between tabs.
     *
     * Measured rather than guessed, because these labels are service names and
     * a service the office renames would put a hand-tuned offset under the
     * wrong word. It is re-measured when the row resizes, which covers both a
     * window being dragged and the web font arriving late and changing every
     * label's width underneath it.
     */
    const bar = useRef(null);
    const tabs = useRef({});
    const [marker, setMarker] = useState(null);

    useLayoutEffect(() => {
        const place = () => {
            const el = tabs.current[active?.key];
            if (!el || !bar.current) return;
            setMarker({ left: el.offsetLeft, width: el.offsetWidth });
        };

        place();

        if (!bar.current || typeof ResizeObserver === "undefined") return undefined;
        const ro = new ResizeObserver(place);
        ro.observe(bar.current);
        return () => ro.disconnect();
    }, [active?.key, services.length]);

    // Fonts swap in after first paint and every label changes width with them
    useEffect(() => {
        if (!document.fonts?.ready) return;
        document.fonts.ready.then(() => {
            const el = tabs.current[active?.key];
            if (el) setMarker({ left: el.offsetLeft, width: el.offsetWidth });
        });
    }, [active?.key]);

    if (loading) {
        return (
            <div className="py-16 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-ink-faint" />
            </div>
        );
    }

    if (failed || !active) {
        return (
            <p className="py-10 text-sm text-ink-soft">
                The list is not loading just now. Message us and we will tell you straight
                away whether your problem is one we handle.
            </p>
        );
    }

    const Icon = ICONS[active.key] || Sparkles;
    const row = known ? cover(active.key) : null;
    const index = services.findIndex((s) => s.key === active.key);

    return (
        <div>
            <div
                ref={bar}
                className="relative inline-flex items-center gap-1 p-1 rounded-full bg-sunken max-w-full overflow-x-auto"
                role="tablist"
            >
                {marker && (
                    <span
                        aria-hidden
                        className="absolute top-1 bottom-1 rounded-full bg-ink transition-[left,width] duration-[420ms] ease-out"
                        style={{ left: marker.left, width: marker.width }}
                    />
                )}

                {services.map((s) => {
                    const on = s.key === active.key;
                    return (
                        <button
                            key={s.key}
                            ref={(el) => { tabs.current[s.key] = el; }}
                            role="tab"
                            aria-selected={on}
                            onClick={() => pick(s.key)}
                            className={"relative z-10 shrink-0 h-10 px-4 sm:px-5 rounded-full text-[13.5px] font-semibold whitespace-nowrap transition-colors duration-300 "
                                + (on ? "text-canvas" : "text-ink-soft hover:text-ink")}
                        >
                            {s.label}
                        </button>
                    );
                })}
            </div>

            <div ref={panel} className="mt-9 grid lg:grid-cols-[280px_1fr] gap-9 lg:gap-14 items-start">
                <div data-swap>
                    <Art
                        src={imageFor(active)}
                        alt={active.label}
                        icon={Icon}
                        tr="w-640"
                        fit="contain"
                        tint={tintFor(index)}
                        className="w-full aspect-[4/5] rounded-3xl"
                    />

                    <p className="mt-5 text-[14px] leading-relaxed text-ink-soft">
                        {blurbFor(active)}
                    </p>

                    {row && (
                        <p className="mt-3 text-[13px] font-semibold">
                            {row.available
                                ? <span className="text-brand-deep">
                                    {row.vendors} {row.vendors === 1 ? "engineer" : "engineers"} for this near you
                                </span>
                                : <span className="text-warn">
                                    Nobody for this within {radiusKm} km yet
                                </span>}
                        </p>
                    )}
                </div>

                {active.appliances?.length ? (
                    <div className="flex flex-col">
                        {active.appliances.map((a, i) => (
                            <div
                                key={a.key}
                                data-swap
                                className="group flex items-start gap-4 sm:gap-5 rounded-2xl px-3 sm:px-4 py-4 transition-colors duration-300 hover:bg-surface"
                            >
                                <Art
                                    src={a.image || APPLIANCE_IMAGE[a.key]}
                                    alt=""
                                    icon={Icon}
                                    tr="w-220"
                                    fit="contain"
                                    tint={tintFor(i)}
                                    className="shrink-0 w-[68px] h-[68px] rounded-xl transition-transform duration-500 group-hover:-translate-y-1"
                                />

                                <div className="min-w-0">
                                    <h3 className="font-display font-semibold text-[16.5px] tracking-[-0.01em]">
                                        {a.label}
                                    </h3>

                                    {/* Run together on one line rather than
                                        bulleted. Five faults as five list items
                                        turns a reassuring "yes, we see this all
                                        the time" into a form to be read */}
                                    <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">
                                        {a.issues.map((x) => x.label).join("  ·  ")}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 gap-x-6">
                        {active.issues.map((issue) => (
                            <div
                                key={issue.key}
                                data-swap
                                className="group flex items-center gap-3.5 rounded-2xl px-3 sm:px-4 py-3.5 transition-colors duration-300 hover:bg-surface"
                            >
                                <span
                                    aria-hidden
                                    className="shrink-0 w-2 h-2 rounded-full bg-accent/35 transition-all duration-300 group-hover:bg-accent group-hover:scale-125"
                                />
                                <span className="text-[15px] font-medium transition-transform duration-300 group-hover:translate-x-0.5">
                                    {issue.label}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
