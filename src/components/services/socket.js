import { io } from "socket.io-client";

const SOCKET_URL =
    import.meta.env.VITE_SOCKET_URL ||
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000"
        : "https://cosmosgen-backend.onrender.com");

/**
 * Each panel builds its own socket and tells the server which role it's
 * connecting as. A browser can hold all three auth cookies at once during
 * testing, so the server needs an explicit role to pick the right one.
 */
const createRoleSocket = (role) => {
    const s = io(SOCKET_URL, {
        withCredentials: true,
        autoConnect: false,
        transports: ["websocket", "polling"],
        auth: { role },
    });

    s.on("connect", () => console.log(`[SOCKET:${role}] connected`));
    s.on("disconnect", (reason) => console.log(`[SOCKET:${role}] disconnected:`, reason));
    s.on("connect_error", (err) => console.error(`[SOCKET:${role}] connect_error:`, err.message));

    return s;
};

/**
 * Re-read the screen when a dropped connection comes back, or when the user
 * returns to a tab that had gone to the background.
 *
 * Socket.IO reconnects on its own but it does not replay anything: every
 * event the server sent while the socket was away was sent to nobody. A
 * technician's phone goes in his pocket, the screen sleeps, the signal dies
 * in a stairwell - and the panel comes back looking perfectly live while
 * showing what was true ten minutes ago. That is the "sometimes it doesn't
 * update" nobody can reproduce on a desk.
 *
 * So a reconnection is itself the signal to reload, because the panel cannot
 * know what it missed. Nothing here runs on a timer: it fires on a real
 * reconnection or on the user genuinely coming back, and the short guard
 * only stops the two of them firing together from fetching twice.
 */
export const onLiveResume = (roleSocket, reload) => {
    let last = 0;

    const run = () => {
        const now = Date.now();
        if (now - last < 3000) return;
        last = now;
        reload();
    };

    const onVisible = () => {
        if (document.visibilityState === "visible") run();
    };

    // Manager-level event: fires once the socket is back up, not on each
    // failed attempt
    roleSocket.io.on("reconnect", run);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
        roleSocket.io.off("reconnect", run);
        document.removeEventListener("visibilitychange", onVisible);
    };
};

/**
 * connect() on a live socket and disconnect() on a dead one are both no-ops
 * in socket.io, so these are unguarded on purpose.
 *
 * The guards that used to be here read the wrong state: a socket in the
 * middle of opening is not yet `connected`, so "disconnect if connected" left
 * it opening after the panel had already unmounted - a live connection with
 * no listeners on it.
 */
// Customer chat widget
export const socket = createRoleSocket("customer");
export const connectSocket = () => socket.connect();
export const disconnectSocket = () => socket.disconnect();

// Technician panel
export const techSocket = createRoleSocket("technician");
export const connectTechSocket = () => techSocket.connect();
export const disconnectTechSocket = () => techSocket.disconnect();

// Admin panel
export const adminSocket = createRoleSocket("admin");
export const connectAdminSocket = () => adminSocket.connect();
export const disconnectAdminSocket = () => adminSocket.disconnect();