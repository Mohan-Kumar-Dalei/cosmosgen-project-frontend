import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, getErrorMessage } from "../../services/api";
import { sendOtp, cleanupOtp, otpErrorMessage } from "../../services/firebase";
import {
    Eye, EyeOff, MapPin, CheckCircle2, AlertCircle,
    Loader2, Truck, Phone, ArrowLeft, ArrowRight, Landmark,
    ShieldCheck, Navigation, Camera, User
} from "lucide-react";

const SERVICE_OPTIONS = [
    "AC & Appliance Repair",
    "Electrical Issues",
    "Plumbing Services",
    "Home Cleaning",
];

const STEPS = [
    { key: 1, label: "Phone" },
    { key: 2, label: "Personal" },
    { key: 3, label: "Work & Location" },
    { key: 4, label: "Bank" },
];

import SplitCurve from "../../ui/SplitCurve";

const LOGO = "https://ik.imagekit.io/ny6yinyut/cosmosgenLogo/cosmosgen-logo.png?updatedAt=1788413075959";

const TechnicianRegister = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [submitted, setSubmitted] = useState(false);

    // Phase 1
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [confirmation, setConfirmation] = useState(null);
    const [idToken, setIdToken] = useState(null);
    const [resendIn, setResendIn] = useState(0);

    const [form, setForm] = useState({
        name: "",
        password: "",
        email: "",
        state: "Odisha",
        area: "",
        pincode: "",
        skills: [],
        hasVehicle: false,
    });
    
    const [profileImage, setProfileImage] = useState(null);
    const [profileImagePreview, setProfileImagePreview] = useState(null);

    const [bank, setBank] = useState({
        accountHolderName: "",
        accountNumber: "",
        confirmAccountNumber: "",
        ifsc: "",
    });
    const [bankInfo, setBankInfo] = useState(null);
    const [checkingIfsc, setCheckingIfsc] = useState(false);

    const [showPassword, setShowPassword] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const [coords, setCoords] = useState(null);
    const [locationStatus, setLocationStatus] = useState("idle");

    // Location Search States
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearchingLoc, setIsSearchingLoc] = useState(false);
    const [osmTimeout, setOsmTimeout] = useState(null);

    const ifscTimer = useRef(null);

    useEffect(() => () => cleanupOtp(), []);

    useEffect(() => {
        if (resendIn <= 0) return;
        const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
        return () => clearTimeout(t);
    }, [resendIn]);

    /* ---------------- PHASE 1: Phone ---------------- */

    const handleSendOtp = async () => {
        if (!/^[6-9]\d{9}$/.test(phone)) {
            setError("Enter a valid 10-digit mobile number");
            return;
        }

        setBusy(true);
        setError("");

        try {
            const conf = await sendOtp(phone);
            setConfirmation(conf);
            setResendIn(45);
        } catch (err) {
            setError(otpErrorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (otp.length !== 6) {
            setError("Enter the 6-digit code");
            return;
        }

        setBusy(true);
        setError("");

        try {
            const result = await confirmation.confirm(otp);
            const token = await result.user.getIdToken();

            const res = await api.post("/technician/verify-phone", { idToken: token });

            setIdToken(token);
            setStep(2);
            cleanupOtp();

            if (res.data.data?.phone) setPhone(res.data.data.phone);
        } catch (err) {
            if (err.response) {
                setError(getErrorMessage(err, "Could not verify that number"));
                if (err.response.data?.alreadyRegistered) {
                    setTimeout(() => navigate("/technician/admin/login"), 2500);
                }
            } else {
                setError(otpErrorMessage(err));
            }
        } finally {
            setBusy(false);
        }
    };

    /* ---------------- FORMS & LOCATION ---------------- */

    const handleAreaChange = (e) => {
        const val = e.target.value;
        setForm(prev => ({ ...prev, area: val }));
        if (val.trim().length >= 3) {
            setIsSearchingLoc(true);
            if (osmTimeout) clearTimeout(osmTimeout);
            const timeoutId = setTimeout(async () => {
                try {
                    const res = await api.get(`/map/search?q=${encodeURIComponent(val)}`);
                    setSuggestions(res.data.data);
                    setShowSuggestions(true);
                } catch (error) {
                    console.error('OSM Fetch Error:', error);
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

    const handleSelectLocation = (place) => {
        setForm(prev => ({ 
            ...prev, 
            state: place.state || '', 
            area: place.area || place.label || '', 
            pincode: place.pincode || '' 
        }));
        setCoords({ lat: place.lat, lon: place.lon });
        setShowSuggestions(false);
    };

    const handleGpsLocation = () => {
        if (!navigator.geolocation) {
            setLocationStatus('denied');
            return;
        }
        setLocationStatus('requesting');
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const res = await api.get(`/map/rev-geocode?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
                    const result = res.data.data?.results?.[0];
                    if (result) {
                        setForm(prev => ({
                            ...prev,
                            state: result.state || prev.state,
                            area: result.locality || result.city || prev.area,
                            pincode: result.pincode || prev.pincode,
                        }));
                        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
                    }
                    setLocationStatus('granted');
                } catch {
                    setLocationStatus('denied');
                }
            },
            () => setLocationStatus('denied'),
            { timeout: 10000, enableHighAccuracy: true }
        );
    };

    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm({ ...form, [name]: type === "checkbox" ? checked : value });
        setError("");
    };

    const toggleSkill = (skill) => {
        setForm((prev) => ({
            ...prev,
            skills: prev.skills.includes(skill)
                ? prev.skills.filter((s) => s !== skill)
                : [...prev.skills, skill],
        }));
        setError("");
    };
    
    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileImage(file);
            setProfileImagePreview(URL.createObjectURL(file));
        }
    };

    const personalComplete = form.name.trim() && form.password.length >= 6;
    
    const goToWorkLocation = () => {
        if (!personalComplete) {
            setError("Please provide your name and a password of at least 6 characters.");
            return;
        }
        setError("");
        setStep(3);
    };

    const workComplete = form.area.trim() && form.pincode.trim() && form.state.trim() && form.skills.length > 0;

    const goToBank = () => {
        if (!workComplete) {
            setError("Please fill in your location and select at least one skill.");
            return;
        }
        setError("");
        setStep(4);
    };

    /* ---------------- PHASE 4: Bank ---------------- */

    const handleBankChange = (e) => {
        const { name, value } = e.target;
        const clean = name === "ifsc" ? value.toUpperCase().replace(/\s/g, "") : value;
        setBank((prev) => ({ ...prev, [name]: clean }));
        setError("");

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

    const accountsMatch =
        bank.accountNumber.length > 0 &&
        bank.accountNumber === bank.confirmAccountNumber;

    const bankComplete =
        bank.accountHolderName.trim() &&
        /^\d{9,18}$/.test(bank.accountNumber) &&
        accountsMatch &&
        bankInfo;

    const handleSubmit = async () => {
        if (!bankComplete) {
            setError("Please check your bank details");
            return;
        }

        setBusy(true);
        setError("");

        try {
            const formData = new FormData();
            formData.append("idToken", idToken);
            formData.append("name", form.name);
            formData.append("password", form.password);
            if (form.email) formData.append("email", form.email);
            formData.append("state", form.state);
            formData.append("area", form.area);
            formData.append("pincode", form.pincode);
            formData.append("hasVehicle", form.hasVehicle);
            
            // Append skills as JSON array
            formData.append("skills", JSON.stringify(form.skills));
            
            formData.append("accountHolderName", bank.accountHolderName);
            formData.append("accountNumber", bank.accountNumber);
            formData.append("ifsc", bank.ifsc);

            if (coords) {
                formData.append("lat", coords.lat);
                formData.append("lon", coords.lon);
            }
            
            if (profileImage) {
                formData.append("profileImage", profileImage);
            }

            await api.post("/technician/register", formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });
            
            setSubmitted(true);
        } catch (err) {
            setError(getErrorMessage(err, "Registration failed"));
            if (err.response?.status === 401) {
                setTimeout(() => { setStep(1); setIdToken(null); setConfirmation(null); }, 2500);
            }
        } finally {
            setBusy(false);
        }
    };

    /* ---------------- DONE ---------------- */

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
                <div className="w-full max-w-sm cg-lift p-8 text-center">
                    <div className="w-14 h-14 rounded-full bg-warn-tint flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="w-7 h-7 text-warn" />
                    </div>
                    <h1 className="text-xl font-bold text-ink mb-2">Application submitted</h1>
                    <p className="text-ink-soft text-sm mb-6">
                        The office will review your details. You'll be able to sign in with
                        your phone number once they approve it.
                    </p>
                    <Link
                        to="/technician/admin/login"
                        className="cg-btn cg-btn-go block w-full py-3"
                    >
                        Go to sign in
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-canvas lg:flex 2xl:text-lg">
            <SplitCurve />


            {/* THE PANEL - a column beside the form on a desktop, a lit band
                above it on a phone. Folded, never dropped. */}
            <aside className="cg-rich-dark cg-split-curve lg:w-[50%] xl:w-[52%] shrink-0 flex flex-col justify-between px-6 pt-8 pb-14 sm:px-10 lg:px-14 xl:px-20 lg:py-14 lg:sticky lg:top-0 lg:h-screen">
                <div className="flex items-center gap-2.5">
                    <img src={LOGO} alt="Cosmosgen" className="h-9 w-9 rounded-full bg-white p-[3px] object-contain" />
                    <div className="flex flex-col">
                        <span className="font-display font-semibold text-[17px] tracking-tight leading-none text-white">
                            Cosmosgen
                        </span>
                        <span className="text-[9px] text-white/40 uppercase tracking-[0.16em] leading-none mt-1">
                            Engineers Pvt. Ltd.
                        </span>
                    </div>
                </div>

                <div className="mt-7 lg:mt-0 lg:max-w-md">
                    <span className="cg-pill bg-white/10 text-white/70 uppercase tracking-[0.14em] mb-4 hidden lg:inline-flex">
                        Join as a vendor
                    </span>

                    <h2 className="font-display text-[1.75rem] sm:text-4xl lg:text-[3rem] xl:text-[3.4rem] font-semibold leading-[1.06] tracking-[-0.035em] text-white">
                        Work near
                        <span className="text-brand"> home.</span>
                    </h2>

                    <p className="mt-4 lg:mt-6 text-[13px] lg:text-[15px] text-white/60 leading-relaxed max-w-sm">
                        Jobs come to you based on where you are. Set your location once and the
                        closest work reaches you first. No bidding, no waiting around, and no
                        travelling across the city for a small job.
                    </p>

                    {/* Where he is in the form, on the panel rather than above
                        the fields - four steps is enough to make a person
                        wonder how much is left. */}
                    <div className="mt-6 lg:mt-9 rounded-2xl border border-white/10 bg-white/[0.07] px-5 py-4">
                        <div className="flex items-center gap-1.5 mb-3">
                            {STEPS.map((s) => (
                                <div
                                    key={s.key}
                                    className={"h-1 rounded-full transition-all duration-300 " + (
                                        step === s.key ? "w-10 bg-brand"
                                            : step > s.key ? "w-6 bg-brand/40"
                                                : "w-6 bg-white/15"
                                    )}
                                />
                            ))}
                        </div>
                        <p className="cg-label text-white/35">Step {step} of {STEPS.length}</p>
                        <p className="text-sm font-semibold text-white mt-1.5">
                            {STEPS.map((s) => (step === s.key ? s.label : ""))}
                        </p>
                    </div>
                </div>

                <p className="hidden lg:block text-xs text-white/30">© Cosmosgen 2026</p>
            </aside>

            {/* THE FORM */}
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:px-8 lg:min-h-screen lg:py-14">
                <div className="w-full max-w-md">
                    <div className="cg-card w-full px-6 py-7 sm:px-8 sm:py-9">

                    {error && (
                        <div className="mb-4 p-3 bg-danger-tint border border-hairline rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 2xl:w-5 2xl:h-5 text-danger shrink-0 mt-0.5" />
                            <p className="text-sm 2xl:text-base text-danger">{error}</p>
                        </div>
                    )}

                    {/* ============ PHASE 1: Phone ============ */}
                    {step === 1 && (
                        <>
                            <div className="mb-6 2xl:mb-8">
                                <h1 className="text-2xl sm:text-3xl 2xl:text-4xl font-bold text-ink mb-2 tracking-tight">
                                    {confirmation ? "Enter the code" : "Join as a vendor"}
                                </h1>
                                <p className="text-ink-soft text-sm 2xl:text-base">
                                    {confirmation
                                        ? "We sent a 6-digit code to +91 " + phone
                                        : "We'll send a code to confirm your number."}
                                </p>
                            </div>

                            {!confirmation ? (
                                <>
                                    <label className="cg-label block mb-2">
                                        Mobile number
                                    </label>
                                    <div className="relative mb-1">
                                        <span className="absolute left-3.5 2xl:left-4 top-1/2 -translate-y-1/2 text-sm 2xl:text-base text-ink-soft font-medium">
                                            +91
                                        </span>
                                        <input
                                            type="tel"
                                            inputMode="numeric"
                                            maxLength={10}
                                            value={phone}
                                            onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setError(""); }}
                                            placeholder="9876543210"
                                            className="cg-input pl-12 pr-3.5 py-3 2xl:py-4 2xl:pl-14 text-base 2xl:text-lg"
                                        />
                                    </div>
                                    <p className="text-xs 2xl:text-sm text-ink-faint mb-5 2xl:mb-8">
                                        You'll sign in with this number later.
                                    </p>

                                    <button
                                        onClick={handleSendOtp}
                                        disabled={busy || phone.length !== 10}
                                        className="cg-btn cg-btn-primary w-full py-3 2xl:py-4 2xl:text-base"
                                    >
                                        {busy ? <Loader2 className="w-4 h-4 2xl:w-5 2xl:h-5 animate-spin" /> : <Phone className="w-4 h-4 2xl:w-5 2xl:h-5" />}
                                        Send code
                                    </button>
                                </>
                            ) : (
                                <>
                                    <label className="cg-label block mb-2">
                                        6-digit code
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        autoFocus
                                        value={otp}
                                        onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
                                        placeholder="123456"
                                        className="cg-input py-3 2xl:py-4 text-center text-2xl 2xl:text-3xl font-bold tracking-[0.4em] mb-4 2xl:mb-6"
                                    />

                                    <button
                                        onClick={handleVerifyOtp}
                                        disabled={busy || otp.length !== 6}
                                        className="cg-btn cg-btn-primary w-full py-3 2xl:py-4 2xl:text-base mb-3"
                                    >
                                        {busy ? <Loader2 className="w-4 h-4 2xl:w-5 2xl:h-5 animate-spin" /> : <ShieldCheck className="w-4 h-4 2xl:w-5 2xl:h-5" />}
                                        Verify
                                    </button>

                                    <div className="flex items-center justify-between text-sm 2xl:text-base">
                                        <button
                                            onClick={() => { setConfirmation(null); setOtp(""); setError(""); cleanupOtp(); }}
                                            className="text-ink-soft hover:text-ink font-medium"
                                        >
                                            Change number
                                        </button>
                                        <button
                                            onClick={handleSendOtp}
                                            disabled={resendIn > 0 || busy}
                                            className="text-accent hover:text-accent-deep font-semibold disabled:text-ink-faint"
                                        >
                                            {resendIn > 0 ? "Resend in " + resendIn + "s" : "Resend code"}
                                        </button>
                                    </div>
                                </>
                            )}

                            <div id="recaptcha-container" />
                        </>
                    )}

                    {/* ============ PHASE 2: Personal ============ */}
                    {step === 2 && (
                        <>
                            <div className="mb-6 2xl:mb-8">
                                <h1 className="text-2xl sm:text-3xl 2xl:text-4xl font-bold text-ink mb-2 tracking-tight">
                                    Personal details
                                </h1>
                                <p className="text-ink-soft text-sm 2xl:text-base flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 text-brand" />
                                    +91 {phone} verified
                                </p>
                            </div>
                            
                            {/* Photo Upload */}
                            <div className="flex flex-col items-center mb-8 2xl:mb-10">
                                <label className="relative flex flex-col items-center justify-center w-24 h-24 2xl:w-28 2xl:h-28 rounded-full bg-sunken border-2 border-dashed border-hairline-strong hover:border-accent hover:bg-accent-tint transition-colors cursor-pointer overflow-hidden group">
                                    {profileImagePreview ? (
                                        <>
                                            <img src={profileImagePreview} alt="Profile preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Camera className="w-6 h-6 text-white mb-1" />
                                                <span className="text-[10px] text-white font-medium">Change</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center text-ink-faint group-hover:text-brand transition-colors">
                                            <User className="w-8 h-8 2xl:w-10 2xl:h-10 mb-1" />
                                            <span className="text-[10px] font-medium uppercase tracking-wider">Photo</span>
                                        </div>
                                    )}
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={handlePhotoChange} 
                                    />
                                </label>
                            </div>

                            <label className="cg-label block mb-2">Full name</label>
                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleFormChange}
                                placeholder="Your full name"
                                className="cg-input py-3 2xl:py-4 text-base 2xl:text-lg mb-4 2xl:mb-6"
                            />

                            <label className="cg-label block mb-2">Password</label>
                            <div className="relative mb-1">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={form.password}
                                    onChange={handleFormChange}
                                    placeholder="At least 6 characters"
                                    className="cg-input pl-3.5 pr-10 py-3 2xl:py-4 text-base 2xl:text-lg"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-faint hover:text-ink-soft"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4 2xl:w-5 2xl:h-5" /> : <Eye className="h-4 w-4 2xl:w-5 2xl:h-5" />}
                                </button>
                            </div>
                            <p className="text-xs 2xl:text-sm text-ink-faint mb-4 2xl:mb-6">You'll use this with your number to sign in.</p>

                            <label className="cg-label block mb-2">
                                Email <span className="font-normal text-ink-faint">(optional)</span>
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleFormChange}
                                placeholder="you@example.com"
                                className="cg-input py-3 2xl:py-4 text-base 2xl:text-lg mb-6 2xl:mb-8"
                            />

                            <button
                                onClick={goToWorkLocation}
                                disabled={!personalComplete}
                                className="cg-btn cg-btn-primary w-full py-3 2xl:py-4 2xl:text-base"
                            >
                                Continue to work & location
                                <ArrowRight className="w-4 h-4 2xl:w-5 2xl:h-5" />
                            </button>
                        </>
                    )}

                    {/* ============ PHASE 3: Work & Location ============ */}
                    {step === 3 && (
                        <>
                            <button
                                onClick={() => { setStep(2); setError(""); }}
                                className="flex items-center gap-1.5 text-sm 2xl:text-base text-ink-soft hover:text-ink font-medium mb-4 2xl:mb-6 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4 2xl:w-5 2xl:h-5" />
                                Back to personal details
                            </button>

                            <div className="mb-6 2xl:mb-8">
                                <h1 className="text-2xl sm:text-3xl 2xl:text-4xl font-bold text-ink mb-2 tracking-tight">
                                    Work & Location
                                </h1>
                                <p className="text-ink-soft text-sm 2xl:text-base">
                                    Tell us what you do and where you can work.
                                </p>
                            </div>

                            <label className="cg-label block mb-2.5">
                                What work do you do?
                            </label>
                            <div className="space-y-2 mb-5 2xl:mb-8">
                                {SERVICE_OPTIONS.map((skill) => (
                                    <button
                                        key={skill}
                                        type="button"
                                        onClick={() => toggleSkill(skill)}
                                        className={"w-full flex items-center gap-2.5 2xl:gap-3 p-3.5 2xl:p-4 rounded-xl border-2 text-left transition-colors " + (form.skills.includes(skill) ? "border-green-600 bg-brand-tint" : "border-hairline")}
                                    >
                                        <div className={"w-5 h-5 2xl:w-6 2xl:h-6 rounded border-2 flex items-center justify-center shrink-0 " + (form.skills.includes(skill) ? "bg-brand border-green-600" : "border-hairline-strong")}>
                                            {form.skills.includes(skill) && <CheckCircle2 className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 text-white" />}
                                        </div>
                                        <span className="text-sm 2xl:text-base font-medium text-ink">{skill}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="mb-4 2xl:mb-6">
                                <label className="cg-label block mb-2">Search Area / Location</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                        <MapPin className="h-4 w-4 2xl:w-5 2xl:h-5 text-ink-faint" />
                                    </div>
                                    <input
                                        type="text"
                                        value={form.area}
                                        onChange={handleAreaChange}
                                        onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                                        placeholder="Type your area (e.g. Patia, Bhubaneswar)"
                                        className="cg-input pl-9 pr-10 py-3 2xl:py-4 text-base 2xl:text-lg"
                                    />
                                    {isSearchingLoc && (
                                        <div className="absolute inset-y-0 right-3 flex items-center">
                                            <Loader2 className="w-4 h-4 2xl:w-5 2xl:h-5 animate-spin text-brand" />
                                        </div>
                                    )}

                                    {showSuggestions && suggestions.length > 0 && (
                                        <ul className="absolute z-50 w-full mt-1 cg-card shadow-lg max-h-60 overflow-auto">
                                            {suggestions.map((place, idx) => (
                                                <li
                                                    key={idx}
                                                    onClick={() => handleSelectLocation(place)}
                                                    className="px-4 py-3 hover:bg-sunken cursor-pointer border-b border-hairline last:border-0 flex items-start gap-3"
                                                >
                                                    <MapPin className="w-4 h-4 2xl:w-5 2xl:h-5 text-ink-faint mt-1 shrink-0" />
                                                    <div>
                                                        <p className="text-sm 2xl:text-base font-medium text-ink">{place.label || place.area}</p>
                                                        {(place.state || place.pincode) && (
                                                            <p className="text-xs 2xl:text-sm text-ink-soft mt-0.5">
                                                                {[place.state, place.pincode].filter(Boolean).join(', ')}
                                                            </p>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div className="mt-2 text-right">
                                    <button 
                                        type="button" 
                                        onClick={handleGpsLocation}
                                        className="inline-flex items-center gap-1.5 text-xs 2xl:text-sm font-medium text-brand hover:text-brand transition-colors"
                                    >
                                        {locationStatus === 'requesting' ? (
                                            <Loader2 className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 animate-spin" />
                                        ) : locationStatus === 'granted' ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                                        ) : (
                                            <Navigation className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                                        )}
                                        {locationStatus === 'granted' ? 'Location Detected' : 'Detect my location (GPS)'}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4 2xl:mb-6">
                                <div>
                                    <label className="cg-label block mb-2">State</label>
                                    <input
                                        type="text"
                                        name="state"
                                        value={form.state}
                                        onChange={handleFormChange}
                                        className="cg-input py-3 2xl:py-4 text-base 2xl:text-lg bg-sunken"
                                    />
                                </div>
                                <div>
                                    <label className="cg-label block mb-2">Pincode</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        name="pincode"
                                        value={form.pincode}
                                        onChange={handleFormChange}
                                        placeholder="751024"
                                        className="cg-input py-3 2xl:py-4 text-base 2xl:text-lg bg-sunken"
                                    />
                                </div>
                            </div>

                            <label className="flex items-center gap-2.5 2xl:gap-3 p-3.5 2xl:p-4 rounded-xl border border-hairline cursor-pointer mb-6 2xl:mb-8 hover:bg-sunken transition-colors">
                                <input
                                    type="checkbox"
                                    name="hasVehicle"
                                    checked={form.hasVehicle}
                                    onChange={handleFormChange}
                                    className="w-4 h-4 2xl:w-5 2xl:h-5 accent-green-600"
                                />
                                <Truck className="w-4 h-4 2xl:w-5 2xl:h-5 text-ink-faint" />
                                <span className="text-sm 2xl:text-base text-ink">I have my own vehicle</span>
                            </label>

                            <button
                                onClick={goToBank}
                                disabled={!workComplete}
                                className="cg-btn cg-btn-primary w-full py-3 2xl:py-4 2xl:text-base"
                            >
                                Continue to bank details
                                <ArrowRight className="w-4 h-4 2xl:w-5 2xl:h-5" />
                            </button>
                        </>
                    )}

                    {/* ============ PHASE 4: Bank ============ */}
                    {step === 4 && (
                        <>
                            <button
                                onClick={() => { setStep(3); setError(""); }}
                                className="flex items-center gap-1.5 text-sm 2xl:text-base text-ink-soft hover:text-ink font-medium mb-4 2xl:mb-6 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4 2xl:w-5 2xl:h-5" />
                                Back to work & location
                            </button>

                            <div className="mb-6 2xl:mb-8">
                                <h1 className="text-2xl sm:text-3xl 2xl:text-4xl font-bold text-ink mb-2 tracking-tight">
                                    Bank details
                                </h1>
                                <p className="text-ink-soft text-sm 2xl:text-base">
                                    This is where your earnings from online jobs get paid.
                                </p>
                            </div>

                            <label className="cg-label block mb-2">
                                Account holder name
                            </label>
                            <input
                                type="text"
                                name="accountHolderName"
                                value={bank.accountHolderName}
                                onChange={handleBankChange}
                                placeholder="Exactly as it appears on the passbook"
                                className="cg-input py-3 2xl:py-4 text-base 2xl:text-lg mb-4 2xl:mb-6"
                            />

                            <label className="cg-label block mb-2">
                                Account number
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                name="accountNumber"
                                value={bank.accountNumber}
                                onChange={handleBankChange}
                                placeholder="Your bank account number"
                                className="cg-input py-3 2xl:py-4 text-base 2xl:text-lg mb-3 2xl:mb-4"
                            />

                            <label className="cg-label block mb-2">
                                Confirm account number
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                name="confirmAccountNumber"
                                value={bank.confirmAccountNumber}
                                onChange={handleBankChange}
                                placeholder="Type it again"
                                className={"w-full px-3.5 py-3 2xl:py-4 border rounded-lg text-base 2xl:text-lg focus:outline-none focus:ring-2 mb-1 " + (bank.confirmAccountNumber && !accountsMatch ? "border-red-300 focus:ring-red-200 focus:border-red-400" : "border-hairline-strong focus:ring-brand/15 focus:border-brand")}
                            />
                            {bank.confirmAccountNumber && !accountsMatch && (
                                <p className="text-xs 2xl:text-sm text-danger mb-3">The two numbers don't match.</p>
                            )}
                            {accountsMatch && <div className="mb-3 2xl:mb-4" />}

                            <label className="cg-label block mb-2">IFSC code</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="ifsc"
                                    maxLength={11}
                                    value={bank.ifsc}
                                    onChange={handleBankChange}
                                    placeholder="SBIN0001234"
                                    className="cg-input pr-10 py-3 2xl:py-4 text-base 2xl:text-lg uppercase"
                                />
                                {checkingIfsc && (
                                    <Loader2 className="w-4 h-4 2xl:w-5 2xl:h-5 text-ink-faint animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                                )}
                            </div>

                            {bankInfo ? (
                                <div className="mt-2 p-3.5 2xl:p-4 bg-brand-tint border border-hairline rounded-xl flex items-start gap-2.5 mb-5 2xl:mb-8">
                                    <Landmark className="w-4 h-4 2xl:w-5 2xl:h-5 text-brand shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                        <p className="text-sm 2xl:text-base font-semibold text-green-900">{bankInfo.bank}</p>
                                        <p className="text-xs 2xl:text-sm text-brand mt-0.5">
                                            {bankInfo.branch}, {bankInfo.city}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs 2xl:text-sm text-ink-faint mt-1.5 mb-5 2xl:mb-8">
                                    11 characters, printed on your cheque book and passbook.
                                </p>
                            )}

                            <div className="p-3.5 2xl:p-4 bg-info-tint border border-hairline rounded-xl mb-5 2xl:mb-8">
                                <p className="text-xs 2xl:text-sm text-info">
                                    Cash jobs stay with you and only the commission is charged.
                                    Online jobs are paid into this account.
                                </p>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={busy || !bankComplete}
                                className="cg-btn cg-btn-primary w-full py-3 2xl:py-4 2xl:text-base"
                            >
                                {busy && <Loader2 className="w-4 h-4 2xl:w-5 2xl:h-5 animate-spin" />}
                                Submit application
                            </button>
                        </>
                    )}

                    {step === 1 && (
                        <p className="text-center text-sm 2xl:text-base text-ink-soft mt-6 2xl:mt-8">
                            Already have an account?{" "}
                            <Link to="/technician/admin/login" className="text-accent font-semibold hover:text-accent-deep">
                                Sign in
                            </Link>
                        </p>
                    )}
                </div>

                <div className="flex justify-between items-center text-xs text-ink-faint mt-7 font-medium w-full">
                    <p>© Cosmosgen 2026</p>
                    <a href="mailto:support@cosmosgen.com" className="hover:text-ink-soft transition-colors">
                        support@cosmosgen.com
                    </a>
                </div>
                </div>
            </main>
        </div>
    );
};

export default TechnicianRegister;