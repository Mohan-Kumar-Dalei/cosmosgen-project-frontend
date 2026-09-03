import { toast } from "sonner";

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

// A new job or a new request - the thing people are waiting for
export const notifyNew = (title, description) => {
    playChime("double");
    toast.success(title, { description });
};

// Something needs a decision - a decline, a failed payment
export const notifyAlert = (title, description) => {
    playChime("double");
    toast.warning(title, { description });
};

// Confirmation of something the user just did
export const notifyDone = (title, description) => {
    toast.success(title, { description });
};

export const notifyError = (title, description) => {
    toast.error(title, { description });
};

// Quiet background updates - no sound, no interruption
export const notifyInfo = (title, description) => {
    toast(title, { description });
};

export { toast };