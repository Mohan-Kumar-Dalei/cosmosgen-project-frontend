import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

/**
 * Built when somebody asks for a code, not when this file is imported.
 *
 * It used to run at import time, and that made a missing key fatal to a page
 * that has not asked for Firebase yet: the registration screen imports this
 * module, so a build without `VITE_FIREBASE_API_KEY` set threw before the
 * screen could render, and a technician pressing "Register" got nothing at
 * all rather than a form with one step that does not work. A module should
 * not be able to take a page down by being imported.
 */
let auth = null;

const client = () => {
    if (auth) return auth;

    const config = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

    if (!config.apiKey || !config.authDomain) {
        // Said plainly, because the person who can fix this is the one
        // deploying, and "auth/invalid-api-key" tells them nothing
        throw new Error("This build has no Firebase settings, so codes cannot be sent.");
    }

    auth = getAuth(initializeApp(config));
    // SMS text follows the device language rather than the browser's default
    auth.languageCode = "en";

    return auth;
};

/** Whether a code can be sent at all, for a screen that wants to say so. */
export const otpIsConfigured = () => Boolean(import.meta.env.VITE_FIREBASE_API_KEY);

/**
 * Firebase requires a reCAPTCHA before it will send an SMS. The invisible
 * variant solves itself for most users - they only see a challenge if the
 * request looks automated.
 *
 * The verifier is torn down and rebuilt on each send: reusing a solved one
 * throws on the second attempt, which is what breaks "resend code".
 */
let verifier = null;

const resetVerifier = () => {
    if (verifier) {
        try { verifier.clear(); } catch { /* already gone */ }
        verifier = null;
    }
};

export const sendOtp = async (phone10) => {
    const client_ = client();

    resetVerifier();

    verifier = new RecaptchaVerifier(client_, "recaptcha-container", {
        size: "invisible",
    });

    return signInWithPhoneNumber(client_, "+91" + phone10, verifier);
};

export const cleanupOtp = resetVerifier;

// Maps Firebase's error codes to something a technician can act on
export const otpErrorMessage = (error) => {
    const code = error?.code || "";

    if (code.includes("invalid-phone-number")) return "That doesn't look like a valid mobile number.";
    if (code.includes("too-many-requests")) return "Too many attempts. Please try again in a few minutes.";
    if (code.includes("invalid-verification-code")) return "That code isn't right. Check and try again.";
    if (code.includes("code-expired")) return "That code has expired. Request a new one.";
    if (code.includes("quota-exceeded")) return "We can't send codes right now. Please contact the office.";
    if (code.includes("captcha")) return "Verification check failed. Please reload and try again.";

    return "Something went wrong. Please try again.";
};