import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { User, MapPin, ArrowLeft, Trash2, Camera, Loader2, AlertCircle, Landmark, CheckCircle2 } from 'lucide-react';

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

    // Bank Details
    const [bank, setBank] = useState({
        accountHolderName: '', accountNumber: '', confirmAccountNumber: '', ifsc: ''
    });
    const [bankInfo, setBankInfo] = useState(null);
    const [checkingIfsc, setCheckingIfsc] = useState(false);
    const ifscTimer = useRef(null);

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
            } catch {
                navigate('/technician/admin/login');
            }
        };
        fetchProfile();
    }, [navigate]);

    useEffect(() => {
        if (techProfile?._id) {
            const currentPath = window.location.pathname;
            if (currentPath.startsWith("/technician/admin") && !currentPath.includes(techProfile._id)) {
                const suffix = currentPath.replace("/technician/admin", "");
                navigate(`/technician/admin/${techProfile._id}${suffix}`, { replace: true });
            }
        }
    }, [techProfile, navigate]);

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

    const handleBankChange = (e) => {
        const { name, value } = e.target;
        const clean = name === "ifsc" ? value.toUpperCase().replace(/\s/g, "") : value;
        setBank((prev) => ({ ...prev, [name]: clean }));

        if (name === "ifsc") {
            setBankInfo(null);
            if (ifscTimer.current) clearTimeout(ifscTimer.current);

            if (/^[A-Z]{4}0[A-Z0-9]{6}$/.test(clean)) {
                setCheckingIfsc(true);
                ifscTimer.current = setTimeout(async () => {
                    try {
                        const res = await api.get("/technician/ifsc/" + clean);
                        setBankInfo(res.data.data);
                    } catch {
                        setBankInfo(null);
                    } finally {
                        setCheckingIfsc(false);
                    }
                }, 500);
            } else {
                setCheckingIfsc(false);
            }
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

        // Bank validation if trying to add bank details
        if (!techProfile.bankDetails || !techProfile.bankDetails.accountLast4) {
            if (bank.accountHolderName || bank.accountNumber || bank.ifsc) {
                if (!bank.accountHolderName.trim()) return alert("Account holder name is required");
                if (!/^\d{9,18}$/.test(bank.accountNumber)) return alert("Invalid account number");
                if (bank.accountNumber !== bank.confirmAccountNumber) return alert("Account numbers do not match");
                if (!bankInfo) return alert("Invalid IFSC code");
            }
        }

        setIsLoading(true);

        const formData = new FormData();
        formData.append('name', techProfile.name);
        formData.append('phone', techProfile.phone);
        formData.append('state', techProfile.state);
        formData.append('area', techProfile.area);
        formData.append('pincode', techProfile.pincode);
        
        if (!techProfile.bankDetails || !techProfile.bankDetails.accountLast4) {
            if (bank.accountHolderName && bank.accountNumber && bank.ifsc && bankInfo) {
                formData.append('accountHolderName', bank.accountHolderName);
                formData.append('accountNumber', bank.accountNumber);
                formData.append('ifsc', bank.ifsc);
            }
        }

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
            alert(error.response?.data?.message || "Failed to update profile");
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
        } catch {
            alert("Failed to delete account");
            setIsDeleting(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col font-sans bg-white selection:bg-brand-tint selection:text-green-900">
            <header className="bg-white sticky top-0 z-50 border-b border-hairline px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <img 
                        src="https://ik.imagekit.io/ny6yinyut/cosmosgenLogo/cosmosgen-logo.png?updatedAt=1788413075959" 
                        alt="Cosmosgen Logo" 
                        className="h-6" 
                    />
                    <div className="flex flex-col hidden sm:flex">
                        <span className="cg-h2 leading-tight">Cosmosgen</span>
                        <span className="text-[9px] text-ink-soft uppercase tracking-widest leading-tight">Engineers Pvt. Ltd.</span>
                    </div>
                </div>
                <button 
                    onClick={() => navigate('/technician/admin')} 
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold bg-sunken text-ink hover:bg-sunken transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
            </header>

            <main className="w-full max-w-xl mx-auto px-6 py-8 flex-1 z-10">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-ink tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>Profile Settings</h2>
                    <p className="text-ink-soft text-sm font-medium mt-1">Manage your personal information and location.</p>
                </div>

                <form onSubmit={handleUpdate} className="space-y-8">
                    
                    {/* Photo Upload */}
                    <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-hairline">
                        <div className="relative group cursor-pointer">
                            <div className="w-28 h-28 rounded-full border-2 border-hairline overflow-hidden bg-sunken flex items-center justify-center shadow-sm">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                ) : techProfile.profileImage ? (
                                    <img src={techProfile.profileImage} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-10 h-10 text-ink-faint" />
                                )}
                            </div>
                            <label className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all cursor-pointer">
                                <Camera className="w-6 h-6 text-white mb-1" />
                                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Change</span>
                                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                            </label>
                        </div>
                        <div className="text-center sm:text-left">
                            <h3 className="text-lg font-bold text-ink" style={{ fontFamily: "'Outfit', sans-serif" }}>Profile Photo</h3>
                            <p className="text-sm text-ink-soft mt-1 max-w-[200px]">Click on the image to upload a new professional photo.</p>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="cg-label block mb-2">Full Name</label>
                            <input 
                                type="text" 
                                name="name" 
                                required 
                                value={techProfile.name} 
                                onChange={handleChange} 
                                className="cg-input" 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="cg-label block mb-2">Phone Number</label>
                            <input 
                                type="tel" 
                                name="phone" 
                                required 
                                value={techProfile.phone} 
                                onChange={handleChange} 
                                className="cg-input" 
                            />
                        </div>

                        {/* Smart Area Field */}
                        <div className="relative space-y-1.5 z-50">
                            <label className="cg-label block mb-2">Area / City (Search to Auto-fill)</label>
                            <div className="relative">
                                <MapPin className="w-4 h-4 text-ink-faint absolute left-3.5 top-3" />
                                <input
                                    type="text"
                                    name="area"
                                    required
                                    autoComplete="off"
                                    placeholder="Type area to fetch..."
                                    value={techProfile.area}
                                    onChange={handleAreaChange}
                                    className="cg-input pl-10 pr-10 font-medium"
                                />
                                {isSearchingLoc && <Loader2 className="w-4 h-4 text-brand animate-spin absolute right-3.5 top-3" />}
                            </div>

                            {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute w-full mt-1 cg-card shadow-lg max-h-56 overflow-y-auto z-50 divide-y divide-gray-100">
                                    {suggestions.map((place) => (
                                        <div key={place.place_id} onClick={() => handleSelectLocation(place)} className="p-3 hover:bg-brand-tint cursor-pointer flex gap-3 items-start transition-colors">
                                            <MapPin className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                                            <span className="text-sm font-medium text-ink leading-tight">{place.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="cg-label block mb-2">State</label>
                                <input 
                                    type="text" 
                                    name="state" 
                                    required 
                                    value={techProfile.state} 
                                    onChange={handleChange} 
                                    className="cg-input" 
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="cg-label block mb-2">Pincode</label>
                                <input 
                                    type="text" 
                                    name="pincode" 
                                    required 
                                    value={techProfile.pincode} 
                                    onChange={handleChange} 
                                    className="cg-input" 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bank Details */}
                    <div className="space-y-4 pt-6 border-t border-hairline">
                        <h3 className="text-lg font-bold text-ink" style={{ fontFamily: "'Outfit', sans-serif" }}>Bank Details</h3>
                        
                        {techProfile.bankDetails && techProfile.bankDetails.accountLast4 ? (
                            <div className="bg-sunken border border-hairline rounded-xl p-5 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">Account Holder</p>
                                        <p className="font-semibold text-ink">{techProfile.bankDetails.accountHolderName}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">Bank Name</p>
                                        <p className="font-semibold text-ink">{techProfile.bankDetails.bankName}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">Account Number</p>
                                        <p className="font-semibold text-ink">•••• •••• {techProfile.bankDetails.accountLast4}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">IFSC Code</p>
                                        <p className="font-semibold text-ink">{techProfile.bankDetails.ifsc}</p>
                                    </div>
                                </div>
                                <div className="pt-3 border-t border-hairline/60 mt-3">
                                    <p className="text-xs text-ink-soft flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0"></span>
                                        Verified branch: {techProfile.bankDetails.branch}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-warn-tint/50 border border-hairline rounded-xl p-5">
                                <div className="flex items-start gap-3 mb-6">
                                    <AlertCircle className="w-5 h-5 text-warn mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-bold text-warn">Bank details missing</p>
                                        <p className="text-sm text-warn mt-0.5">Please add your bank details below so we can process your payouts.</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="cg-label block mb-2">Account Holder Name</label>
                                        <input 
                                            type="text" 
                                            name="accountHolderName" 
                                            value={bank.accountHolderName} 
                                            onChange={handleBankChange} 
                                            placeholder="As per bank records"
                                            className="cg-input" 
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="cg-label block mb-2">Account Number</label>
                                            <input 
                                                type="password" 
                                                name="accountNumber" 
                                                value={bank.accountNumber} 
                                                onChange={handleBankChange} 
                                                className="cg-input" 
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="cg-label block mb-2">Confirm Account No.</label>
                                            <input 
                                                type="text" 
                                                name="confirmAccountNumber" 
                                                value={bank.confirmAccountNumber} 
                                                onChange={handleBankChange} 
                                                className="cg-input" 
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-1.5">
                                        <label className="cg-label block mb-2">IFSC Code</label>
                                        <div className="relative">
                                            <Landmark className="w-4 h-4 text-ink-faint absolute left-3.5 top-3" />
                                            <input 
                                                type="text" 
                                                name="ifsc" 
                                                value={bank.ifsc} 
                                                onChange={handleBankChange}
                                                placeholder="e.g. HDFC0001234"
                                                className="cg-input pl-10 pr-10 font-medium uppercase" 
                                            />
                                            {checkingIfsc && <Loader2 className="w-4 h-4 text-brand animate-spin absolute right-3.5 top-3" />}
                                            {bankInfo && !checkingIfsc && <CheckCircle2 className="w-4 h-4 text-brand absolute right-3.5 top-3" />}
                                        </div>
                                    </div>
                                    
                                    {bankInfo && (
                                        <div className="bg-white border border-hairline rounded-lg p-3 mt-2 flex items-start gap-2 shadow-sm">
                                            <Landmark className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-sm font-bold text-ink">{bankInfo.bank}</p>
                                                <p className="text-xs text-ink-soft mt-0.5">{bankInfo.branch}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>


                    <div className="flex flex-col-reverse sm:flex-row justify-between items-center pt-8 border-t border-hairline gap-4">
                        <button 
                            type="button" 
                            onClick={handleDelete} 
                            disabled={isDeleting} 
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-danger text-sm font-bold hover:bg-danger-tint transition-colors disabled:opacity-50"
                        >
                            <Trash2 className="w-4 h-4" /> {isDeleting ? 'Deleting...' : 'Delete Account'}
                        </button>
                        <button 
                            type="submit" 
                            disabled={isLoading} 
                            className="cg-btn cg-btn-go w-full sm:w-auto px-8"
                        >
                            {isLoading ? "Saving..." : "Save Profile"}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default TechnicianProfile;