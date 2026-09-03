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

// Customer chat widget
export const socket = createRoleSocket("customer");
export const connectSocket = () => { if (!socket.connected) socket.connect(); };
export const disconnectSocket = () => { if (socket.connected) socket.disconnect(); };

// Technician panel
export const techSocket = createRoleSocket("technician");
export const connectTechSocket = () => { if (!techSocket.connected) techSocket.connect(); };
export const disconnectTechSocket = () => { if (techSocket.connected) techSocket.disconnect(); };

// Admin panel
export const adminSocket = createRoleSocket("admin");
export const connectAdminSocket = () => { if (!adminSocket.connected) adminSocket.connect(); };
export const disconnectAdminSocket = () => { if (adminSocket.connected) adminSocket.disconnect(); };