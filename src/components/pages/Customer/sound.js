import { useEffect, useSyncExternalStore } from "react";

/**
 * The interface makes a sound.
 *
 * Two rules kept this from becoming the thing people close the tab over.
 *
 * First, it is synthesised rather than downloaded. Two oscillators and an
 * envelope weigh nothing, need no file on a CDN, and cannot arrive late and
 * play over something the reader has already moved past. A pair of mp3s would
 * have been the obvious route and the worse one.
 *
 * Second, it is quiet, short, and switchable - the speaker in the header turns
 * it off and the browser remembers. A site that insists on making noise is a
 * site people mute at the operating system, which takes the video they were
 * about to watch with it.
 *
 * A browser will not let a page make a sound until somebody has interacted
 * with it, so the audio engine is not built until the first press. Hovers
 * before that first click are silent, and that is the correct behaviour rather
 * than a bug to work around.
 */
const STORE = "cg.sound";
const ASKED = "cg.sound.asked";

/**
 * Every page starts silent, whatever was chosen last time.
 *
 * This is not a policy decision, it is the browser's: a page may not make a
 * sound until somebody has interacted with it, and until then the audio clock
 * is frozen. Remembering "on" across a reload therefore promised something
 * that could not be delivered - the speaker showed on, hovering did nothing,
 * and the first press let out everything that had been waiting.
 *
 * So the switch starts off and the site asks once, with a button. Pressing
 * that button is the gesture the browser wants, so sound works from that
 * moment. What is remembered is only whether the question has been answered,
 * because nobody wants to be asked twice.
 */
let on = false;

/** Whether the invitation is still worth showing. */
export const soundWasDeclined = () => {
    try {
        return localStorage.getItem(ASKED) === "no";
    } catch {
        return false;
    }
};

/** They said not now. Do not ask again - the speaker in the bar is there. */
export const declineSound = () => {
    try { localStorage.setItem(ASKED, "no"); } catch { /* private window */ }
};

const watchers = new Set();

export const soundIsOn = () => on;

export const setSound = (value) => {
    on = Boolean(value);
    try { localStorage.setItem(STORE, on ? "1" : "0"); } catch { /* private window */ }
    watchers.forEach((fn) => fn());

    /*
     * Turning it on is always a press, and a press is the one thing a browser
     * will start the audio clock for - so this is the moment to start it. The
     * note doubles as the answer to "did that work?", which is otherwise a
     * question somebody has to go and hover over something to settle.
     */
    if (on) clickSound();
};

const subscribe = (fn) => {
    watchers.add(fn);
    return () => watchers.delete(fn);
};

/** Re-renders whatever draws the toggle when the setting changes. */
export const useSoundSetting = () => useSyncExternalStore(subscribe, soundIsOn, () => true);

/* ---------- THE NOISE ITSELF ---------- */

let ctx = null;
let bus = null;

const engine = () => {
    if (!on) return null;

    if (!ctx) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return null;
        ctx = new Audio();

        // Everything goes through one soft filter. Raw oscillators are
        // glassy and sharp, and sharp is what makes a UI sound feel cheap
        bus = ctx.createBiquadFilter();
        bus.type = "lowpass";
        bus.frequency.value = 3200;
        bus.connect(ctx.destination);
    }

    return ctx;
};

/** The note itself, on a clock that is already running. */
const play = (audio, { from, to, duration, peak, type = "sine" }) => {
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(from, now);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, now + duration);

    // A tiny attack rather than an instant one: a square-edged start is heard
    // as a click of its own, on top of the click we meant
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(bus);
    osc.start(now);
    osc.stop(now + duration + 0.02);
};

/**
 * Nothing is ever scheduled on a clock that is not running.
 *
 * A browser will not let a page make a sound until somebody has interacted
 * with it, and until then the audio clock is frozen. Scheduling a note "now"
 * against a frozen clock does not drop it - it parks it, and it fires the
 * instant the clock starts. So after a reload the first hover was queued, the
 * first click started the engine, and both sounded together: one gesture,
 * two noises, every time the page was refreshed.
 *
 * So a hover may only be heard if the engine is already awake, and the press
 * is the only thing allowed to wake it - which is also the only thing a
 * browser will accept a resume from.
 */
const tone = (spec, gesture = false) => {
    const audio = engine();
    if (!audio) return;

    if (audio.state === "running") { play(audio, spec); return; }
    if (!gesture) return;

    audio.resume().then(() => play(audio, spec)).catch(() => {
        // The browser was not convinced this was a gesture. Silence is the
        // right answer - the alternative is a note waiting to ambush the next
        // thing the reader presses.
    });
};

/*
 * The hover was set so quietly it may as well not have been there - on a
 * laptop's own speakers, under any room noise at all, nothing. It is louder
 * and a touch longer now, and drops a little in pitch as it goes, which is
 * what stops a brighter tone from turning into a tick.
 */
export const hoverSound = () => tone({ from: 1240, to: 1080, duration: 0.055, peak: 0.05 });
export const clickSound = () => tone({ from: 640, to: 380, duration: 0.075, peak: 0.05, type: "triangle" }, true);

/* ---------- WIRING IT TO THE PAGE ---------- */

/**
 * One pair of listeners on the document rather than a handler on every button.
 *
 * Anything that behaves like a control gets the sound, including controls
 * added later by a page that has not been written yet - which is the whole
 * reason not to thread a prop through forty components.
 */
const CONTROLS = 'a, button, [role="tab"], [data-sound]';

export const useInterfaceSounds = () => {
    useEffect(() => {
        let last = null;
        let pressedAt = 0;
        let movedAt = 0;

        // Only ever read, never acted on: the question this answers is
        // whether the pointer is the thing that moved
        const moved = () => { movedAt = Date.now(); };

        const over = (e) => {
            /*
             * A finger does not hover.
             *
             * A tap is one gesture, and the browser reports it as a pointerover
             * followed a few milliseconds later by a pointerdown - so a phone
             * played the hover and the click on top of each other, every time.
             * There is no hover state on a touch screen to announce, so there
             * is nothing to play: a tap is a press and only a press.
             */
            if (e.pointerType !== "mouse") return;

            const el = e.target?.closest?.(CONTROLS);
            // Moving within one button is not a new hover
            if (!el || el === last) return;
            last = el;

            /*
             * And a control arriving under a still cursor is not a hover.
             *
             * This is the half that kept coming back. Pressing something
             * changes the page - a panel opens, a route swaps, a transition
             * slides a section up - and whatever control lands where the
             * pointer already is fires a pointerover of its own. The reader
             * did one thing and heard two sounds. Holding hovers off for a
             * moment after a press only hid it while pages were slow to
             * change; once they became instant the second sound arrived just
             * outside the window and came straight back.
             *
             * A window was the wrong instrument. A hover means the pointer
             * moved onto something, so that is what gets asked: entering an
             * element is always preceded by the pointer actually moving, and
             * when the page moves instead there is no movement to find.
             */
            if (Date.now() - movedAt > 120) return;

            // A press still silences the hover under it - the two are one
            // gesture and the click is the one worth hearing
            if (Date.now() - pressedAt < 400) return;

            if (!el.hasAttribute("disabled")) hoverSound();
        };

        const down = (e) => {
            pressedAt = Date.now();

            const el = e.target?.closest?.(CONTROLS);
            if (el && !el.hasAttribute("disabled")) clickSound();
        };

        // Pointer, not mouse: a tap on a phone should still answer, and a
        // finger never hovers
        document.addEventListener("pointermove", moved, { passive: true });
        document.addEventListener("pointerover", over, { passive: true });
        document.addEventListener("pointerdown", down, { passive: true });

        return () => {
            document.removeEventListener("pointermove", moved);
            document.removeEventListener("pointerover", over);
            document.removeEventListener("pointerdown", down);
        };
    }, []);
};
