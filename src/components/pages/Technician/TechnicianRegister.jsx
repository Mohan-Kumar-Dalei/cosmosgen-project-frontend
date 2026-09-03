import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { MapPin, Truck, Eye, EyeOff, Hexagon, Loader2 } from 'lucide-react';

const TechnicianRegister = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    // Form State
    const [formData, setFormData] = useState({
        name: '', phone: '', password: '', state: '', area: '', pincode: '', skills: 'AC & Appliance Repair', hasVehicle: false
    });

    const serviceOptions = ["AC & Appliance Repair", "Plumbing Services", "Electrical Issues", "Home Cleaning", "Carpentry Services"];

    // 📍 OSM Location States
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearchingLoc, setIsSearchingLoc] = useState(false);
    const [osmTimeout, setOsmTimeout] = useState(null);

    // Normal Input Handler
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    // 🌍 Smart Area Input Handler (Trigger OSM Fetch)
    const handleAreaChange = (e) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, area: val }));

        if (val.trim().length >= 3) {
            setIsSearchingLoc(true);
            if (osmTimeout) clearTimeout(osmTimeout);

            const timeoutId = setTimeout(async () => {
                try {
                    const res = await api.get(`/map/search?q=${encodeURIComponent(val)}`);
                    setSuggestions(res.data.data);
                    setShowSuggestions(true);
                } catch (error) {
                    console.error("OSM Fetch Error:", error);
                } finally {
                    setIsSearchingLoc(false);
                }
            }, 600);
            setOsmTimeout(timeoutId);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    // Auto-fill Action
const handleSelectLocation = (place) => {
        setFormData(prev => ({ 
            ...prev, 
            state: place.state || '', 
            area: place.area || place.label || '', 
            pincode: place.pincode || '' 
        }));
        setShowSuggestions(false);
    };

    // Register form submit hone se pehle ye call karo
    const getLocation = () => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve(null); // browser support nahi karta - registration phir bhi chalega
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                    });
                },
                () => {
                    resolve(null); // permission deny ya error - registration phir bhi chalega
                },
                { timeout: 8000, enableHighAccuracy: true }
            );
        });
    };

    // Form Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const coords = await getLocation();
            const payload = {
                ...formData,
                ...(coords ? { lat: coords.lat, lon: coords.lon } : {}),
            };
            const response = await api.post('/technician/register', payload);
            if (response.data && response.data.success) {
                // No redirect - the account can't sign in until it's approved
                setSubmitted(true);
                navigate("/technician/admin")
            }
        } catch (error) {
            alert(error.response?.data?.message || "Registration failed");
        } finally {
            setIsLoading(false);
        }
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
                <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                        <Loader2 className="w-7 h-7 text-amber-600" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Application submitted</h1>
                    <p className="text-gray-500 text-sm mb-6">
                        The office will review your details. You'll be able to sign in
                        with your phone number once they approve it.
                    </p>
                    <Link
                        to="/technician/admin/login"
                        className="block w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-2.5 rounded-lg text-sm"
                    >
                        Go to sign in
                    </Link>
                </div>
            </div>
        );
    }
    return (
        <div className="min-h-screen flex bg-white font-sans selection:bg-green-100 selection:text-green-900">

            {/* LEFT PANEL */}
            <div className="hidden lg:flex lg:w-1/2 p-4 pr-0 sticky top-0 h-screen">
                <div className="w-full h-full rounded-[2.5rem] bg-slate-900 relative overflow-hidden flex flex-col justify-center px-12 xl:px-20 2xl:px-24">
                    <div className="absolute inset-0 opacity-20 z-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.4) 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
                    <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-green-700/40 rounded-full mix-blend-screen filter blur-[150px] opacity-60 z-0"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-sky-700/40 rounded-full mix-blend-screen filter blur-[120px] opacity-60 z-0"></div>

                    <div className="relative z-10 w-full">
                        <span className="block font-bold text-sky-400 text-sm 2xl:text-base tracking-widest uppercase mb-12 2xl:mb-16">
                            Cosmosgen Engineers Pvt. Ltd.
                        </span>
                        <div style={{ fontFamily: "'Outfit', sans-serif" }}>
                            <h1 className="text-6xl lg:text-7xl xl:text-8xl 2xl:text-[7rem] font-extrabold text-white leading-[1.05] mb-2 tracking-tight">
                                Build Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-sky-400">Career.</span>
                            </h1>
                            <h1 className="text-6xl lg:text-7xl xl:text-8xl 2xl:text-[7rem] font-extrabold text-white leading-[1.05] mb-8 tracking-tight">
                                On Your Terms.
                            </h1>
                        </div>
                        <p className="text-lg 2xl:text-xl text-sky-100/70 font-medium leading-relaxed max-w-xl">
                            Register today to become a certified Cosmosgen partner. Let our advanced AI bring high-paying, location-optimized service requests directly to you.
                        </p>
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL - CLEAN FORM */}
            <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 lg:p-12 xl:p-16 h-screen overflow-y-auto">
                <div className="flex lg:hidden items-center gap-2 mb-8 mt-4">
                    <div className="bg-green-700 p-1.5 rounded-lg"><Hexagon className="w-5 h-5 text-white fill-white" /></div>
                    <span className="font-bold text-gray-900 text-lg tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>Cosmosgen Engineers</span>
                </div>

                <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center my-auto pt-4 lg:pt-0">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>Sign up</h1>
                        <p className="text-gray-500 text-sm font-medium">Start your journey as a service partner.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5"><label className="block text-sm font-semibold text-gray-700">Full Name</label><input type="text" name="name" required placeholder="John Doe" value={formData.name} onChange={handleChange} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-700/20 focus:border-green-700 outline-none text-sm" /></div>
                            <div className="space-y-1.5"><label className="block text-sm font-semibold text-gray-700">Phone Number</label><input type="tel" name="phone" required placeholder="10-digit number" value={formData.phone} onChange={handleChange} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-700/20 focus:border-green-700 outline-none text-sm" /></div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-gray-700">Password</label>
                            <div className="relative">
                                <input type={showPassword ? "text" : "password"} name="password" required placeholder="Create a strong password" value={formData.password} onChange={handleChange} className="w-full pl-3.5 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-700/20 focus:border-green-700 outline-none text-sm" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none">
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-gray-700">Primary Skill</label>
                            <select name="skills" required value={formData.skills} onChange={handleChange} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-700/20 focus:border-green-700 outline-none text-sm bg-white">
                                {serviceOptions.map((service, idx) => <option key={idx} value={service}>{service}</option>)}
                            </select>
                        </div>

                        {/* 🌟 LOCATION FIELDS (Smart Search applied directly to Area) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">

                            {/* Area Input acts as Search Box */}
                            <div className="sm:col-span-2 relative space-y-1.5 z-50">
                                <label className="block text-sm font-semibold text-gray-700">Area / City (Search here)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="area"
                                        required
                                        placeholder="Type Area to fetch..."
                                        value={formData.area}
                                        onChange={handleAreaChange}
                                        autoComplete="off"
                                        className="w-full pl-3.5 pr-8 py-2.5 border border-sky-300 bg-sky-50 rounded-lg focus:bg-white focus:ring-2 focus:ring-sky-700/20 focus:border-sky-700 outline-none text-sm text-gray-900 font-medium"
                                    />
                                    {isSearchingLoc && <Loader2 className="w-4 h-4 text-sky-600 animate-spin absolute right-3 top-3" />}
                                </div>

                                {/* Dropdown Menu */}
                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="absolute w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-2xl max-h-48 overflow-y-auto divide-y divide-gray-50 top-full">
                                        {suggestions.map((place) => (
                                            <div key={place.place_id} onClick={() => handleSelectLocation(place)} className="p-3 hover:bg-sky-50 cursor-pointer flex gap-3 items-start transition-colors">
                                                <MapPin className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                                                <span className="text-sm font-semibold text-gray-700 leading-tight">{place.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-sm font-semibold text-gray-700">State</label>
                                <input type="text" name="state" required placeholder="State" value={formData.state} onChange={handleChange} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700 text-sm" />
                            </div>

                            <div className="space-y-1.5 sm:col-span-3">
                                <label className="block text-sm font-semibold text-gray-700">Pincode</label>
                                <input type="text" name="pincode" required placeholder="Pincode" value={formData.pincode} onChange={handleChange} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700 text-sm" />
                            </div>
                        </div>

                        {/* 🌟 PREMIUM TOGGLE BUTTON (Replaced Checkbox) */}
                        <div className="flex items-center justify-between p-4 bg-sky-50/50 rounded-xl border border-sky-100 cursor-pointer transition-colors hover:bg-sky-50" onClick={() => setFormData(prev => ({ ...prev, hasVehicle: !prev.hasVehicle }))}>
                            <div className="flex items-center gap-4">
                                <Truck className={`w-6 h-6 transition-colors ${formData.hasVehicle ? 'text-green-600' : 'text-gray-400'}`} />
                                <div>
                                    <p className="text-sm font-bold text-gray-900">I have my own vehicle</p>
                                    <p className="text-xs text-gray-500 font-medium mt-0.5">Helps AI assign distant jobs.</p>
                                </div>
                            </div>
                            {/* The Toggle Switch */}
                            <div className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 ease-in-out ${formData.hasVehicle ? 'bg-green-600 shadow-inner' : 'bg-gray-300 shadow-inner'}`}>
                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out ${formData.hasVehicle ? 'translate-x-6' : 'translate-x-1'}`} />
                            </div>
                        </div>

                        <button type="submit" disabled={isLoading} className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-2.5 rounded-lg shadow-sm transition-colors mt-4 text-sm">
                            {isLoading ? "Creating account..." : "Get started"}
                        </button>
                    </form>

                    <p className="text-center text-sm text-gray-500 mt-8">
                        Already have an account? <Link to="/technician/admin/login" className="text-green-700 font-semibold hover:text-green-800 transition-colors">Log in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TechnicianRegister;