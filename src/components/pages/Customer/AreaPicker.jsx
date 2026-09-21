import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, ChevronDown, Crosshair, Loader2, Search, X } from "lucide-react";
import { api } from "../../services/api";
import { useArea } from "./area";

/** A fresh token, so Google bills a whole search as one session. */
const newSession = () => (
    typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : "s" + Date.now() + Math.random().toString(36).slice(2)
);

/**
 * A town, chosen rather than typed.
 *
 * The box used to take anything at all and the server took it at its word: it
 * title-cased whatever arrived and showed it back as the visitor's area, so
 * "asdf" became Asdf, a place we apparently do not cover. Nothing was wrong
 * with the answer - it was a real search that found nothing - but the question
 * was nonsense and nobody said so.
 *
 * Now it asks the same suggestion list the vendor's own form uses, and only a
 * row somebody picked is worth checking. Typing after picking un-picks, so a
 * half-edited name cannot be submitted as though it had been chosen.
 *
 * The session token groups a whole search into one charge from Google rather
 * than one per keystroke, exactly as it does on the vendor side.
 */
const useTowns = () => {
    const [term, setTerm] = useState("");
    const [list, setList] = useState([]);
    const [picked, setPicked] = useState(null);
    const [looking, setLooking] = useState(false);

    const session = useRef(newSession());
    const timer = useRef(null);
    const alive = useRef(true);

    useEffect(() => () => { alive.current = false; clearTimeout(timer.current); }, []);

    const type = useCallback((value) => {
        setTerm(value);
        setPicked(null);
        clearTimeout(timer.current);

        if (value.trim().length < 2) {
            setList([]);
            setLooking(false);
            return;
        }

        setLooking(true);
        timer.current = setTimeout(() => {
            api.get("/map/cities", { params: { q: value.trim(), session: session.current } })
                .then((res) => { if (alive.current) setList(res.data.data || []); })
                .catch(() => { if (alive.current) setList([]); })
                .finally(() => { if (alive.current) setLooking(false); });
        }, 300);
    }, []);

    const pick = useCallback((row) => {
        setTerm(row.city);
        setPicked(row);
        setList([]);
        // The chosen row closes the billing session; the next search starts a
        // new one, which is what Google charges for.
        session.current = newSession();
    }, []);

    const clear = useCallback(() => { setTerm(""); setPicked(null); setList([]); }, []);

    return { term, list, picked, looking, type, pick, clear };
};

/** The suggestion list, shared by both shapes of the control. */
const TownList = ({ rows, onPick, className = "" }) => {
    if (!rows.length) return null;

    return (
        <ul className={"absolute z-50 w-full mt-1 rounded-2xl border border-hairline bg-surface shadow-lift max-h-56 overflow-y-auto " + className}>
            {rows.map((row) => (
                <li
                    key={row.placeId || row.city + row.detail}
                    /*
                     * Stopped here, or the panel around this list closes on
                     * the way past.
                     *
                     * AreaPill watches mousedown on the document to shut
                     * itself when somebody clicks away, and it decides that by
                     * asking whether the clicked node is inside it. Picking a
                     * row empties the list first, so by the time that check
                     * runs the row has been unmounted - no longer inside
                     * anything - and a click squarely on the suggestion read
                     * as a click outside. The panel shut and nothing was
                     * chosen.
                     *
                     * preventDefault keeps the focus in the box as well, so
                     * the chosen name is there to edit rather than somewhere
                     * the caret has left.
                     */
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onPick(row); }}
                    className="px-3.5 py-2.5 hover:bg-sunken cursor-pointer flex gap-2.5 items-start transition-colors"
                >
                    <MapPin className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                    <div className="min-w-0">
                        <p className="text-[13.5px] font-medium text-ink truncate">{row.city}</p>
                        {(row.detail || row.state) && (
                            <p className="text-[11.5px] text-ink-faint mt-0.5 truncate">{row.detail || row.state}</p>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
};

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
    const towns = useTowns();

    const busy = status === "locating" || status === "loading";

    const submit = async (e) => {
        e.preventDefault();
        if (!towns.picked) return;
        const ok = await search(towns.picked.city);
        if (ok) { towns.clear(); if (onDone) onDone(); }
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
                <div className="relative min-w-0 flex-1">
                    <div className="flex items-center gap-2 h-10 px-3 rounded-full border border-hairline-strong focus-within:border-accent transition-colors">
                        {towns.looking
                            ? <Loader2 className="w-3.5 h-3.5 text-ink-faint shrink-0 animate-spin" />
                            : <Search className="w-3.5 h-3.5 text-ink-faint shrink-0" />}
                        <input
                            value={towns.term}
                            onChange={(e) => towns.type(e.target.value)}
                            autoComplete="off"
                            placeholder="Start typing a town"
                            className="flex-1 min-w-0 bg-transparent text-[13.5px] outline-none placeholder:text-ink-faint"
                        />
                    </div>
                    <TownList rows={towns.list} onPick={towns.pick} />
                </div>
                <button
                    type="submit"
                    disabled={busy || !towns.picked}
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
    const towns = useTowns();

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
                onSubmit={(e) => { e.preventDefault(); if (towns.picked) search(towns.picked.city); }}
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

                <div className="relative flex-1 min-w-0">
                    <input
                        value={towns.term}
                        onChange={(e) => towns.type(e.target.value)}
                        autoComplete="off"
                        placeholder="or start typing a town"
                        className="w-full h-11 px-3 bg-transparent text-[14px] outline-none placeholder:text-ink-faint"
                    />
                    <TownList rows={towns.list} onPick={towns.pick} />
                </div>

                <button
                    type="submit"
                    disabled={busy || !towns.picked}
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
