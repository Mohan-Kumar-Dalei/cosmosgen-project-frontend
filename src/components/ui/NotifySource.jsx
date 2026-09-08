import { ChevronRight } from "lucide-react";

const CHIPS = {
    new: "bg-brand text-white",
    alert: "bg-warn text-white",
    done: "bg-ink text-white",
    error: "bg-red-600 text-white",
    info: "bg-sunken text-ink",
};

/**
 * Where a notification came from, shown above its message.
 *
 * "Ticket cancelled" on its own left people hunting through five tabs for the
 * thing that had just changed, so every card names its screen and the tab
 * inside it. The toast's own action button is what takes them there.
 */
const NotifySource = ({ tone, panel, tab, description }) => (
    <span className="block">
        {(panel || tab) && (
            <span className="flex items-center gap-1.5 mb-1 text-[10px] font-bold uppercase tracking-wider">
                {panel && (
                    <span className={"px-1.5 py-0.5 rounded " + (CHIPS[tone] || CHIPS.info)}>
                        {panel}
                    </span>
                )}
                {tab && (
                    <span className="flex items-center gap-0.5 text-ink-faint truncate">
                        <ChevronRight className="w-2.5 h-2.5 shrink-0" />
                        {tab}
                    </span>
                )}
            </span>
        )}
        {description && <span className="block">{description}</span>}
    </span>
);

export default NotifySource;
