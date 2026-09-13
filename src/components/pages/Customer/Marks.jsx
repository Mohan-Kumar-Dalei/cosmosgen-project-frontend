/**
 * Other people's marks, drawn properly.
 *
 * Every WhatsApp button on this site used to carry a lucide speech bubble,
 * which is a drawing of a conversation and not a drawing of WhatsApp. The
 * difference matters more here than it would elsewhere: booking happens on
 * WhatsApp, so that button is the single most important control on the site,
 * and a reader recognises the real glyph in a green circle without reading a
 * word next to it.
 *
 * Both are the official outlines, set in `currentColor` so a button decides
 * its own colour, and marked `aria-hidden` because the label beside them
 * always says what they are.
 */

/** The WhatsApp glyph - the handset in a speech bubble, one path. */
export const WhatsAppMark = ({ className = "w-4 h-4" }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.57-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
);

/**
 * The Play Store triangle, in its own four colours.
 *
 * Not `currentColor`: this one is a coloured logo everywhere it appears, and a
 * white silhouette of it reads as a generic play button rather than as the
 * store. The four blades are drawn as the store draws them - the fold down the
 * middle is what makes it a Play mark and not a media control.
 */
export const PlayStoreMark = ({ className = "w-5 h-5" }) => (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
        {/* The spine, and the two halves that open off it */}
        <path d="M1.4 1.06A1.5 1.5 0 0 0 1 2.09v19.82c0 .39.15.75.4 1.03l10.62-10.94L1.4 1.06z" fill="#00D3FF" />
        <path d="M15.73 8.2 3.7.42a1.42 1.42 0 0 0-1.35-.09l-.95.73 10.62 10.94L15.73 8.2z" fill="#00F076" />
        <path d="m2.35 23.67.95.73c.43.2.92.16 1.35-.09l12.03-7.78-3.71-3.8L2.35 23.67z" fill="#FF3A44" />
        <path d="m17.4 8.66-1.67 1.08-3.71 3.8 3.71 3.8 1.67-1.08 4.18-2.7c.96-.62.96-2.06 0-2.68l-4.18-2.22z" fill="#FFCE00" />
    </svg>
);

/**
 * A store badge, for a row of them.
 *
 * Two lines, because that is how a store badge is set and anything else reads
 * as a homemade button: a small line saying what will happen, and the store's
 * own name underneath at the size of a word people recognise.
 */
export const StoreBadge = ({ mark, small, name, href, disabled, note }) => {
    const body = (
        <>
            {mark}
            <span className="flex flex-col items-start leading-none text-left">
                <span className="text-[9.5px] uppercase tracking-[0.14em] opacity-60">{small}</span>
                <span className="mt-1 font-display font-semibold text-[14.5px] tracking-[-0.01em]">{name}</span>
            </span>
        </>
    );

    const shell = "cg-store inline-flex items-center gap-3 h-12 pl-4 pr-5 rounded-2xl border transition-colors";

    if (disabled) {
        return (
            <span
                title={note}
                className={shell + " cg-store-off cursor-default"}
            >
                {body}
            </span>
        );
    }

    return (
        <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className={shell}
        >
            {body}
        </a>
    );
};

/**
 * The scooter, for the engineer on their way.
 *
 * Drawn here rather than taken from the icon set because the set has a
 * bicycle and this is not a bicycle - a technician in Odisha arrives on a
 * two-wheeler with a toolbag, and the marker on the tracking map is the one
 * place the site says so. Kept to four strokes: at the size it travels the
 * route, anything more detailed turns to mush.
 */
export const ScooterMark = ({ className = "w-5 h-5" }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className={className}
    >
        <circle cx="5.6" cy="16.6" r="3.2" />
        <circle cx="18.2" cy="16.6" r="3.2" />
        <path d="M8.8 16.6h6.2l-2.5-5.7H9.3" />
        <path d="M12.5 10.9 15 6h2" />
    </svg>
);
