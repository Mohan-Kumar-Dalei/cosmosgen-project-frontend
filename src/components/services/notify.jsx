import { gooeyToast } from "goey-toast";
import NotifySource from "../ui/NotifySource";
import { BellRing, AlertTriangle, CheckCircle2, XCircle, Info } from "lucide-react";

/**
 * A short chime for anything that needs attention while the panel is in a
 * background tab. Generated with the Web Audio API rather than an mp3 so
 * there's no asset to host, no network fetch, and no autoplay warning from
 * a <video>/<audio> element.
 */
let audioContext = null;

const playChime = (pattern = "single") => {
    try {
        if (!audioContext) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            audioContext = new Ctx();
        }

        // Browsers suspend the context until the user interacts with the page.
        // Resuming here means the first chime works once they've clicked once.
        if (audioContext.state === "suspended") audioContext.resume();

        const notes = pattern === "double" ? [880, 1100] : [880];

        notes.forEach((freq, i) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();

            osc.type = "sine";
            osc.frequency.value = freq;

            const start = audioContext.currentTime + i * 0.16;
            // Quick fade in and out - a hard start or stop clicks audibly
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.14, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);

            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.start(start);
            osc.stop(start + 0.3);
        });
    } catch {
        // Sound is a nicety - never let it break the notification itself
    }
};

/* ================================================================== */

const TONES = {
    new: { fn: gooeyToast.success, icon: BellRing, colour: "text-green-600" },
    alert: { fn: gooeyToast.warning, icon: AlertTriangle, colour: "text-amber-600" },
    done: { fn: gooeyToast.success, icon: CheckCircle2, colour: "text-green-600" },
    error: { fn: gooeyToast.error, icon: XCircle, colour: "text-red-600" },
    info: { fn: gooeyToast.info, icon: Info, colour: "text-ink-soft" },
};

/**
 * options: { panel, tab, onOpen }
 *   panel  - "Backoffice" / "Technician"
 *   tab    - where inside it, e.g. "Tickets - New"
 *   onOpen - takes the user there; the card dismisses itself afterwards
 */
const raise = (tone, chime, title, description, options = {}) => {
    if (chime) playChime(chime);

    const { fn, icon: Icon, colour } = TONES[tone] || TONES.info;
    const { panel, tab, onOpen, duration } = options;

    return fn(title, {
        description: <NotifySource tone={tone} panel={panel} tab={tab} description={description} />,
        // The icon is what carries the tone. Colouring the fill turned every
        // toast into a solid blob, and colouring the border fought the light
        // theme - so the toast keeps its own look and the icon does the work.
        icon: <Icon className={"w-4 h-4 " + colour} />,
        duration: duration || (tone === "info" ? 5000 : 8000),
        ...(onOpen
            ? { action: { label: "Open", onClick: onOpen, successLabel: "Opening" } }
            : {}),
    });
};

// A new job or a new request - the thing people are waiting for
export const notifyNew = (title, description, options) => raise("new", "double", title, description, options);

// Something needs a decision - a decline, a failed payment
export const notifyAlert = (title, description, options) => raise("alert", "double", title, description, options);

// Confirmation of something the user just did
export const notifyDone = (title, description, options) => raise("done", null, title, description, options);

export const notifyError = (title, description, options) => raise("error", null, title, description, options);

// Quiet background updates - no sound, no interruption
export const notifyInfo = (title, description, options) => raise("info", null, title, description, options);

export const toast = gooeyToast;
