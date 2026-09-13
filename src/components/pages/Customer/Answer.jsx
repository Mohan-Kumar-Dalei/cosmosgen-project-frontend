import { useEffect, useState } from "react";

/**
 * What the assistant said, set like an answer rather than dumped as a blob.
 *
 * The model writes the way anybody sensible writes when asked "how does the
 * bill work": a line of explanation, then a short list, then a line about what
 * to do next. Rendering that as one pre-wrapped paragraph threw away the part
 * that made it readable - a reader scanning for their own case has to find the
 * list, and a hyphen at the start of a line is not a list.
 *
 * Deliberately not a Markdown library. What comes back is plain prose with
 * dashes, digits and the occasional **bold**, and a parser for exactly that is
 * thirty lines that cannot be surprised by a model emitting a table or a
 * script tag.
 */

/**
 * One character at a time, out of a blur.
 *
 * The whole bubble used to resolve as a single blurred block, which reads as
 * one thing appearing rather than as an answer being written. Each letter now
 * carries its own delay.
 *
 * `step` is worked out from the length of the reply and handed down, so the
 * reveal always finishes in about a second: a short answer trips along at a
 * readable pace and a long one simply moves faster, rather than making
 * somebody who has already waited for a model wait for an animation too.
 */
const Reveal = ({ text, from, step }) => (
    Array.from(String(text)).map((char, i) => (
        <span
            key={i}
            className="cg-char"
            style={{ "--d": Math.round((from + i) * step) + "ms" }}
        >
            {char}
        </span>
    ))
);

/** `**like this**` becomes bold, and nothing else is interpreted. */
const withEmphasis = (text, cursor, step, revealing) =>
    String(text).split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
        const bold = part.startsWith("**") && part.endsWith("**") && part.length > 4;
        const body = bold ? part.slice(2, -2) : part;
        const at = cursor.n;

        cursor.n += body.length;

        if (!revealing) {
            return bold
                ? <strong key={i} className="font-semibold text-ink">{body}</strong>
                : <span key={i}>{body}</span>;
        }

        return bold
            ? (
                <strong key={i} className="font-semibold text-ink">
                    <Reveal text={body} from={at} step={step} />
                </strong>
            )
            : <Reveal key={i} text={body} from={at} step={step} />;
    });

/** A line that opens with a dash, a bullet or "1." is an item in a list. */
const ITEM = /^\s*(?:[-*•]|\d+[.)])\s+/;

const blocksFrom = (text) => {
    const blocks = [];
    let list = null;

    String(text).split("\n").forEach((raw) => {
        const line = raw.trimEnd();

        if (ITEM.test(line)) {
            const ordered = /^\s*\d+[.)]/.test(line);
            if (!list || list.ordered !== ordered) {
                list = { kind: "list", ordered, items: [] };
                blocks.push(list);
            }
            list.items.push(line.replace(ITEM, ""));
            return;
        }

        list = null;
        if (line.trim()) blocks.push({ kind: "p", text: line });
    });

    return blocks;
};

export const Answer = ({ text }) => {
    const blocks = blocksFrom(text);

    /*
     * The spans are temporary.
     *
     * A reply of four hundred characters is four hundred elements, each with
     * its own animation, and a thread of them made the page crawl on every
     * scroll long after the last letter had settled. Once the reveal is over
     * the whole thing collapses back to plain text nodes, which is what it
     * was always going to end up looking like.
     */
    const [revealing, setRevealing] = useState(true);

    useEffect(() => {
        const over = setTimeout(() => setRevealing(false), 1600);
        return () => clearTimeout(over);
    }, [text]);

    /*
     * One running position through the whole answer, so the reveal carries on
     * across paragraphs and list items instead of restarting in each of them.
     * A plain object rather than state: nothing here re-renders, it is read
     * once while the markup is built.
     */
    const cursor = { n: 0 };
    const total = String(text).length || 1;
    const step = Math.max(3, Math.min(14, 900 / total));

    return (
        <div className="flex flex-col gap-3">
            {blocks.map((block, i) => {
                if (block.kind === "p") {
                    return (
                        <p key={i} className="text-[14.5px] leading-relaxed">
                            {withEmphasis(block.text, cursor, step, revealing)}
                        </p>
                    );
                }

                return (
                    <ul key={i} className="flex flex-col gap-2 pl-0.5">
                        {block.items.map((item, j) => (
                            <li key={j} className="flex gap-2.5 text-[14.5px] leading-relaxed">
                                {block.ordered ? (
                                    <span
                                        aria-hidden
                                        className="mt-[1px] shrink-0 w-[18px] h-[18px] rounded-full bg-accent-tint text-accent grid place-items-center text-[10.5px] font-bold tabular-nums"
                                    >
                                        {j + 1}
                                    </span>
                                ) : (
                                    <span
                                        aria-hidden
                                        className="mt-[9px] shrink-0 w-1.5 h-1.5 rounded-full bg-accent"
                                    />
                                )}
                                <span>{withEmphasis(item, cursor, step, revealing)}</span>
                            </li>
                        ))}
                    </ul>
                );
            })}
        </div>
    );
};
