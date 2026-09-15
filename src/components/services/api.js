import axios from "axios";

// Set VITE_API_URL in production. Falls back to localhost during development.
const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000/api"
        : "https://cosmosgen-api.duckdns.org/api");

export const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // all three auth cookies travel with this
    headers: { "Content-Type": "application/json" },
});

// On a 401, send the user to the login page for whichever panel they're in.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const url = error.config?.url || "";
        const path = window.location.pathname;

        // A 401 is expected on these pages - never redirect away from them
        const publicPages = [
            "/admin/login",
            "/admin/register",
            "/owner/login",
            "/vendor/admin/login",
            "/vendor/admin/register",
        ];
        const isPublicPage = publicPages.includes(path);

        // The session check and auth calls handle their own 401s
        const isAuthCall =
            url.includes("/login") || url.includes("/register") || url.includes("/me");

        if (status === 401 && !isAuthCall && !isPublicPage) {
            if (path.startsWith("/admin")) {
                window.location.href = "/admin/login";
            } else if (path.startsWith("/vendor") || path.startsWith("/technician")) {
                /*
                 * Both spellings, and the old one is not dead weight.
                 *
                 * The panel moved from /technician/admin to /vendor/admin, and
                 * this check was missed in the rename - it tested the prefix
                 * without "/admin" on it, so nothing matched the new address
                 * and a signed-out vendor sat on the panel collecting 401s
                 * instead of being shown the login page.
                 *
                 * /technician stays because the old routes still answer, for
                 * links already out in the world; somebody who lands there
                 * with no session should be sent on rather than stranded.
                 */
                window.location.href = "/vendor/admin/login";
            }
        }

        return Promise.reject(error);
    }
);

// The API always returns { success, message } - this pulls the message out.
export const getErrorMessage = (error, fallback = "Something went wrong") =>
    error.response?.data?.message || fallback;