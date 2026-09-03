import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

const app = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

export const auth = getAuth(app);
// SMS text follows the device language rather than the browser's default
auth.languageCode = "en";

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
    resetVerifier();

    verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
    });

    const confirmation = await signInWithPhoneNumber(auth, "+91" + phone10, verifier);
    return confirmation;
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