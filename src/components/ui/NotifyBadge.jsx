import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

/**
 * How many things are waiting on a tab or a nav item.
 *
 * It is always a bell and always red. A bare number sitting next to a label
 * reads as part of the label - "Wallet 3" looks like a heading rather than
 * three things somebody has to do - and these screens carry plenty of grey
 * and amber figures already, none of which mean "come and deal with this".
 *
 * The number swaps with a short pop and the bell nudges when the count goes
 * up. Only up: something being cleared does not need to pull the eye back.
 *
 * Nothing here polls or counts anything itself; it renders whatever the
 * caller hands it, and the caller takes it from one server figure so a tab
 * knows what is waiting on it without anyone having to open it.
 */
const NotifyBadge = ({ count = 0, className = "" }) => {
    const [pop, setPop] = useState(false);
    const previous = useRef(count);

    useEffect(() => {
        if (count > previous.current) {
            setPop(true);
            const t = setTimeout(() => setPop(false), 600);
            previous.current = count;
            return () => clearTimeout(t);
        }
        previous.current = count;
    }, [count]);

    if (!count) return null;

    return (
        <span
            aria-label={count + " waiting"}
            className={
                "inline-flex items-center gap-0.5 rounded-full font-bold tabular-nums " +
                "bg-red-600 text-white shadow-sm pl-1 pr-1.5 py-[1px] text-[11px] leading-none " +
                "transition-transform duration-300 ease-out " +
                (pop ? "scale-125" : "scale-100") + " " + className
            }
        >
            <Bell className={"w-3 h-3 shrink-0 " + (pop ? "animate-[wiggle_0.6s_ease-in-out]" : "")} />
            {/* Keyed on the value so React swaps the element and the fade
                actually plays, instead of mutating the text in place */}
            <span key={count} className="animate-[popIn_0.3s_ease-out]">
                {count > 99 ? "99+" : count}
            </span>
        </span>
    );
};

export default NotifyBadge;
