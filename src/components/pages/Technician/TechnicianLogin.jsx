import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Eye, EyeOff, Hexagon } from 'lucide-react';

const TechnicianLogin = () => {
    const navigate = useNavigate();
    const [credentials, setCredentials] = useState({ phone: '', password: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [pendingNotice, setPendingNotice] = useState("");

    const handleChange = (e) => setCredentials({ ...credentials, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setPendingNotice("");
        try {
            const res = await api.post('/technician/login', credentials);
            if (res.data.success) {
                navigate('/technician/admin');
            }
        } catch (error) {
            const data = error.response?.data;
            // Approval and block messages get their own banner - an alert()
            // reads like an error when it's really a status update
            if (data?.approvalStatus || error.response?.status === 403) {
                setPendingNotice(data.message);
            } else {
                alert(data?.message || "Login failed");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-white font-sans selection:bg-green-100 selection:text-green-900">

            {/* LEFT PANEL - MASSIVE ROUNDED GRAPHIC WITH BOLD TYPOGRAPHY (Sticky) */}
            <div className="hidden lg:flex lg:w-1/2 p-4 pr-0 sticky top-0 h-screen">
                <div className="w-full h-full rounded-[2.5rem] bg-slate-900 relative overflow-hidden flex flex-col justify-center px-12 xl:px-20 2xl:px-24">

                    {/* Modern Dotted Pattern */}
                    <div className="absolute inset-0 opacity-20 z-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.4) 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>

                    {/* Glowing Blobs */}
                    <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-green-700/40 rounded-full mix-blend-screen filter blur-[120px] opacity-60 z-0"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-sky-700/40 rounded-full mix-blend-screen filter blur-[150px] opacity-60 z-0"></div>

                    {/* Brand Name & Typography */}
                    <div className="relative z-10 w-full">
                        <span className="block font-bold text-sky-400 text-sm 2xl:text-base tracking-widest uppercase mb-12 2xl:mb-16">
                            Cosmosgen Engineers Pvt. Ltd.
                        </span>

                        <div style={{ fontFamily: "'Outfit', sans-serif" }}>
                            <h1 className="text-6xl lg:text-7xl xl:text-8xl 2xl:text-[7rem] font-extrabold text-white leading-[1.05] mb-2 tracking-tight">
                                Engineered <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-sky-400">For</span>
                            </h1>
                            <h1 className="text-6xl lg:text-7xl xl:text-8xl 2xl:text-[7rem] font-extrabold text-white leading-[1.05] mb-8 tracking-tight">
                                Excellence.
                            </h1>
                        </div>

                        <p className="text-lg 2xl:text-xl text-sky-100/70 font-medium leading-relaxed max-w-xl">
                            Join the elite network of Cosmosgen professionals and manage your workflow seamlessly. Access real-time AI dispatch, intelligent routing, and instant payouts all from a single, unified dashboard designed to maximize your daily earnings and minimize downtime.
                        </p>
                    </div>

                </div>
            </div>

            {/* RIGHT PANEL - CLEAN FORM (Scrollable) */}
            <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 lg:p-12 xl:p-16 h-screen overflow-y-auto">

                {/* Header / Logo - ONLY VISIBLE ON MOBILE */}
                <div className="flex lg:hidden items-center gap-2 mb-8 mt-4">
                    <div className="bg-green-700 p-1.5 rounded-lg">
                        <Hexagon className="w-5 h-5 text-white fill-white" />
                    </div>
                    <span className="font-bold text-gray-900 text-lg tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        Cosmosgen Engineers
                    </span>
                </div>

                {/* Form Container */}
                <div className="w-full max-w-sm mx-auto flex-1 flex flex-col justify-center">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>Log in</h1>
                        <p className="text-gray-500 text-sm font-medium">Welcome back! Please enter your details.</p>
                    </div>
                    {pendingNotice && (
                        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                            <p className="text-sm font-semibold text-amber-900">Not able to sign in yet</p>
                            <p className="text-sm text-amber-700 mt-1">{pendingNotice}</p>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-gray-700">Phone Number</label>
                            <input
                                type="tel"
                                name="phone"
                                required
                                placeholder="Enter your 10-digit number"
                                value={credentials.phone}
                                onChange={handleChange}
                                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700 transition-colors text-sm text-gray-900 placeholder-gray-400"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-gray-700">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    required
                                    placeholder="••••••••"
                                    value={credentials.password}
                                    onChange={handleChange}
                                    className="w-full pl-3.5 pr-10 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700 transition-colors text-sm text-gray-900 placeholder-gray-400"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-2.5 rounded-lg shadow-sm transition-colors mt-2 text-sm"
                        >
                            {isLoading ? "Signing in..." : "Sign in"}
                        </button>
                    </form>

                    <p className="text-center text-sm text-gray-500 mt-8">
                        Don't have an account?{' '}
                        <Link to="/technician/admin/register" className="text-green-700 font-semibold hover:text-green-800 transition-colors">
                            Sign up
                        </Link>
                    </p>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center text-xs text-gray-400 mt-12 font-medium">
                    <p>© Cosmosgen 2026</p>
                    <a href="mailto:support@cosmosgen.com" className="hover:text-gray-600">support@cosmosgen.com</a>
                </div>
            </div>

        </div>
    );
};

export default TechnicianLogin;