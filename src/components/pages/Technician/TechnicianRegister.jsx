import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, getErrorMessage } from "../../services/api";
import { WhatsAppMark } from "../Customer/Marks";
import {
    Eye, EyeOff, MapPin, CheckCircle2, AlertCircle,
    Loader2, Truck, ArrowLeft, ArrowRight, Landmark,
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
    { key: 3, label: "Your work" },
    { key: 4, label: "Location" },
    { key: 5, label: "Bank" },
];

import SplitCurve from "../../ui/SplitCurve";

const LOGO = "https://ik.imagekit.io/ny6yinyut/cosmosgenLogo/cosmosgen-logo.png?updatedAt=1788413075959";

/**
 * A fresh token for one autocomplete session.
 *
 * Google groups every keystroke and the one details lookup that follows into
 * a single billed session, but only when they all carry the same token. Any
 * unique string does; `crypto.randomUUID` where it exists, and a timestamp
 * with some randomness where it does not.
 */
const newSession = () => (
    typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : "s" + Date.now() + Math.random().toString(36).slice(2)
);

const TechnicianRegister = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [submitted, setSubmitted] = useState(false);

    // Phase 1
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    /*
     * The code is ours now, not Firebase's.
     *
     * The app has always verified a vendor with a six digit code sent on
     * WhatsApp and checked by this server; the web panel was the odd one out,
     * standing up a whole Firebase phone-auth flow - an SMS bill, a reCAPTCHA
     * in the corner of the page, and a second definition of "this number is
     * really yours" - to reach the same place. `sent` is whether a code is
     * outstanding, and `phoneToken` is what the server hands back once it has
     * been proved.
     */
    const [sent, setSent] = useState(false);
    const [phoneToken, setPhoneToken] = useState(null);
    const [resendIn, setResendIn] = useState(0);

    const [form, setForm] = useState({
        name: "",
        password: "",
        email: "",
        state: "Odisha",
        city: "",
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

    /*
     * The suggestions, and the town and search they belong to.
     *
     * Kept together rather than as a bare list, so a set fetched for one town
     * or one half-typed word can never be shown against another - and so
     * nothing has to be cleared, which is what kept dragging a synchronous
     * setState into the effect below.
     */
    const [areaFor, setAreaFor] = useState({ city: "", term: "", list: [] });

    /*
     * One billing session per search.
     *
     * Google charges autocomplete by the request unless every keystroke and
     * the final details lookup carry the same session token - then the whole
     * episode is one charge. A ref rather than state: changing it must not
     * re-render anything, and it is replaced the moment a locality is picked.
     */
    const areaSession = useRef(newSession());

    /*
     * Both of these are worked out while rendering rather than stored.
     *
     * "Still loading" is exactly "what we hold is for a different search" -
     * there is nothing a second piece of state could know that this does not,
     * and keeping one meant setting it inside the effect, which is the
     * cascading render React warns about.
     */
    const areaList = areaFor.city === form.city && areaFor.term === form.area
        ? areaFor.list
        : [];
    const loadingAreas = Boolean(form.city.trim())
        && (areaFor.city !== form.city || areaFor.term !== form.area);

    const ifscTimer = useRef(null);


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
            const res = await api.post("/technician/signup-otp", { phone });

            setSent(true);
            setResendIn(res.data.data?.retryAfter || 45);
        } catch (err) {
            setError(getErrorMessage(err, "Could not send the code"));
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
            const res = await api.post("/technician/signup-otp/verify", { phone, code: otp });

            setPhoneToken(res.data.data.phoneToken);
            setStep(2);

            if (res.data.data?.phone) setPhone(res.data.data.phone);
        } catch (err) {
            setError(getErrorMessage(err, "Could not verify that number"));

            if (err.response?.data?.alreadyRegistered) {
                setTimeout(() => navigate("/vendor/admin/login"), 2500);
            }
        } finally {
            setBusy(false);
        }
    };

    /* ---------------- FORMS & LOCATION ---------------- */

    /*
     * The town, from Google, restricted to places that are actually towns.
     *
     * One provider for every suggestion on this form, which is what the office
     * asked for: a vendor typing a town and a vendor typing his locality
     * should get the same kind of answer. The server falls back to the
     * company's own bundled list when there is no key or Google is down.
     *
     * The session token groups the whole search and the details lookup that
     * follows into a single charge instead of one per keystroke - and it is
     * the same token the locality search below uses, because a vendor filling
     * in where he works is one episode as far as the billing goes.
     */
    const handleCityChange = (e) => {
        const val = e.target.value;
        setForm(prev => ({ ...prev, city: val }));

        if (osmTimeout) clearTimeout(osmTimeout);

        if (!val.trim()) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        setIsSearchingLoc(true);
        const timeoutId = setTimeout(async () => {
            try {
                const res = await api.get("/map/cities", {
                    params: { q: val, session: areaSession.current },
                });
                setSuggestions(res.data.data || []);
                setShowSuggestions(true);
            } catch {
                setSuggestions([]);
            } finally {
                setIsSearchingLoc(false);
            }
        }, 300);
        setOsmTimeout(timeoutId);
    };

    /*
     * Picking a town settles the state, and the pincode if it is still blank.
     *
     * A Google prediction carries only a place id, so the rest costs one more
     * lookup - the call that also closes the billing session. The bundled
     * fallback already knows its own state and pincode and costs nothing.
     *
     * The locality below is cleared either way: a town changed and an old
     * neighbourhood left sitting under it is how a vendor ends up filed in
     * Rasulgarh, Sambalpur.
     */
    const handleSelectCity = async (town) => {
        setShowSuggestions(false);
        setSuggestions([]);
        setForm(prev => ({ ...prev, city: town.city, area: "" }));

        if (town.state) {
            setForm(prev => ({
                ...prev,
                state: town.state,
                pincode: prev.pincode.trim() || town.pincode || "",
            }));
            return;
        }

        if (!town.placeId) return;

        try {
            const res = await api.get("/map/place", {
                params: { placeId: town.placeId, session: areaSession.current },
            });
            const found = res.data.data || {};

            setForm(prev => ({
                ...prev,
                state: found.state || prev.state,
                pincode: prev.pincode.trim() || found.pincode || "",
            }));
            if (found.lat != null) setCoords({ lat: found.lat, lon: found.lon });
        } catch {
            // The name stands; the state and pincode are typed
        } finally {
            areaSession.current = newSession();
        }
    };

    /*
     * Localities inside the chosen town, as the vendor types.
     *
     * Google answers this, which the office chose knowingly: India Post's
     * directory is free but lists post offices, and half of what people
     * actually call their neighbourhood - Palasuni, Jagamara - has no post
     * office of its own and so does not exist in it. The server still falls
     * back to that free list when Google has nothing or is unreachable.
     *
     * The session token is what keeps this affordable. Minted once when the
     * field is first used and carried through every keystroke and the final
     * details lookup, Google bills the whole episode as a single session
     * rather than one charge per letter. It is thrown away the moment a
     * locality is picked, so the next search starts a new one.
     */
    useEffect(() => {
        const city = String(form.city || "").trim();
        const term = String(form.area || "").trim();

        if (!city) return undefined;
        if (areaFor.city === city && areaFor.term === term) return undefined;

        let alive = true;
        const wait = setTimeout(() => {
            api.get("/map/areas", { params: { city, q: term, session: areaSession.current } })
                .then((res) => {
                    if (alive) setAreaFor({ city, term, list: res.data.data || [] });
                })
                .catch(() => {
                    if (alive) setAreaFor({ city, term, list: [] });
                });
        }, 300);

        return () => { alive = false; clearTimeout(wait); };
    }, [form.city, form.area, areaFor.city, areaFor.term]);

    /*
     * Picking a locality settles the pincode with it.
     *
     * A Google prediction carries only a place id, so its pincode costs one
     * more lookup - the call that also closes the billing session. A row from
     * the free list already knows its own pincode and costs nothing.
     *
     * Either way the pincode stays editable underneath, for the corner filed
     * under a neighbour's number.
     */
    const handlePickArea = async (item) => {
        setForm((prev) => ({ ...prev, area: item.name }));
        setAreaFor((prev) => ({ ...prev, term: item.name, list: [] }));

        if (item.pincode) {
            setForm((prev) => ({ ...prev, pincode: item.pincode }));
            return;
        }

        if (!item.placeId) return;

        try {
            const res = await api.get("/map/place", {
                params: { placeId: item.placeId, session: areaSession.current },
            });
            const found = res.data.data || {};

            setForm((prev) => ({ ...prev, pincode: found.pincode || prev.pincode }));

            // The pin as a bonus: a vendor who never presses "use my location"
            // still lands on the office's map, which is what dispatch runs on
            if (found.lat != null) setCoords({ lat: found.lat, lon: found.lon });
        } catch {
            // The name stands; only the pincode is missing and it is typed
        } finally {
            // Session spent - the next search is a new one
            areaSession.current = newSession();
        }
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
                        /*
                         * The pin fills in the precise half and leaves the
                         * town alone. The town is a choice from a list and
                         * must stay one - a reverse geocode that answers
                         * "Khordha" for somebody who works out of Jatni would
                         * silently refile him. What the pin is genuinely
                         * better at is the exact pincode and a street to
                         * start the address from.
                         */
                        setForm(prev => ({
                            ...prev,
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

    // What he does, and where he does it, are two separate answers now - so
    // each step only knows whether its own is finished
    const workComplete = form.skills.length > 0;

    // Town and locality together are the whole answer. There is no street
    // address to fill in any more: an engineer navigates to the pin, and the
    // office rings the number - neither of them ever read a house number.
    const locationComplete =
        form.city.trim() && form.area.trim() && form.pincode.trim() && form.state.trim();

    const goToLocation = () => {
        if (!workComplete) {
            setError("Pick at least one kind of work you do.");
            return;
        }
        setError("");
        setStep(4);
    };

    const goToBank = () => {
        if (!locationComplete) {
            setError("Pick your town and then your area.");
            return;
        }
        setError("");
        setStep(5);
    };

    /* ---------------- PHASE 5: Bank ---------------- */

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
            formData.append("phoneToken", phoneToken);
            formData.append("name", form.name);
            formData.append("password", form.password);
            if (form.email) formData.append("email", form.email);
            formData.append("state", form.state);
            formData.append("city", form.city);
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
                // The proof of the number has expired, so it is asked for again
                setTimeout(() => { setStep(1); setPhoneToken(null); setSent(false); }, 2500);
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
                        to="/vendor/admin/login"
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
                                    {sent ? "Enter the code" : "Join as a vendor"}
                                </h1>
                                <p className="text-ink-soft text-sm 2xl:text-base">
                                    {sent
                                        ? "We sent a 6-digit code to +91 " + phone
                                        : "We'll send a code to confirm your number."}
                                </p>
                            </div>

                            {!sent ? (
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
                                        We send six digits to this number on WhatsApp. You'll sign
                                        in with it later.
                                    </p>

                                    <button
                                        onClick={handleSendOtp}
                                        disabled={busy || phone.length !== 10}
                                        className="cg-btn cg-btn-whatsapp w-full py-3 2xl:py-4 2xl:text-base"
                                    >
                                        {/* The button names the channel, because
                                            somebody waiting for an SMS that is
                                            never coming is a support call */}
                                        {busy
                                            ? <Loader2 className="w-4 h-4 2xl:w-5 2xl:h-5 animate-spin" />
                                            : <WhatsAppMark className="w-4 h-4 2xl:w-5 2xl:h-5" />}
                                        Send WhatsApp code
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
                                            onClick={() => { setSent(false); setOtp(""); setError(""); }}
                                            className="text-ink-soft hover:text-ink font-medium"
                                        >
                                            Change number
                                        </button>
                                        <button
                                            onClick={handleSendOtp}
                                            disabled={resendIn > 0 || busy}
                                            className="text-accent hover:text-accent-deep font-semibold disabled:text-ink-faint"
                                        >
                                            {resendIn > 0 ? "Resend in " + resendIn + "s" : "Resend on WhatsApp"}
                                        </button>
                                    </div>
                                </>
                            )}

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
                                    Your work
                                </h1>
                                <p className="text-ink-soft text-sm 2xl:text-base">
                                    Pick everything you take on. Jobs are offered to you by trade.
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
                                onClick={goToLocation}
                                disabled={!workComplete}
                                className="cg-btn cg-btn-primary w-full py-3 2xl:py-4 2xl:text-base"
                            >
                                Continue to location
                                <ArrowRight className="w-4 h-4 2xl:w-5 2xl:h-5" />
                            </button>
                        </>
                    )}

                    {/* ============ PHASE 4: Location ============
                        Its own step, because it was not one question but five,
                        and stacked under the trades it made a page somebody
                        had to scroll twice to reach the end of. What he does
                        and where he does it are two different answers. */}
                    {step === 4 && (
                        <>
                            <button
                                onClick={() => { setStep(3); setError(""); }}
                                className="flex items-center gap-1.5 text-sm 2xl:text-base text-ink-soft hover:text-ink font-medium mb-4 2xl:mb-6 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4 2xl:w-5 2xl:h-5" />
                                Back to your work
                            </button>

                            <div className="mb-6 2xl:mb-8">
                                <h1 className="text-2xl sm:text-3xl 2xl:text-4xl font-bold text-ink mb-2 tracking-tight">
                                    Where you work
                                </h1>
                                <p className="text-ink-soft text-sm 2xl:text-base">
                                    Jobs near you reach you first, so put down where you actually are.
                                </p>
                            </div>

                            {/* The town, then the rest of the address.
                                Two questions instead of one, because the office
                                uses them for different things: the town files
                                him, the address is what somebody reads out when
                                a pin lands a few streets off. */}
                            <div className="mb-4 2xl:mb-6">
                                <label className="cg-label block mb-2">Your town or city</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                        <MapPin className="h-4 w-4 2xl:w-5 2xl:h-5 text-ink-faint" />
                                    </div>
                                    <input
                                        type="text"
                                        value={form.city}
                                        onChange={handleCityChange}
                                        onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                                        placeholder="Start typing - e.g. Bhubaneswar"
                                        autoComplete="off"
                                        className="cg-input pl-9 pr-10 py-3 2xl:py-4 text-base 2xl:text-lg"
                                    />
                                    {isSearchingLoc && (
                                        <div className="absolute inset-y-0 right-3 flex items-center">
                                            <Loader2 className="w-4 h-4 2xl:w-5 2xl:h-5 animate-spin text-brand" />
                                        </div>
                                    )}

                                    {showSuggestions && suggestions.length > 0 && (
                                        <ul className="absolute z-50 w-full mt-1 cg-card shadow-lg max-h-60 overflow-auto">
                                            {suggestions.map((town) => (
                                                <li
                                                    key={town.placeId || town.city}
                                                    onClick={() => handleSelectCity(town)}
                                                    className="px-4 py-3 hover:bg-sunken cursor-pointer border-b border-hairline last:border-0 flex items-start gap-3"
                                                >
                                                    <MapPin className="w-4 h-4 2xl:w-5 2xl:h-5 text-ink-faint mt-1 shrink-0" />
                                                    <div>
                                                        <p className="text-sm 2xl:text-base font-medium text-ink">{town.city}</p>
                                                        <p className="text-xs 2xl:text-sm text-ink-soft mt-0.5">
                                                            {town.detail || [town.state, town.pincode].filter(Boolean).join(" · ")}
                                                        </p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                {showSuggestions && !isSearchingLoc && form.city.trim() && suggestions.length === 0 && (
                                    <p className="mt-2 text-xs 2xl:text-sm text-warn">
                                        We do not work there yet. Try the nearest town we cover.
                                    </p>
                                )}
                            </div>

                            {/* Which part of that town.
                                A real list under the field rather than the
                                browser's own datalist, which hides everything
                                but the name - and the second line here is what
                                tells "Palasuni, Rasulgarh" apart from a
                                "Palasuni" somewhere else entirely.

                                Still an input: somebody whose corner nobody
                                lists can write it and carry on. */}
                            <div className="mb-4 2xl:mb-6">
                                <label className="cg-label block mb-2">
                                    Your area {form.city.trim() ? "" : "(pick a town first)"}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                        <Navigation className="h-4 w-4 2xl:w-5 2xl:h-5 text-ink-faint" />
                                    </div>
                                    <input
                                        type="text"
                                        name="area"
                                        value={form.area}
                                        onChange={handleFormChange}
                                        disabled={!form.city.trim()}
                                        autoComplete="off"
                                        placeholder={form.city.trim()
                                            ? "Start typing - e.g. Palasuni"
                                            : "Pick a town first"}
                                        className="cg-input pl-9 pr-10 py-3 2xl:py-4 text-base 2xl:text-lg disabled:bg-sunken disabled:cursor-not-allowed"
                                    />
                                    {loadingAreas && form.area.trim() && (
                                        <div className="absolute inset-y-0 right-3 flex items-center">
                                            <Loader2 className="w-4 h-4 2xl:w-5 2xl:h-5 animate-spin text-brand" />
                                        </div>
                                    )}

                                    {areaList.length > 0 && (
                                        <ul className="absolute z-40 w-full mt-1 cg-card shadow-lg max-h-60 overflow-auto">
                                            {areaList.map((a) => (
                                                <li
                                                    key={a.placeId || a.name}
                                                    onClick={() => handlePickArea(a)}
                                                    className="px-4 py-3 hover:bg-sunken cursor-pointer border-b border-hairline last:border-0 flex items-start gap-3"
                                                >
                                                    <Navigation className="w-4 h-4 2xl:w-5 2xl:h-5 text-ink-faint mt-1 shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-sm 2xl:text-base font-medium text-ink truncate">{a.name}</p>
                                                        {(a.detail || a.pincode) && (
                                                            <p className="text-xs 2xl:text-sm text-ink-soft mt-0.5 truncate">
                                                                {a.detail || a.pincode}
                                                            </p>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <p className="mt-1.5 text-xs 2xl:text-sm text-ink-soft">
                                    Pick yours and the pincode fills itself in. Not listed? Just type it.
                                </p>
                            </div>

                            {/* State and pincode: both settled by what he has
                                already told us. The pincode stays editable for
                                the rare corner filed under a neighbour's
                                number. */}
                            <div className="mb-4 2xl:mb-6 grid grid-cols-2 gap-3 2xl:gap-4">
                                <div>
                                    <label className="cg-label block mb-2">State</label>
                                    <input
                                        type="text"
                                        value={form.state}
                                        readOnly
                                        className="cg-input py-3 2xl:py-4 text-base 2xl:text-lg bg-sunken text-ink-soft cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="cg-label block mb-2">Pincode</label>
                                    <input
                                        type="text"
                                        name="pincode"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={form.pincode}
                                        onChange={(e) => setForm(prev => ({
                                            ...prev,
                                            pincode: e.target.value.replace(/[^0-9]/g, "").slice(0, 6),
                                        }))}
                                        placeholder="751001"
                                        className="cg-input py-3 2xl:py-4 text-base 2xl:text-lg"
                                    />
                                </div>
                            </div>

                            <div className="mb-4 2xl:mb-6 text-right">
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
                                    {locationStatus === 'granted'
                                        ? 'Pin saved - jobs will find you'
                                        : 'Use my location to fill the pincode'}
                                </button>
                            </div>

                            <button
                                onClick={goToBank}
                                disabled={!locationComplete}
                                className="cg-btn cg-btn-primary w-full py-3 2xl:py-4 2xl:text-base"
                            >
                                Continue to bank details
                                <ArrowRight className="w-4 h-4 2xl:w-5 2xl:h-5" />
                            </button>
                        </>
                    )}

                    {/* ============ PHASE 5: Bank ============ */}
                    {step === 5 && (
                        <>
                            <button
                                onClick={() => { setStep(4); setError(""); }}
                                className="flex items-center gap-1.5 text-sm 2xl:text-base text-ink-soft hover:text-ink font-medium mb-4 2xl:mb-6 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4 2xl:w-5 2xl:h-5" />
                                Back to your location
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
                                    On a cash job the money stays with you, and you hand the office's part in later.
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
                            <Link to="/vendor/admin/login" className="text-accent font-semibold hover:text-accent-deep">
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