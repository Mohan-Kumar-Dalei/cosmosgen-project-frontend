import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getErrorMessage } from "../../services/api";

/**
 * Who is signed in on the customer side of the site.
 *
 * The browser carries an httpOnly cookie, so nothing is stored here - this
 * only remembers the answer the server gave, so that the header, the account
 * page and the booking notice do not each ask for it again.
 */
const CustomerContext = createContext(null);

export const useCustomer = () => {
    const value = useContext(CustomerContext);
    if (!value) throw new Error("useCustomer used outside CustomerProvider");
    return value;
};

export const CustomerProvider = ({ children }) => {
    const [customer, setCustomer] = useState(null);

    // Null is not false. "We have not asked yet" is its own state, and
    // treating it as signed out flashes a sign-in prompt at somebody who is
    // already signed in.
    const [ready, setReady] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await api.get("/customer/me");
            setCustomer(res.data.data);
        } catch {
            // A 401 here is the ordinary case - most visitors are strangers
            setCustomer(null);
        } finally {
            setReady(true);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    /** Sends the six digits to their WhatsApp. */
    const requestCode = useCallback(async (phone) => {
        try {
            const res = await api.post("/customer/otp", { phone });
            return { ok: true, ...res.data };
        } catch (err) {
            return {
                ok: false,
                retryAfter: err.response?.data?.retryAfter,
                message: getErrorMessage(err, "Could not send the code."),
            };
        }
    }, []);

    const signIn = useCallback(async (phone, code) => {
        try {
            const res = await api.post("/customer/otp/verify", { phone, code });
            setCustomer(res.data.user);
            return { ok: true, needsProfile: res.data.needsProfile };
        } catch (err) {
            return { ok: false, message: getErrorMessage(err, "That code was not accepted.") };
        }
    }, []);

    const signOut = useCallback(async () => {
        // Told to the server first so the cookie is cleared at the source,
        // then forgotten here whatever it said - a failed logout must not
        // strand somebody signed in on a shared computer.
        try { await api.post("/customer/logout"); } catch { /* leaving anyway */ }
        setCustomer(null);
    }, []);

    return (
        <CustomerContext.Provider
            value={{ customer, setCustomer, ready, requestCode, signIn, signOut, reload: load }}
        >
            {children}
        </CustomerContext.Provider>
    );
};
