import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAdminAuth } from "../Admin/adminAuthContext";
import AuthShell from "../../ui/AuthShell";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";

const OwnerLogin = () => {
    const navigate = useNavigate();
    const { login } = useAdminAuth();

    const [form, setForm] = useState({ email: "", password: "", secret: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        const result = await login(form.email, form.password, "owner", form.secret);

        setIsLoading(false);
        if (result.success) navigate("/admin");
        else setError(result.message);
    };

    return (
        <AuthShell
            role="Owner access"
            title="Owner sign in"
            subtitle="Full access to staff, payments and analytics."
            footer={
                <p className="text-xs text-ink-faint">
                    Backoffice staff?{" "}
                    <Link to="/admin/login" className="text-ink-soft font-semibold hover:text-ink">
                        Sign in here
                    </Link>
                </p>
            }
        >
            {error && (
                <div className="mb-5 px-3.5 py-3 bg-danger-tint border border-hairline rounded-[10px] text-sm text-danger">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="cg-label block mb-2">Email</label>
                    <input
                        type="email"
                        name="email"
                        required
                        value={form.email}
                        onChange={handleChange}
                        placeholder="owner@cosmosgen.com"
                        className="cg-input"
                    />
                </div>

                <div>
                    <label className="cg-label block mb-2">Password</label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            required
                            value={form.password}
                            onChange={handleChange}
                            placeholder="Your password"
                            className="cg-input pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-faint hover:text-ink"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                {/* The third field is what separates this door from the
                    backoffice one, so it says so rather than looking like
                    another password box. */}
                <div>
                    <label className="cg-label mb-2 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-warn" />
                        Security key
                    </label>
                    <input
                        type="password"
                        name="secret"
                        required
                        value={form.secret}
                        onChange={handleChange}
                        placeholder="The key you set at sign up"
                        className="cg-input"
                    />
                </div>

                <button type="submit" disabled={isLoading} className="cg-btn cg-btn-primary w-full py-3">
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isLoading ? "Signing in" : "Sign in"}
                </button>
            </form>
        </AuthShell>
    );
};

export default OwnerLogin;