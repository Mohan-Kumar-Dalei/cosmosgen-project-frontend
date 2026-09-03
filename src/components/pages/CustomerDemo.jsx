import React, { useState, useEffect, useRef, useCallback } from "react";
import { api, getErrorMessage } from "../services/api";
import { socket, connectSocket, disconnectSocket } from "../services/socket";
import {
    Hexagon, Send, MapPin, Loader2, AlertCircle, CheckCircle2,
    Snowflake, Zap, Wrench, Sparkles, ChevronRight,
} from "lucide-react";

/* ================================================================== */
/* SERVICE CATALOG - mirrors backend src/config/services.js            */
/* ================================================================== */

const SERVICES = [
    { key: "AC_APPLIANCE", label: "AC & Appliance Repair", icon: Snowflake, blurb: "Cooling, servicing, gas refill" },
    { key: "ELECTRICAL", label: "Electrical Issues", icon: Zap, blurb: "Wiring, switches, fittings" },
    { key: "PLUMBING", label: "Plumbing Services", icon: Wrench, blurb: "Taps, pipes, leaks" },
    { key: "HOME_CLEANING", label: "Home Cleaning", icon: Sparkles, blurb: "Deep clean, sofa, kitchen" },
];

/* ================================================================== */
/* PHONE FRAME - keeps everything inside a mobile-width preview        */
/* ================================================================== */

const PhoneFrame = ({ children }) => (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-6 px-4">
        <div className="w-full max-w-[400px] h-[820px] max-h-[92vh] bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border-8 border-slate-900">
            {children}
        </div>
    </div>
);

/* ================================================================== */
/* STEP 1: REGISTRATION + LOCATION                                     */
/* ================================================================== */

const RegisterStep = ({ onRegistered }) => {
    const [form, setForm] = useState({ name: "", phone: "" });
    const [locationStatus, setLocationStatus] = useState("idle");
    const [coords, setCoords] = useState(null);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError("");
    };

    const requestLocation = () => {
        if (!navigator.geolocation) {
            setLocationStatus("denied");
            return;
        }
        setLocationStatus("requesting");
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
                setLocationStatus("granted");
            },
            () => setLocationStatus("denied"),
            { timeout: 10000, enableHighAccuracy: true }
        );
    };

    useEffect(() => {
        requestLocation();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!coords) {
            setError("We need your location to find a technician near you.");
            return;
        }
        setIsLoading(true);
        setError("");
        try {
            const res = await api.post("/auth/register", {
                name: form.name.trim(),
                phone: form.phone.trim(),
                lat: coords.lat,
                lon: coords.lon,
            });
            onRegistered(res.data.user);
        } catch (err) {
            setError(getErrorMessage(err, "Could not start your session"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 flex items-center justify-center bg-slate-900 px-6">
            <div className="w-full">
                <div className="flex items-center gap-2 mb-6">
                    <div className="bg-green-600 p-1.5 rounded-lg">
                        <Hexagon className="w-4 h-4 text-white fill-white" />
                    </div>
                    <span className="font-bold text-white text-base">Cosmosgen</span>
                </div>

                <h1 className="text-xl font-bold text-white mb-1">Get help fast</h1>
                <p className="text-white/50 text-sm mb-6">
                    Tell us who you are and we'll connect you with a technician.
                </p>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                        type="text"
                        name="name"
                        required
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Your name"
                        className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
                    />
                    <input
                        type="tel"
                        name="phone"
                        required
                        pattern="[6-9][0-9]{9}"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="10-digit mobile number"
                        className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
                    />

                    <div className="flex items-center gap-2.5 p-3 rounded-lg bg-white/5 border border-white/10">
                        {locationStatus === "requesting" && (
                            <>
                                <Loader2 className="w-4 h-4 text-white/50 animate-spin shrink-0" />
                                <span className="text-sm text-white/60">Getting your location...</span>
                            </>
                        )}
                        {locationStatus === "granted" && (
                            <>
                                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                                <span className="text-sm text-green-300">Location found</span>
                            </>
                        )}
                        {locationStatus === "denied" && (
                            <>
                                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-amber-300">Location access needed</p>
                                    <button
                                        type="button"
                                        onClick={requestLocation}
                                        className="text-xs font-semibold text-green-400 hover:text-green-300"
                                    >
                                        Try again
                                    </button>
                                </div>
                            </>
                        )}
                        {locationStatus === "idle" && (
                            <>
                                <MapPin className="w-4 h-4 text-white/40 shrink-0" />
                                <span className="text-sm text-white/50">Waiting for location...</span>
                            </>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !coords}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
                    >
                        {isLoading ? "Starting..." : "Continue"}
                    </button>
                </form>
            </div>
        </div>
    );
};

/* ================================================================== */
/* STEP 2: SERVICE PICKER                                              */
/* ================================================================== */

const ServicePickerStep = ({ user, onSelect }) => (
    <div className="flex-1 flex flex-col bg-[#e5ddd5]">
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center gap-3 shrink-0">
            <div className="bg-green-600 p-1.5 rounded-lg">
                <Hexagon className="w-4 h-4 text-white fill-white" />
            </div>
            <div>
                <p className="font-semibold text-sm">Cosmosgen Support</p>
                <p className="text-xs text-white/50">Hi {user.name.split(" ")[0]} 👋</p>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
            <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 mb-4 shadow-sm max-w-[90%]">
                <p className="text-sm text-gray-800">
                    Welcome to Cosmosgen! What can we help you with today?
                </p>
            </div>

            <div className="space-y-2">
                {SERVICES.map((s) => (
                    <button
                        key={s.key}
                        onClick={() => onSelect(s)}
                        className="w-full flex items-center gap-3 bg-white p-3.5 rounded-xl shadow-sm hover:shadow-md hover:bg-green-50 transition-all text-left"
                    >
                        <div className="bg-green-100 p-2.5 rounded-full shrink-0">
                            <s.icon className="w-4.5 h-4.5 text-green-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm">{s.label}</p>
                            <p className="text-xs text-gray-500">{s.blurb}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                    </button>
                ))}
            </div>
        </div>
    </div>
);

/* ================================================================== */
/* STEP 3: CHAT                                                        */
/* ================================================================== */

const genChatId = () =>
    `chat_${Date.now()}_${crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)}`;

const MessageBubble = ({ message }) => {
    const isUser = message.role === "user";
    const isSystem = message.sender === "system";

    if (isSystem) {
        return (
            <div className="flex justify-center my-2">
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-lg max-w-[90%] whitespace-pre-line text-center">
                    {message.content}
                </div>
            </div>
        );
    }

    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2`}>
            <div
                className={`max-w-[82%] px-3.5 py-2 rounded-2xl text-sm whitespace-pre-line ${
                    isUser
                        ? "bg-green-600 text-white rounded-br-sm"
                        : "bg-white text-gray-800 shadow-sm rounded-bl-sm"
                }`}
            >
                {message.content}
            </div>
        </div>
    );
};

const ChatStep = ({ user, service }) => {
    const [messages, setMessages] = useState([
        {
            role: "model",
            content: `Got it — ${service.label}. Tell me a bit more about the issue and I'll take it from there.`,
        },
    ]);
    const [input, setInput] = useState("");
    const [connected, setConnected] = useState(false);
    const [aiTyping, setAiTyping] = useState(false);
    const chatIdRef = useRef(genChatId());
    const scrollRef = useRef(null);

useEffect(() => {
    connectSocket();

    const onConnect = () => {
        console.log("✅ Socket connected:", socket.id);
        setConnected(true);
    };
    const onDisconnect = (reason) => {
        console.log("🔴 Socket disconnected:", reason);
        setConnected(false);
    };
    const onConnectError = (err) => {
        console.error("❌ Socket connect error:", err.message);
        setConnected(false);
    };
    const onResponse = (payload) => {
        setAiTyping(false);
        setMessages((prev) => [
            ...prev,
            { role: "model", content: payload.content, sender: payload.sender },
        ]);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);   // <-- ye add karo
    socket.on("ai-response", onResponse);

    return () => {
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        socket.off("connect_error", onConnectError);
        socket.off("ai-response", onResponse);
        disconnectSocket();
    };
}, []);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, aiTyping]);

    const sendMessage = useCallback(() => {
        const content = input.trim();
        if (!content || !connected) return;

        setMessages((prev) => [...prev, { role: "user", content }]);
        setInput("");
        setAiTyping(true);

        // The service label rides along on the first message so the AI
        // knows which category the user picked without asking again.
        socket.emit("ai-message", {
            chat: chatIdRef.current,
            content: `[Service: ${service.label}] ${content}`,
        });
    }, [input, connected, service.label]);

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-[#e5ddd5] min-h-0">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center gap-3 shrink-0">
                <div className="bg-green-600 p-1.5 rounded-lg">
                    <Hexagon className="w-4 h-4 text-white fill-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">Cosmosgen Support</p>
                    <p className="text-xs text-white/50">{connected ? "Online" : "Connecting..."}</p>
                </div>
                <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-gray-400"}`} />
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
                {messages.map((msg, i) => (
                    <MessageBubble key={i} message={msg} />
                ))}
                {aiTyping && (
                    <div className="flex justify-start mb-2">
                        <div className="bg-white shadow-sm rounded-2xl rounded-bl-sm px-4 py-2.5 flex gap-1">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                        </div>
                    </div>
                )}
                <div ref={scrollRef} />
            </div>

            <div className="bg-white border-t border-gray-200 px-2.5 py-2.5 flex items-end gap-2 shrink-0">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message"
                    rows={1}
                    className="flex-1 resize-none px-3.5 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 max-h-20"
                />
                <button
                    onClick={sendMessage}
                    disabled={!input.trim() || !connected}
                    className="shrink-0 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white p-2.5 rounded-full transition-colors"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

/* ================================================================== */
/* MAIN                                                                 */
/* ================================================================== */

const CustomerDemo = () => {
    const [user, setUser] = useState(null);
    const [service, setService] = useState(null);
    const [checkingSession, setCheckingSession] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const res = await api.get("/auth/user");
                setUser(res.data.user);
            } catch {
                setUser(null);
            } finally {
                setCheckingSession(false);
            }
        };
        checkSession();
    }, []);

    let content;
    if (checkingSession) {
        content = (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
        );
    } else if (!user) {
        content = <RegisterStep onRegistered={setUser} />;
    } else if (!service) {
        content = <ServicePickerStep user={user} onSelect={setService} />;
    } else {
        content = <ChatStep user={user} service={service} />;
    }

    return <PhoneFrame>{content}</PhoneFrame>;
};

export default CustomerDemo;