/**
 * The developer platform's palette.
 *
 * A warm white rather than a blank one: the neutrals carry a little of the
 * paper the customer site is printed on, so figures and rules sit on something
 * instead of floating on nothing. The first version of this platform was
 * near-black on the theory that a tool used under pressure should look like a
 * terminal - it read as unfinished rather than as serious.
 *
 * Kept as variables on the wrapper rather than as Tailwind tokens, because
 * this palette belongs to two screens and has no business leaking into the
 * office's or the customer's.
 */
export const DEV_TOKENS = {
    "--dev-paper": "#faf7f2",
    "--dev-card": "#ffffff",
    "--dev-line": "#e9e1d6",
    "--dev-line-soft": "#f1ebe2",
    "--dev-ink": "#221e1a",
    "--dev-soft": "#5f5549",
    // Dark enough to read at ten and a half pixels, which is the size the
    // uppercase labels are set at - the first pass had this three shades
    // lighter and the labels were decoration rather than text
    "--dev-faint": "#7a6e60",
    "--dev-blue": "#1d6fd0",
    "--dev-blue-tint": "#eaf2fd",
    "--dev-good": "#1f7a46",
    "--dev-good-tint": "#e8f4ec",
    "--dev-warn": "#a8620a",
    "--dev-warn-tint": "#fbf0dd",
    "--dev-bad": "#b3352f",
    "--dev-bad-tint": "#fbeae8",
};

/** The one input style both screens use. */
export const FIELD =
    "w-full h-11 px-3.5 rounded-xl bg-[var(--dev-card)] border border-[var(--dev-line)] "
    + "text-[14px] text-[var(--dev-ink)] placeholder:text-[var(--dev-faint)] "
    + "focus:outline-none focus:border-[var(--dev-blue)] transition-colors";

/** And the one label style. */
export const LABEL =
    "block mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--dev-faint)]";
