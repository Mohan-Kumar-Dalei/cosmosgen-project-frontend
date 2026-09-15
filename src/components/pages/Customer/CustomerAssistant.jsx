import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowUp, Bot, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { WhatsAppMark } from "./Marks";
import { api, getErrorMessage } from "../../services/api";
import { CustomerShell } from "./CustomerShell";
import { PageHead, HeadStrip } from "./layout";
import { Pattern } from "./Texture";
import { Art } from "./Art";
import { Answer } from "./Answer";
import { useCustomer } from "./customerAuth";
import { useSmoothScroll } from "./motion";
import { WHATSAPP_LINK } from "./brand";
import { usePictures } from "./pictures";

/**
 * The assistant, which answers and does not book.
 *
 * What stood here before was the old chat demo: a phone-shaped frame that
 * registered a customer on their number alone and opened tickets. It had to
 * go. Booking needs a live position and a code at the door, and a browser tab
 * has neither - a job opened from here would go to whatever address happened
 * to be on file, which is how somebody ends up waiting outside the wrong house.
 *
 * The page is honest about that rather than quiet about it: the line under the
 * title says what it can and cannot do, and every route to an actual booking
 * points at WhatsApp or the app. The service behind it has no booking tool at
 * all, so this is a description of the system and not a promise about it.
 */
/** Where this browser keeps its handle on the conversation. */
const CHAT_KEY = "cg.chat";

const ASK_ANYONE = [
    "How does the door code work?",
    "What do you cover in a kitchen?",
    "How do I pay after the job?",
    "Do you come out for a fridge that is not cooling?",
];

const ASK_SIGNED_IN = [
    "What was my last job?",
    "Who came out for it?",
    "How much did I pay, and how?",
    "Read me my last invoice",
];

/**
 * The assistant's own face.
 *
 * It used to be the company's logo, which said the wrong thing twice over: the
 * logo is the company, and what is answering here is not a person at the
 * company. A machine icon is the honest label, and it is the same mark the
 * rest of the site uses when it points at this page.
 */
const AiMark = ({ className = "w-7 h-7" }) => (
    <span className={"shrink-0 rounded-full bg-accent-tint text-accent grid place-items-center " + className}>
        <Bot className="w-[60%] h-[60%]" strokeWidth={1.9} />
    </span>
);

const Bubble = ({ turn }) => {
    const mine = turn.role === "user";

    return (
        <div className={"flex gap-3 " + (mine ? "justify-end" : "")}>
            {!mine && <AiMark className="w-7 h-7 mt-0.5" />}

            <div
                className={"max-w-[min(560px,82%)] px-4 py-3 "
                    + (mine
                        ? "bg-ink text-canvas rounded-[20px] rounded-br-md text-[14.5px] leading-relaxed whitespace-pre-wrap"
                        : "bg-surface text-ink rounded-[20px] rounded-bl-md shadow-card")}
            >
                {/*
                  * The reader's own words need no parsing - they typed them.
                  * The answer does: it arrives as prose with lists in it, and
                  * a list rendered as a paragraph is the part people were
                  * going to scan.
                  */}
                {mine ? turn.text : <Answer text={turn.text} />}
            </div>
        </div>
    );
};

const CustomerAssistant = () => {
    useSmoothScroll();
    const { customer, ready } = useCustomer();
    const pics = usePictures();

    const [turns, setTurns] = useState([]);
    const [draft, setDraft] = useState("");
    const [thinking, setThinking] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [error, setError] = useState("");

    /*
     * The conversation's own handle, kept in this browser.
     *
     * The thread itself lives on the server - both sides of it, saved as each
     * answer lands - so closing the tab or coming back tomorrow finds the
     * conversation where it was left. It is deliberately not kept for ever:
     * three days after the last thing said, the server throws it away.
     */
    /*
     * The conversation's id lives in the address bar.
     *
     * A thread is a real thing on the server that outlives the tab, so it is
     * worth being able to point at: reopening it on another phone, or sending
     * the link to the office when an answer has gone wrong, both come free
     * once the id is in the URL. The stored copy stays as the fallback for
     * somebody arriving at the bare page, and the URL wins when both exist,
     * because the URL is what the reader actually asked for.
     */
    const { chatId: fromUrl } = useParams();
    const navigate = useNavigate();

    /*
     * Derived from the address, not held beside it.
     *
     * Keeping a copy in state as well meant the two could disagree - the back
     * button moved one and not the other - and reconciling them needed an
     * effect that set state on every change, which is a re-render chasing a
     * re-render. One source of truth removes the whole problem: the URL says
     * which conversation this is, and everything else follows from it.
     */
    const chatId = fromUrl || "";

    const remember = (id) => {
        if (!id || id === chatId) return;

        try { localStorage.setItem(CHAT_KEY, id); } catch { /* private window */ }

        // Replaced rather than pushed: the first answer of a conversation
        // should not put an empty version of the same page in the back button
        navigate("/ai-assistant/chat/" + id, { replace: true });
    };

    const forget = () => {
        try { localStorage.removeItem(CHAT_KEY); } catch { /* private window */ }
        navigate("/ai-assistant/chat", { replace: true });
    };

    /*
     * Somebody arriving at the bare page with a thread already stored is sent
     * to its address, so what they left off is what they come back to.
     */
    useEffect(() => {
        if (fromUrl) return;

        let stored = "";
        try { stored = localStorage.getItem(CHAT_KEY) || ""; } catch { /* private window */ }

        if (stored) navigate("/ai-assistant/chat/" + stored, { replace: true });
        // Once, on arrival
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const thread = useRef(null);
    const box = useRef(null);

    /*
     * What was said last time, if it is still there.
     *
     * An expired or unknown chat comes back empty rather than as an error, so
     * a reader whose thread has aged out simply starts a new one without being
     * told anything went wrong.
     */
    useEffect(() => {
        if (!chatId) return undefined;

        let alive = true;

        api.get("/customer/chat/" + chatId)
            .then((res) => {
                if (!alive) return;

                const saved = res.data?.data;
                if (saved?.turns?.length) setTurns(saved.turns);
                else forget();
            })
            .catch(() => {
                // A thread that cannot be read is not worth an error on screen
            });

        return () => { alive = false; };
        // Only on the first mount: afterwards this browser is the one writing
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    /*
     * The thread follows the newest message, and only the thread.
     *
     * Scrolling the window instead would drag the whole page - header, footer
     * and all - every time the assistant answered, which on a long reply looks
     * like the site jumping under the reader.
     */
    useEffect(() => {
        if (thread.current) thread.current.scrollTop = thread.current.scrollHeight;
    }, [turns, thinking]);

    // The box grows with the question rather than scrolling inside three lines
    const resize = (el) => {
        if (!el) return;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 160) + "px";
    };

    /** A clean thread. The old one keeps its three days on the server. */
    const startNew = () => {
        setTurns([]);
        setError("");
        forget();
    };

    /**
     * This conversation, gone.
     *
     * The screen clears either way: a chat the server has already forgotten is
     * not something to report as a failure to the person asking for it to be
     * forgotten.
     */
    const remove = async () => {
        if (!chatId) { startNew(); return; }

        setRemoving(true);

        try {
            await api.delete("/customer/chat/" + chatId);
        } catch {
            // Nothing to say - it either never existed or has expired
        } finally {
            setRemoving(false);
            startNew();
        }
    };

    const send = async (text) => {
        const question = String(text || "").trim();
        if (!question || thinking) return;

        setError("");
        setDraft("");
        if (box.current) box.current.style.height = "auto";

        // The thread as it stood before this question, for a chat the server
        // has not seen yet. Once there is one, the server's own copy is what
        // the model reads and this is ignored.
        const history = turns.map((t) => ({ role: t.role, text: t.text }));
        setTurns((prev) => [...prev, { role: "user", text: question }]);
        setThinking(true);

        try {
            const res = await api.post("/customer/ask", { message: question, history, chatId });
            setTurns((prev) => [...prev, { role: "model", text: res.data.data.reply }]);
            remember(res.data.data.chatId);
        } catch (err) {
            setError(getErrorMessage(err, "The assistant did not answer. Try again in a moment."));
        } finally {
            setThinking(false);
        }
    };

    const suggestions = ready && customer ? ASK_SIGNED_IN : ASK_ANYONE;
    const started = turns.length > 0;

    return (
        <CustomerShell>
            <PageHead
                eyebrow="Ask AI"
                title="Describe it in your own words"
                lede="In Odia, Hindi or English. The assistant explains how the work runs and reads back your own past jobs: what was done, who came and what it cost. It does not take bookings: a job needs your live location and a code at your door, so an engineer is booked on WhatsApp or in the app."
                foot={<HeadStrip items={["Is this something you fix?", "How the codes work", "The four ways to pay", "My last invoice"]} />}
                art={(
                    <Art
                        src={pics.HERO_ELECTRICAL}
                        alt=""
                        icon={Bot}
                        tr="w-900"
                        fit="contain"
                        tint="sand"
                        eager
                        bare
                        className="w-full h-full min-h-[320px]"
                    />
                )}
            />

            {/*
              * The assistant's own ground.
              *
              * The weave used to cover the whole band, and a texture spread
              * evenly over a section flattens it - the eye reads wallpaper and
              * stops looking. It now gathers in the top corner and dissolves
              * across the diagonal, over a wash of colour for it to dissolve
              * into.
              */}
            <section className="relative overflow-clip">
                <div aria-hidden className="cg-corner-wash pointer-events-none absolute inset-0" />
                <Pattern kind="weave" fade="none" className="cg-corner" />

                <div className="relative mx-auto max-w-6xl px-5 sm:px-8 py-10 lg:py-14 grid lg:grid-cols-[1fr_300px] gap-10 lg:gap-14 items-start rounded-bl-2xl">
                <div>
                    {/*
                      * The thread needs an account now.
                      *
                      * It used to answer anybody, and the reasoning was sound
                      * - the questions that decide whether somebody becomes a
                      * customer all come before the account does. What settled
                      * it the other way is that every turn is a model call the
                      * company pays for, and an endpoint that spends money on
                      * behalf of strangers is one that gets found.
                      *
                      * Everything explaining what the assistant is stays on
                      * the page, above and beside this - so a visitor still
                      * learns what it does before being asked for anything.
                      */}
                    {ready && !customer ? (
                        <div className="h-[min(58vh,540px)] rounded-3xl bg-canvas p-6 grid place-items-center text-center">
                            <div className="max-w-sm">
                                <span className="mx-auto w-12 h-12 grid place-items-center rounded-full bg-accent-tint text-accent">
                                    <Bot className="w-6 h-6" />
                                </span>

                                <p className="mt-4 font-display font-semibold text-[17px] tracking-[-0.01em]">
                                    Sign in to ask
                                </p>
                                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
                                    Your number and a code on WhatsApp - no password. After that the
                                    assistant answers here, and can read back every job we have done
                                    for you.
                                </p>

                                <Link
                                    to="/account"
                                    className="mt-5 inline-flex items-center gap-2 h-11 px-6 rounded-full bg-accent text-white text-[14px] font-semibold hover:bg-accent-deep transition-colors"
                                >
                                    Sign in
                                </Link>

                                <p className="mt-4 text-[12.5px] leading-relaxed text-ink-faint">
                                    In a hurry? WhatsApp us and the same assistant answers there.
                                </p>
                            </div>
                        </div>
                    ) : (
                    <>
                    <div
                        ref={thread}
                        className="h-[min(58vh,540px)] overflow-y-auto rounded-3xl bg-canvas p-5 sm:p-6 flex flex-col gap-4"
                    >
                        {!started && (
                            <div className="m-auto text-center max-w-sm">
                                <span className="mx-auto w-12 h-12 grid place-items-center rounded-full bg-accent-tint text-accent"><Bot className="w-6 h-6" /></span>
                                <p className="mt-4 font-display font-semibold text-[17px] tracking-[-0.01em]">
                                    {ready && customer
                                        ? "Ask about anything we have done for you"
                                        : "Ask anything about the work"}
                                </p>
                                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
                                    {ready && customer
                                        ? "Your jobs, your invoices, and how any of it works."
                                        : "Sign in on the My jobs page and it can read back your own jobs too."}
                                </p>
                            </div>
                        )}

                        {turns.map((turn, i) => (
                            <Bubble key={i} turn={turn} />
                        ))}

                        {/*
                          * Three bouncing dots are the universal sign for
                          * "somebody is typing", and nobody is typing - a
                          * model is reading. A word with a light passing
                          * through it says thinking rather than typing, and it
                          * also says which part of the work is happening.
                          */}
                        {thinking && (
                            <div className="flex gap-3">
                                <AiMark className="w-7 h-7 mt-0.5" />
                                <div className="px-4 py-3 rounded-[20px] rounded-bl-md bg-surface shadow-card">
                                    <span className="cg-shimmer text-[14.5px] font-medium">
                                        Reading your question
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {error && (
                        <p className="mt-3 text-[13.5px] text-warn leading-relaxed">{error}</p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                        {suggestions.map((s) => (
                            <button
                                key={s}
                                onClick={() => send(s)}
                                disabled={thinking}
                                className="h-9 px-4 rounded-full bg-surface text-[13px] font-medium text-ink-soft shadow-card hover:text-ink hover:shadow-lift transition-all duration-300 disabled:opacity-50"
                            >
                                {s}
                            </button>
                        ))}

                        {started && (
                            <>
                                {/* A new thread, and the old one left where it
                                    is - somebody starting a fresh question has
                                    not asked for anything to be thrown away */}
                                <button
                                    onClick={startNew}
                                    className="group h-9 px-4 rounded-full text-[13px] font-medium text-ink-faint hover:text-ink transition-colors inline-flex items-center gap-1.5"
                                >
                                    <RotateCcw className="w-3.5 h-3.5 transition-transform duration-500 group-hover:-rotate-180" />
                                    New chat
                                </button>

                                {/* And the other thing: gone from the server as
                                    well as from the screen. It would have gone
                                    on its own in three days; this is for
                                    somebody who does not want to wait. */}
                                <button
                                    onClick={remove}
                                    disabled={removing}
                                    className="group h-9 px-4 rounded-full text-[13px] font-medium text-ink-faint hover:text-warn transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {removing
                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : <Trash2 className="w-3.5 h-3.5" />}
                                    Delete this chat
                                </button>
                            </>
                        )}
                    </div>

                    <form
                        onSubmit={(e) => { e.preventDefault(); send(draft); }}
                        className="mt-5 flex items-end gap-2 rounded-[26px] bg-surface shadow-card p-2 pl-5 focus-within:shadow-lift transition-shadow duration-300"
                    >
                        <textarea
                            ref={box}
                            rows={1}
                            value={draft}
                            onChange={(e) => { setDraft(e.target.value); resize(e.target); }}
                            onKeyDown={(e) => {
                                // Enter sends; shift and enter together is how you
                                // write a second line, the way every chat works
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    send(draft);
                                }
                            }}
                            placeholder="What has gone wrong?"
                            className="flex-1 resize-none bg-transparent py-2.5 text-[15px] leading-relaxed outline-none placeholder:text-ink-faint"
                        />

                        <button
                            type="submit"
                            disabled={thinking || !draft.trim()}
                            aria-label="Send"
                            className="shrink-0 w-10 h-10 grid place-items-center rounded-full bg-accent text-white transition-all duration-300 hover:bg-accent-deep hover:-translate-y-0.5 disabled:opacity-40 disabled:translate-y-0"
                        >
                            {thinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
                        </button>
                    </form>
                    </>
                    )}
                </div>

                <aside className="lg:sticky lg:top-24 flex flex-col gap-8">
                    <div>
                        <h2 className="font-display font-semibold text-[16px] tracking-[-0.01em]">
                            What it can tell you
                        </h2>
                        <ul className="mt-3 flex flex-col gap-2.5 text-[13.5px] leading-relaxed text-ink-soft">
                            {[
                                "Whether a problem is something we handle",
                                "How the door codes and the bill work",
                                "The four ways people pay",
                                "Your own past jobs: engineer, work done, invoice, amount",
                            ].map((line) => (
                                <li key={line} className="flex gap-2.5">
                                    <span aria-hidden className="mt-[8px] w-1 h-1 rounded-full bg-accent shrink-0" />
                                    {line}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {ready && !customer && (
                        <div>
                            <h2 className="font-display font-semibold text-[16px] tracking-[-0.01em]">
                                Sign in for your own jobs
                            </h2>
                            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
                                Your number and a code on WhatsApp. After that it can read back every
                                job we have done for you.
                            </p>
                            <Link
                                to="/account"
                                className="mt-4 inline-flex items-center h-10 px-5 rounded-full bg-ink text-canvas text-[13.5px] font-semibold hover:opacity-90 transition-opacity"
                            >
                                Sign in
                            </Link>
                        </div>
                    )}

                    <div>
                        <h2 className="font-display font-semibold text-[16px] tracking-[-0.01em]">
                            To actually book someone
                        </h2>
                        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
                            A job needs the pin you drop and the code at your door, so it happens on
                            WhatsApp or in the app, never here.
                        </p>
                        <a
                            href={WHATSAPP_LINK}
                            target="_blank"
                            rel="noreferrer"
                            className="group mt-4 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-brand text-white text-[14px] font-semibold hover:bg-brand-deep transition-colors"
                        >
                            <WhatsAppMark className="w-[17px] h-[17px] transition-transform duration-300 group-hover:scale-110" />
                            Book on WhatsApp
                        </a>
                    </div>
                </aside>
                </div>
            </section>
        </CustomerShell>
    );
};

export default CustomerAssistant;
