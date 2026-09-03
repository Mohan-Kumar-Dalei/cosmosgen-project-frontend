import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, getErrorMessage } from "../../services/api";
import { Eye, EyeOff, Hexagon, CheckCircle2, KeyRound } from "lucide-react";

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
            <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
                <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 text-center">
                    <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Account created</h1>
                    <p className="text-gray-500 text-sm">Taking you to sign in...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-8">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
                <div className="flex items-center gap-2 mb-6">
                    <div className="bg-green-700 p-1.5 rounded-lg">
                        <Hexagon className="w-5 h-5 text-white fill-white" />
                    </div>
                    <span className="font-bold text-gray-900 text-lg">Cosmosgen</span>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-1">Create an account</h1>
                <p className="text-gray-500 text-sm mb-6">Join the Cosmosgen team.</p>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Account type</label>
                        <select
                            name="role"
                            value={form.role}
                            onChange={handleChange}
                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700"
                        >
                            <option value="backoffice">Backoffice staff</option>
                            <option value="superadmin">Company owner</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full name</label>
                        <input
                            type="text"
                            name="name"
                            required
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Your full name"
                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                        <input
                            type="email"
                            name="email"
                            required
                            value={form.email}
                            onChange={handleChange}
                            placeholder="name@cosmosgen.com"
                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                required
                                value={form.password}
                                onChange={handleChange}
                                placeholder="At least 6 characters"
                                className="w-full pl-3.5 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Only owner sign-ups need the key - it stops anyone
                        promoting themselves to full access */}
                    {isOwner && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <label className="text-sm font-semibold text-amber-900 mb-1.5 flex items-center gap-1.5">
                                <KeyRound className="w-4 h-4" />
                                Security key
                            </label>
                            <input
                                type="password"
                                name="secret"
                                required
                                value={form.secret}
                                onChange={handleChange}
                                placeholder="Company security key"
                                className="w-full px-3.5 py-2.5 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-500"
                            />
                            <p className="text-xs text-amber-700 mt-1.5">
                                You'll need this key every time you sign in.
                            </p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
                    >
                        {isLoading ? "Creating account..." : "Create account"}
                    </button>
                </form>

                <p className="text-center text-sm text-gray-500 mt-6">
                    Already have an account?{" "}
                    <Link to={isOwner ? "/owner/login" : "/admin/login"} className="text-green-700 font-semibold hover:text-green-800">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default AdminRegister;