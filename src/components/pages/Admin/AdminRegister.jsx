import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, getErrorMessage } from "../../services/api";
import AuthShell from "../../ui/AuthShell";
import { Eye, EyeOff, CheckCircle2, KeyRound, Loader2 } from "lucide-react";

const AdminRegister = () => {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        role: "backoffice",
        secret: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const isOwner = form.role === "superadmin";

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            await api.post("/admin/register", {
                name: form.name,
                email: form.email,
                password: form.password,
                role: form.role,
                // Only owner sign-ups carry a key
                secret: isOwner ? form.secret : undefined,
            });
            setSuccess(true);
            setTimeout(() => navigate(isOwner ? "/owner/login" : "/admin/login"), 2000);
        } catch (err) {
            setError(getErrorMessage(err, "Could not create the account"));
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <AuthShell>
                <div className="text-center py-4">
                    <CheckCircle2 className="w-12 h-12 text-brand mx-auto mb-5" strokeWidth={1.5} />
                    <h1 className="cg-h2 mb-1.5">Account created</h1>
                    <p className="cg-sub">Taking you to sign in.</p>
                </div>
            </AuthShell>
        );
    }

    return (
        <AuthShell
            role="Backoffice"
            title="Create an account"
            subtitle="Join the Cosmosgen team."
            width="md"
        >
            {error && (
                <div className="mb-5 px-3.5 py-3 bg-danger-tint border border-hairline rounded-[10px] text-sm text-danger">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="cg-label block mb-2">Account type</label>
                        <select
                            name="role"
                            value={form.role}
                            onChange={handleChange}
                            className="cg-input"
                        >
                            <option value="backoffice">Backoffice staff</option>
                            <option value="superadmin">Company owner</option>
                        </select>
                    </div>

                    <div>
                        <label className="cg-label block mb-2">Full name</label>
                        <input
                            type="text"
                            name="name"
                            required
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Your full name"
                            className="cg-input"
                        />
                    </div>

                    <div>
                        <label className="cg-label block mb-2">Email</label>
                        <input
                            type="email"
                            name="email"
                            required
                            value={form.email}
                            onChange={handleChange}
                            placeholder="name@cosmosgen.com"
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
                                placeholder="At least 6 characters"
                                className="cg-input pl-3.5 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-faint hover:text-ink-soft"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Only owner sign-ups need the key - it stops anyone
                        promoting themselves to full access */}
                    {isOwner && (
                    <div className="px-4 py-3.5 bg-warn-tint border border-hairline rounded-[10px]">
                        <label className="cg-label flex items-center gap-1.5 mb-2 text-warn">
                            <KeyRound className="w-3.5 h-3.5" />
                            Security key
                        </label>
                        <input
                            type="password"
                            name="secret"
                            required
                            value={form.secret}
                            onChange={handleChange}
                            placeholder="Company security key"
                            className="cg-input bg-surface"
                        />
                        <p className="text-xs text-warn mt-2">
                            You will need this key every time you sign in.
                        </p>
                    </div>
                    )}

                <button type="submit" disabled={isLoading} className="cg-btn cg-btn-primary w-full py-3">
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isLoading ? "Creating account" : "Create account"}
                </button>
            </form>

            <p className="text-center text-sm text-ink-soft mt-7 pt-7 border-t border-hairline">
                Already have an account?{" "}
                <Link to={isOwner ? "/owner/login" : "/admin/login"} className="text-accent font-semibold hover:text-accent-deep">
                    Sign in
                </Link>
            </p>
        </AuthShell>
    );
};

export default AdminRegister;