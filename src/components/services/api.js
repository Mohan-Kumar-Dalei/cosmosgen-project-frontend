import axios from "axios";

// Set VITE_API_URL in production. Falls back to localhost during development.
const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000/api"
        : "https://cosmosgen-backend.onrender.com/api");

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
            "/technician/admin/login",
            "/technician/admin/register",
        ];
        const isPublicPage = publicPages.includes(path);

        // The session check and auth calls handle their own 401s
        const isAuthCall =
            url.includes("/login") || url.includes("/register") || url.includes("/me");

        if (status === 401 && !isAuthCall && !isPublicPage) {
            if (path.startsWith("/admin")) {
                window.location.href = "/admin/login";
            } else if (path.startsWith("/technician")) {
                window.location.href = "/technician/admin/login";
            }
        }

        return Promise.reject(error);
    }
);

// The API always returns { success, message } - this pulls the message out.
export const getErrorMessage = (error, fallback = "Something went wrong") =>
    error.response?.data?.message || fallback;