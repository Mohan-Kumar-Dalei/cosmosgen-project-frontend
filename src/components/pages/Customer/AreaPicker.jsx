import { useEffect, useRef, useState } from "react";
import { MapPin, ChevronDown, Crosshair, Loader2, Search, X } from "lucide-react";
import { useArea } from "./area";

/**
 * The control that answers "do you even come to my street".
 *
 * It sits in the header the way a delivery app's address does, because that is
 * the first thing anybody checks and the last thing they want to hunt for. Two
 * ways in: the browser's own location, or a town typed by hand - the second
 * exists because a good half of people refuse the first, and because somebody
 * arranging a repair at their parents' house is not standing in it.
 */
export const AreaPill = () => {
    const { place, status, known } = useArea();
    const [open, setOpen] = useState(false);
    const box = useRef(null);

    // Clicking anywhere else closes it. Without this the panel follows the
    // reader down the page and has to be dismissed with the same button,
    // which nobody expects of a dropdown.
    useEffect(() => {
        if (!open) return undefined;
        const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", away);
        return () => document.removeEventListener("mousedown", away);
    }, [open]);

    const busy = status === "locating" || status === "loading";
    const label = known ? (place.label || place.city || place.state) : "Set your area";

    return (
        <div className="relative" ref={box}>
            <button
                onClick={() => setOpen((v) => !v)}
                className="inline-flex shrink-0 items-center gap-1.5 h-9 pl-2.5 pr-2 rounded-full text-[13px] font-medium max-w-[150px] xl:max-w-[190px] whitespace-nowrap text-ink-soft hover:bg-sunken transition-colors"
            >
                {busy
                    ? <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                    : <MapPin className={"w-3.5 h-3.5 shrink-0 " + (known ? "text-accent" : "")} />}
                <span className="truncate">{label}</span>
                <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-60" />
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-[300px] rounded-2xl border border-hairline bg-surface shadow-lift p-4 z-50">
                    <AreaForm onDone={() => setOpen(false)} />
                </div>
            )}
        </div>
    );
};

/**
 * The same two controls, on their own, for a page that wants to ask in the
 * body rather than in the header.
 */
export const AreaForm = ({ onDone }) => {
    const { detect, search, status, error, place, known, total, radiusKm, forget } = useArea();
    const [term, setTerm] = useState("");

    const busy = status === "locating" || status === "loading";

    const submit = async (e) => {
        e.preventDefault();
        const ok = await search(term);
        if (ok && onDone) onDone();
    };

    return (
        <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">
                Your area
            </p>

            {known && (
                <div className="mt-3 flex items-start justify-between gap-3">
                    <div>
                        <p className="font-display font-semibold text-[15px] tracking-[-0.01em]">
                            {place.label || place.city}
                        </p>
                        <p className="mt-0.5 text-[12.5px] text-ink-soft">
                            {total > 0
                                ? total + " engineer" + (total === 1 ? "" : "s") + " within " + radiusKm + " km"
                                : "Nobody within " + radiusKm + " km yet"}
                        </p>
                    </div>
                    <button
                        onClick={forget}
                        className="shrink-0 w-7 h-7 grid place-items-center rounded-full text-ink-faint hover:bg-sunken"
                        aria-label="Clear the area"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            <button
                onClick={() => { detect(); }}
                disabled={busy}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 h-10 rounded-full bg-accent text-white text-[13.5px] font-semibold hover:bg-accent-deep disabled:opacity-60 transition-colors"
            >
                {status === "locating"
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Crosshair className="w-4 h-4" />}
                {known ? "Use my location again" : "Use my location"}
            </button>

            <div className="my-3 flex items-center gap-3 text-[11px] text-ink-faint">
                <span className="h-px flex-1 bg-hairline" />
                or
                <span className="h-px flex-1 bg-hairline" />
            </div>

            <form onSubmit={submit} className="flex items-center gap-2">
                {/*
                  * `min-w-0` on the box, not only on the input inside it.
                  *
                  * A flex item will not shrink below its own content unless it
                  * is told it may, and the default is `min-width: auto`. The
                  * input had that permission; the rounded box around it did
                  * not - so the box held itself at the width of its icon plus
                  * "Town or pincode", the row came out wider than the 300px
                  * panel, and the Check button was pushed off the right edge
                  * and clipped. It looked like the whole row had drifted left.
                  */}
                <div className="min-w-0 flex-1 flex items-center gap-2 h-10 px-3 rounded-full border border-hairline-strong focus-within:border-accent transition-colors">
                    <Search className="w-3.5 h-3.5 text-ink-faint shrink-0" />
                    <input
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        placeholder="Town or pincode"
                        className="flex-1 min-w-0 bg-transparent text-[13.5px] outline-none placeholder:text-ink-faint"
                    />
                </div>
                <button
                    type="submit"
                    disabled={busy || !term.trim()}
                    className="shrink-0 h-10 px-4 rounded-full border border-hairline-strong text-[13px] font-semibold hover:bg-sunken disabled:opacity-50 transition-colors"
                >
                    Check
                </button>
            </form>

            {error && <p className="mt-3 text-[12.5px] text-warn leading-relaxed">{error}</p>}

            <p className="mt-3 text-[11.5px] leading-relaxed text-ink-faint">
                Used only to tell you what we cover. Where the engineer actually comes is the
                pin you drop when you book.
            </p>
        </div>
    );
};

/**
 * The same question as one bar, for a hero.
 *
 * A delivery app puts its address field across the top of the first screen
 * because that is the question standing between a visitor and everything else.
 * This is that bar: the browser's own location on the left, a town typed on
 * the right, and once it is settled the bar stops being a form and becomes the
 * answer.
 */
export const AreaBar = ({ onDark }) => {
    const { detect, search, status, error, place, known, total, radiusKm, covered, forget } = useArea();
    const [term, setTerm] = useState("");

    const busy = status === "locating" || status === "loading";

    if (known) {
        return (
            <div>
                <div className="inline-flex flex-wrap items-center gap-x-4 gap-y-2 rounded-full bg-surface shadow-lift pl-5 pr-2 py-2">
                    <span className="inline-flex items-center gap-2 text-[14px]">
                        <MapPin className="w-4 h-4 text-accent shrink-0" />
                        <span className="font-semibold">{place.label || place.city}</span>
                        <span aria-hidden className="text-ink-faint">·</span>
                        <span className={covered ? "text-ink-soft" : "text-warn"}>
                            {covered
                                ? total + " engineer" + (total === 1 ? "" : "s") + " within " + radiusKm + " km"
                                : "nobody within " + radiusKm + " km yet"}
                        </span>
                    </span>

                    <button
                        onClick={forget}
                        className="h-9 px-4 rounded-full text-[13px] font-semibold text-ink-soft hover:bg-sunken hover:text-ink transition-colors"
                    >
                        Change
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <form
                onSubmit={(e) => { e.preventDefault(); search(term); }}
                className="flex items-center gap-1 rounded-full bg-surface shadow-lift p-1.5 max-w-lg"
            >
                <button
                    type="button"
                    onClick={detect}
                    disabled={busy}
                    className="group shrink-0 inline-flex items-center gap-2 h-11 pl-4 pr-4 rounded-full text-[13.5px] font-semibold text-ink-soft hover:bg-sunken hover:text-ink transition-colors disabled:opacity-60"
                >
                    {status === "locating"
                        ? <Loader2 className="w-4 h-4 animate-spin text-accent" />
                        : <Crosshair className="w-4 h-4 text-accent transition-transform duration-500 group-hover:rotate-90" />}
                    <span className="hidden sm:inline">My location</span>
                </button>

                <span aria-hidden className="w-px h-6 bg-hairline shrink-0" />

                <input
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="or type a town"
                    className="flex-1 min-w-0 h-11 px-3 bg-transparent text-[14px] outline-none placeholder:text-ink-faint"
                />

                <button
                    type="submit"
                    disabled={busy || !term.trim()}
                    className="shrink-0 h-11 px-5 rounded-full bg-accent text-white text-[13.5px] font-semibold hover:bg-accent-deep disabled:opacity-40 transition-colors"
                >
                    Check
                </button>
            </form>

            {error && (
                <p className={"mt-3 text-[12.5px] leading-relaxed " + (onDark ? "text-white/60" : "text-warn")}>
                    {error}
                </p>
            )}
        </div>
    );
};
