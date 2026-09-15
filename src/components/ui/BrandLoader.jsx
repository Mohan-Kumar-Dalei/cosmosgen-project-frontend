import { ik, LOGO } from "../pages/Customer/brand";

/**
 * The wait that covers a whole screen, with the company's name on it.
 *
 * There were two of these before, written months apart and looking it: a thin
 * grey ring on the customer side, a thick green one on the office side, both
 * saying "Loading..." in a different weight. Neither said whose product was
 * loading, which is the one thing a full screen of nothing should say.
 *
 * So it is the mark with a bar travelling underneath it, the same shape the
 * Android app shows while it starts - a person moving between the phone and
 * the website should recognise the same moment in both.
 *
 * A bar rather than a spinner on purpose. A ring chasing its own tail reads as
 * a machine thinking; a bar crossing a track reads as progress, even when it
 * is honest enough not to claim a percentage.
 *
 * Deliberately only for a screen with nothing on it yet. A button that is busy
 * says so on itself, and a list that is refreshing keeps the rows it already
 * had - covering either of those with this would be taking away something the
 * reader can still use.
 */
export const BrandLoader = ({ label = "Loading" }) => (
    <div
        role="status"
        aria-live="polite"
        className="min-h-screen bg-canvas grid place-items-center px-6"
    >
        <div className="flex flex-col items-center">
            <img
                src={ik(LOGO, "w-96")}
                alt=""
                width={44}
                height={44}
                className="w-11 h-11 object-contain"
            />

            <span className="mt-4 font-display font-semibold text-[15px] tracking-tight text-ink">
                Cosmosgen
            </span>

            {/* The track stays put; the fill crosses it. Sized in the class so
                the bar is the same width whatever the label says. */}
            <span
                aria-hidden
                className="mt-4 block w-[132px] h-[3px] rounded-full bg-hairline overflow-hidden"
            >
                <span className="cg-loadbar block h-full w-1/3 rounded-full bg-accent" />
            </span>

            <span className="mt-3 text-[12.5px] text-ink-faint">{label}</span>
        </div>
    </div>
);
