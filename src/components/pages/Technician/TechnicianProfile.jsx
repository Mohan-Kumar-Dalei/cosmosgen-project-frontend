import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { User, Phone, MapPin, Zap, ArrowLeft, Trash2, Camera, Map, Loader2 } from 'lucide-react';

const TechnicianProfile = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // States
    const [techProfile, setTechProfile] = useState({
        name: '', phone: '', state: '', area: '', pincode: '', profileImage: ''
    });
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    // 📍 OSM Location States
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearchingLoc, setIsSearchingLoc] = useState(false);
    const [osmTimeout, setOsmTimeout] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/technician/me');
                if (res.data.success) {
                    setTechProfile(res.data.data);
                }
            } catch (error) {
                navigate('/technician/admin/login');
            }
        };
        fetchProfile();
    }, [navigate]);

    const handleChange = (e) => {
        setTechProfile({ ...techProfile, [e.target.name]: e.target.value });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    // 🌍 Smart Area Input Handler
    const handleAreaChange = (e) => {
        const val = e.target.value;
        setTechProfile(prev => ({ ...prev, area: val }));

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
        setTechProfile(prev => ({ 
            ...prev, 
            state: place.state || '', 
            area: place.area || place.label || '', 
            pincode: place.pincode || '' 
        }));
        setShowSuggestions(false);
    };
    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData();
        formData.append('name', techProfile.name);
        formData.append('phone', techProfile.phone);
        formData.append('state', techProfile.state);
        formData.append('area', techProfile.area);
        formData.append('pincode', techProfile.pincode);
        if (imageFile) formData.append('profileImage', imageFile);

        try {
            const res = await api.put('/technician/profile/update', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.success) {
                alert("Profile updated successfully!");
                navigate('/technician/admin');
            }
        } catch (error) {
            alert("Failed to update profile");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        const confirmDelete = window.confirm("Are you sure you want to permanently delete your account?");
        if (!confirmDelete) return;

        setIsDeleting(true);
        try {
            await api.delete('/technician/profile/delete');
            document.cookie = "techToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            navigate('/technician/admin/login');
        } catch (error) {
            alert("Failed to delete account");
            setIsDeleting(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col font-sans bg-[#F8FAFC]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

            <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-50 border-b border-gray-100 shadow-sm">
                <div className="max-w-4xl mx-auto px-6 h-20 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-green-600 to-green-800 p-2 rounded-xl shadow-lg shadow-green-700/20"><Zap className="w-6 h-6 text-white fill-white" /></div>
                        <h1 className="text-xl font-extrabold text-gray-900 tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>TechSpace.</h1>
                    </div>
                    <button onClick={() => navigate('/technician/admin')} className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 transition-all cursor-pointer">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto w-full px-6 py-12 flex-1 z-10">
                <div className="mb-10">
                    <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>Profile Settings</h2>
                    <p className="text-gray-500 font-medium mt-2">Manage your personal information and location.</p>
                </div>

                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                    <form onSubmit={handleUpdate} className="p-8 lg:p-12">

                        <div className="flex flex-col sm:flex-row items-center gap-8 mb-10 pb-10 border-b border-gray-100">
                            <div className="relative group cursor-pointer rounded-full">
                                <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-sky-50 flex-shrink-0 flex items-center justify-center">
                                    {previewUrl ? <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                        : techProfile.profileImage ? <img src={techProfile.profileImage} alt="Profile" className="w-full h-full object-cover" />
                                            : <User className="w-12 h-12 text-sky-200" />}
                                </div>
                                <label className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all cursor-pointer backdrop-blur-sm">
                                    <Camera className="w-8 h-8 text-white mb-1" />
                                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Change</span>
                                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                </label>
                            </div>
                            <div className="text-center sm:text-left">
                                <h3 className="text-xl font-bold text-gray-900">Profile Photo</h3>
                                <p className="text-sm text-gray-500 mt-1 max-w-sm">Click on the image to upload a new professional photo.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Full Name</label>
                                <div className="relative group">
                                    <User className="w-5 h-5 text-gray-400 absolute left-4 top-3.5 group-focus-within:text-sky-700 transition-colors" />
                                    <input type="text" name="name" required value={techProfile.name} onChange={handleChange} className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-700/20 focus:border-sky-700 outline-none transition-all font-medium text-gray-900" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Phone Number</label>
                                <div className="relative group">
                                    <Phone className="w-5 h-5 text-gray-400 absolute left-4 top-3.5 group-focus-within:text-sky-700 transition-colors" />
                                    <input type="tel" name="phone" required value={techProfile.phone} onChange={handleChange} className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-700/20 focus:border-sky-700 outline-none transition-all font-medium text-gray-900" />
                                </div>
                            </div>
                        </div>

                        {/* 🌟 LOCATION FIELDS (Smart Search applied directly to Area) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            {/* Smart Area Field */}
                            <div className="md:col-span-2 relative space-y-2 z-50">
                                <label className="text-sm font-bold text-gray-700">Area / City (Search to Auto-fill)</label>
                                <div className="relative group">
                                    <MapPin className="w-5 h-5 text-gray-400 absolute left-4 top-3.5 group-focus-within:text-sky-700 transition-colors" />
                                    <input
                                        type="text"
                                        name="area"
                                        required
                                        autoComplete="off"
                                        placeholder="Type area to fetch..."
                                        value={techProfile.area}
                                        onChange={handleAreaChange}
                                        className="w-full pl-12 pr-10 py-3.5 bg-sky-50 border border-sky-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-700/20 focus:border-sky-700 outline-none transition-all font-bold text-gray-900"
                                    />
                                    {isSearchingLoc && <Loader2 className="w-5 h-5 text-sky-600 animate-spin absolute right-4 top-3.5" />}
                                </div>

                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="absolute w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-gray-50 top-full">
                                        {suggestions.map((place) => (
                                            <div key={place.place_id} onClick={() => handleSelectLocation(place)} className="p-4 hover:bg-sky-50 cursor-pointer flex gap-3 items-start transition-colors">
                                                <MapPin className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
                                                <span className="text-sm font-semibold text-gray-700 leading-tight">{place.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">State</label>
                                <div className="relative group">
                                    <Map className="w-5 h-5 text-gray-400 absolute left-4 top-3.5 group-focus-within:text-sky-700 transition-colors" />
                                    <input type="text" name="state" required value={techProfile.state} onChange={handleChange} className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-700/20 focus:border-sky-700 outline-none transition-all font-medium text-gray-900" />
                                </div>
                            </div>

                            <div className="space-y-2 md:col-span-3">
                                <label className="text-sm font-bold text-gray-700">Pincode</label>
                                <div className="relative group">
                                    <MapPin className="w-5 h-5 text-gray-400 absolute left-4 top-3.5 group-focus-within:text-sky-700 transition-colors" />
                                    <input type="text" name="pincode" required value={techProfile.pincode} onChange={handleChange} className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-700/20 focus:border-sky-700 outline-none transition-all font-medium text-gray-900" />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row justify-between items-center mt-12 pt-8 border-t border-gray-100 gap-4">
                            <button type="button" onClick={handleDelete} disabled={isDeleting} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-red-600 font-bold hover:bg-red-50 border border-transparent hover:border-red-100 transition-all cursor-pointer">
                                <Trash2 className="w-5 h-5" /> {isDeleting ? 'Deleting...' : 'Delete Account'}
                            </button>
                            <button type="submit" disabled={isLoading} className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800 text-white font-bold py-3.5 px-10 rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 cursor-pointer">
                                {isLoading ? "Saving..." : "Save Profile"}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default TechnicianProfile;