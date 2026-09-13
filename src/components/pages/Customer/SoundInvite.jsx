import { useEffect, useState } from "react";
import { Volume2, X } from "lucide-react";
import { declineSound, setSound, soundWasDeclined } from "./sound";

/**
 * The question the browser makes us ask, asked where the answer lives.
 *
 * Moving over a control and pressing one each answer with a short tone, and a
 * browser will not let a page make any sound at all until somebody has
 * interacted with it.
 * There is no way around that and there should not be: a page that makes a
 * noise nobody asked for is one people mute at the operating system, which
 * takes the video they were about to watch with it.
 *
 * What there was a way around is the version that pretended otherwise. The
 * switch used to come back on by itself after a reload, promising sound the
 * browser would not deliver: the speaker read "on", hovering did nothing, and
 * the first press let out every tone that had been queued behind the locked
 * clock. So the site starts silent and asks - and pressing the button in here
 * is itself the interaction the browser is waiting for, so sound works from
 * that press onwards with nothing owed.
 *
 * Deliberately a note under the speaker rather than a card in the middle of
 * the screen. It is a small offer, not an interruption, and pointing at the
 * control teaches where the setting lives - so the second time somebody wants
 * it they go to the bar instead of waiting to be asked.
 */
const GAP = 10;
const WIDTH = 272;

export const SoundInvite = () => {
    const [at, setAt] = useState(null);

    useEffect(() => {
        if (soundWasDeclined()) return undefined;

        /*
         * Asked on every load, and not only the first.
         *
         * There was a shortcut here that skipped this for anybody who had
         * turned sound on before, on the grounds that their next press would
         * do just as well. It was clever and it was wrong: the browser starts
         * every page silent whoever you are, so every page genuinely needs the
         * offer - and hiding it from exactly the people who had said yes meant
         * they were the ones who never saw it.
         *
         * "Not now" is still remembered for good. That is the only answer that
         * stops the question.
         */

        /*
         * Measured off the speaker itself, so the note sits under whatever the
         * bar happens to be doing at this width. On a phone the speaker is not
         * in the bar at all - it lives inside the menu - and there is nothing
         * to point at, so nothing is said. Touch has no hover to demonstrate
         * either, which makes that the right silence rather than a gap.
         */
        const place = () => {
            const toggle = document.querySelector("[data-sound-toggle]");
            if (!toggle || !toggle.offsetParent) return setAt(null);

            const r = toggle.getBoundingClientRect();
            const centre = r.left + r.width / 2;
            const left = Math.min(
                Math.max(centre - WIDTH + 26, 12),
                window.innerWidth - WIDTH - 12
            );

            return setAt({ top: r.bottom + GAP, left, arrow: centre - left });
        };

        // Not in the first moment: a note that arrives while the page is still
        // painting reads as an interruption, a few seconds in as an offer
        const wait = setTimeout(place, 2600);
        window.addEventListener("resize", place);

        return () => {
            clearTimeout(wait);
            window.removeEventListener("resize", place);
        };
    }, []);

    if (!at) return null;

    const close = () => {
        declineSound();
        setAt(null);
    };

    const accept = () => {
        // This press is the gesture the browser wants, so the engine starts
        // here and the tone that follows is the confirmation
        setSound(true);
        setAt(null);
    };

    return (
        <div
            role="dialog"
            aria-labelledby="cg-sound-invite"
            style={{ top: at.top, left: at.left, width: WIDTH }}
            className="cg-page-in fixed z-[70] rounded-[18px] border border-hairline bg-surface shadow-lift"
        >
            {/* The point of the thing: a small tongue up at the speaker */}
            <span
                aria-hidden
                style={{ left: at.arrow }}
                className="absolute -top-[7px] -ml-[7px] w-[13px] h-[13px] rotate-45 rounded-[3px] border-l border-t border-hairline bg-surface"
            />

            <div className="relative px-4 py-3.5">
                <button
                    onClick={close}
                    aria-label="Not now"
                    className="absolute right-2.5 top-2.5 w-7 h-7 grid place-items-center rounded-full text-ink-faint hover:text-ink hover:bg-sunken transition-colors"
                >
                    <X className="w-3.5 h-3.5" />
                </button>

                {/* "This page has a voice" was the first wording and it was
                    a promise of something else entirely - nothing here speaks.
                    What it is is a short tone under the pointer, and the copy
                    should say that and nothing grander */}
                <p
                    id="cg-sound-invite"
                    className="font-display font-semibold text-[14.5px] tracking-[-0.01em] pr-7"
                >
                    The buttons answer back
                </p>

                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
                    A short, quiet tone as you move over something, and another when you press
                    it. Off until you turn it on.
                </p>

                <button
                    onClick={accept}
                    className="mt-3 inline-flex items-center gap-2 h-9 px-4 rounded-full bg-brand text-white font-semibold text-[13px] hover:bg-brand-deep transition-colors"
                >
                    <Volume2 className="w-3.5 h-3.5" />
                    Turn it on
                </button>
            </div>
        </div>
    );
};
