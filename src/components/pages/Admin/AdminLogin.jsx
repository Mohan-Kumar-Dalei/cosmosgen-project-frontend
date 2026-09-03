import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAdminAuth } from "../Admin/adminAuthContext";
import { Eye, EyeOff, Hexagon } from "lucide-react";

const AdminLogin = () => {
    const navigate = useNavigate();
    const { login } = useAdminAuth();

    const [form, setForm] = useState({ email: "", password: "" });
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

        const result = await login(form.email, form.password, "backoffice");

        setIsLoading(false);
        if (result.success) navigate("/admin");
        else setError(result.message);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-8">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
                <div className="flex items-center gap-2 mb-8">
                    <img 
                        src="https://ik.imagekit.io/ny6yinyut/cosmosgenLogo/cosmosgen-logo.png?updatedAt=1788413075959" 
                        alt="Cosmosgen Logo" 
                        className="h-8" 
                    />
                    <div className="flex flex-col">
                        <span className="font-bold text-gray-900 text-lg leading-tight">Cosmosgen</span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest leading-tight">Backoffice</span>
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h1>
                <p className="text-gray-500 text-sm mb-6">Manage service requests and technicians.</p>

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
                                placeholder="Your password"
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

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
                    >
                        {isLoading ? "Signing in..." : "Sign in"}
                    </button>
                </form>

                <p className="text-center text-sm text-gray-500 mt-6">
                    Don't have an account?{" "}
                    <Link to="/admin/register" className="text-green-700 font-semibold hover:text-green-800">
                        Sign up
                    </Link>
                </p>

                <p className="text-center text-xs text-gray-400 mt-6 pt-6 border-t border-gray-100">
                    Company owner?{" "}
                    <Link to="/owner/login" className="text-gray-500 font-medium hover:text-gray-700">
                        Sign in here
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default AdminLogin;