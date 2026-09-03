import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAdminAuth } from "../Admin/adminAuthContext";
import { Eye, EyeOff, Hexagon, KeyRound, ShieldCheck } from "lucide-react";

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
        <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-8">
            <div className="w-full max-w-sm">
                <div className="bg-amber-500 text-slate-900 text-xs font-bold text-center py-2 rounded-t-2xl uppercase tracking-wide flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Owner access
                </div>

                <div className="bg-white rounded-b-2xl shadow-xl p-8">
                    <div className="flex items-center gap-2 mb-8">
                        <div className="bg-slate-900 p-1.5 rounded-lg">
                            <Hexagon className="w-5 h-5 text-amber-400 fill-amber-400" />
                        </div>
                        <span className="font-bold text-gray-900 text-lg">Cosmosgen</span>
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 mb-1">Owner sign in</h1>
                    <p className="text-gray-500 text-sm mb-6">
                        Full access to staff, payments and analytics.
                    </p>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                            <input
                                type="email"
                                name="email"
                                required
                                value={form.email}
                                onChange={handleChange}
                                placeholder="owner@cosmosgen.com"
                                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-500"
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
                                    placeholder="Your password"
                                    className="w-full pl-3.5 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-500"
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

                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                                <KeyRound className="w-4 h-4 text-amber-600" />
                                Security key
                            </label>
                            <input
                                type="password"
                                name="secret"
                                required
                                value={form.secret}
                                onChange={handleChange}
                                placeholder="The key you set at sign up"
                                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-500"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
                        >
                            {isLoading ? "Signing in..." : "Sign in"}
                        </button>
                    </form>

                    <p className="text-center text-xs text-gray-400 mt-6 pt-6 border-t border-gray-100">
                        Backoffice staff?{" "}
                        <Link to="/admin/login" className="text-gray-500 font-medium hover:text-gray-700">
                            Sign in here
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default OwnerLogin;