import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Terminal } from "lucide-react";
import { useAdminAuth } from "../Admin/adminAuthContext";
import { DEV_TOKENS, FIELD, LABEL } from "./theme";

/**
 * The door to the engine room.
 *
 * It asks for the owner's own sign-in - email, password and the security key -
 * because that is already the credential that means "this is the person who
 * owns the company", and inventing a second password for one screen would only
 * mean one more thing to lose. A backoffice account is refused here by the
 * server, not by this form: it expects a superadmin and checks the key before
 * it will issue a session at all.
 *
 * That matters more now than it did, because the platform behind this door
 * will show a whole API key to whoever gets through it.
 */
const DeveloperLogin = () => {
    const navigate = useNavigate();
    const { login } = useAdminAuth();

    const [form, setForm] = useState({ email: "", password: "", secret: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const change = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError("");
    };

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");

        // "owner" is what tells the server to expect a superadmin and to check
        // the security key - a backoffice account fails here rather than
        // getting in and finding an empty page
        const result = await login(form.email, form.password, "owner", form.secret);

        setBusy(false);
        if (result.success) navigate("/developer");
        else setError(result.message);
    };

    return (
        <div
            style={DEV_TOKENS}
            className="min-h-screen font-sans bg-[var(--dev-paper)] text-[var(--dev-ink)] grid place-items-center px-5 py-10"
        >
            <div className="w-full max-w-sm">
                <div className="flex items-center gap-2.5 mb-7">
                    <span className="w-9 h-9 rounded-xl bg-[var(--dev-ink)] text-[var(--dev-paper)] grid place-items-center">
                        <Terminal className="w-4 h-4" />
                    </span>
                    <span className="flex flex-col leading-none">
                        <span className="font-semibold text-[15px] tracking-tight">Cosmosgen</span>
                        <span className="text-[9px] uppercase tracking-[0.2em] mt-1 text-[var(--dev-faint)]">
                            Developer platform
                        </span>
                    </span>
                </div>

                <div className="rounded-2xl border border-[var(--dev-line)] bg-[var(--dev-card)] p-6">
                    <h1 className="font-display font-bold text-[22px] tracking-[-0.02em]">Sign in</h1>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--dev-soft)]">
                        The keys the platform runs on, what is left of each, and what stops working
                        without them. The owner&rsquo;s sign-in only.
                    </p>

                    {error && (
                        <div className="mt-5 px-3.5 py-3 rounded-xl bg-[var(--dev-bad-tint)] border border-[#e9c3bf] text-[13px] text-[var(--dev-bad)]">
                            {error}
                        </div>
                    )}

                    <form onSubmit={submit} className="mt-5 flex flex-col gap-3.5">
                        <label className="block">
                            <span className={LABEL}>Email</span>
                            <input
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={change}
                                autoComplete="username"
                                className={FIELD}
                                placeholder="you@cosmosgen.in"
                            />
                        </label>

                        <label className="block">
                            <span className={LABEL}>Password</span>
                            <span className="relative block">
                                <input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    value={form.password}
                                    onChange={change}
                                    autoComplete="current-password"
                                    className={FIELD + " pr-11"}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-label={showPassword ? "Hide the password" : "Show the password"}
                                    className="absolute right-1 top-1 w-9 h-9 grid place-items-center rounded-lg text-[var(--dev-faint)] hover:text-[var(--dev-ink)] transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </span>
                        </label>

                        <label className="block">
                            <span className={LABEL}>Security key</span>
                            <input
                                name="secret"
                                type="password"
                                value={form.secret}
                                onChange={change}
                                autoComplete="off"
                                className={FIELD}
                                placeholder="The owner's second factor"
                            />
                        </label>

                        <button
                            type="submit"
                            disabled={busy || !form.email || !form.password}
                            className="mt-2 h-11 rounded-xl bg-[var(--dev-ink)] text-white font-semibold text-[14px] inline-flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40 transition-opacity"
                        >
                            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                            Sign in
                        </button>
                    </form>
                </div>

                <p className="mt-4 text-[12px] leading-relaxed text-[var(--dev-faint)] text-center">
                    Staff accounts cannot open this platform, whatever they sign in with.
                </p>
            </div>
        </div>
    );
};

export default DeveloperLogin;
