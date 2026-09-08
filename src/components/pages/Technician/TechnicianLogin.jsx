import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import SplitCurve from "../../ui/SplitCurve";
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

const LOGO = "https://ik.imagekit.io/ny6yinyut/cosmosgenLogo/cosmosgen-logo.png?updatedAt=1788413075959";

/**
 * The vendor's way in.
 *
 * This used to be a dark split screen with glowing blobs and gradient text,
 * which belonged to a different product from the one behind the door. The
 * split itself is worth keeping on a desktop - it leaves room to say what
 * this is for - but it is paper now, like everything else, and the panel
 * says something useful instead of shouting.
 */
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

    /*
     * A different shape from the split screen.
     *
     * The two-column layout gave half the page to marketing that a vendor
     * standing in a stairwell has no use for, and on a phone that half simply
     * vanished - so the design he saw on his desk was not the design he used.
     * This is one screen at every width: the company surface behind, his card
     * floating on it, and the three things the app does reduced to a strip he
     * can take in without reading.
     */
    /*
     * A split, built so the half that carries the company does not disappear
     * on a phone.
     *
     * The panel is a full column beside the form on a desktop and a compact
     * lit band above it on a handset - same surface, same words, same mark,
     * just folded. That matters more than usual here: this layout becomes the
     * Android and iOS screen, and a design whose better half only exists at
     * 1024px is not a design anyone actually ships.
     */
    return (
        <div className="min-h-screen bg-canvas lg:flex">
            <SplitCurve />


            {/* THE PANEL */}
            <aside className="cg-rich-dark cg-split-curve lg:w-[50%] xl:w-[52%] shrink-0 flex flex-col justify-between px-6 pt-8 pb-14 sm:px-10 lg:px-14 xl:px-20 lg:py-14">
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

                {/* On a phone this is one line under the mark. On a desktop it
                    opens out into the headline the column is there for. */}
                <div className="mt-7 lg:mt-0 lg:max-w-md">
                    <span className="cg-pill bg-white/10 text-white/70 uppercase tracking-[0.14em] mb-4 hidden lg:inline-flex">
                        Vendor sign in
                    </span>

                    <h2 className="font-display text-[1.75rem] sm:text-4xl lg:text-[3rem] xl:text-[3.4rem] font-semibold leading-[1.06] tracking-[-0.035em] text-white">
                        Your work,
                        <br className="hidden sm:block" />
                        <span className="text-brand"> your money,</span>
                        <br className="hidden sm:block" />
                        <span className="lg:block"> in one place.</span>
                    </h2>

                    {/* Three plain lines, no box. Boxed and bordered, this
                        read as a table of contents parked in the middle of the
                        panel - the headline above it is the thing to look at,
                        and these only need to be legible underneath it. */}
                    <div className="mt-8 lg:mt-12 flex flex-col sm:flex-row lg:flex-col gap-5 sm:gap-8 lg:gap-5">
                        {[
                            ["Jobs", "The one you are on, and what is next."],
                            ["Wallet", "What you earned, and what to hand over."],
                            ["Route", "The way there, and they know you are coming."],
                        ].map(([term, line]) => (
                            <div key={term} className="lg:flex lg:gap-5">
                                <span className="cg-label text-accent block lg:w-16 lg:shrink-0 lg:pt-0.5">{term}</span>
                                <p className="text-[13px] lg:text-sm text-white/55 leading-relaxed mt-1 lg:mt-0 max-w-xs">
                                    {line}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="hidden lg:block text-xs text-white/30">© Cosmosgen 2026</p>
            </aside>

            {/* THE FORM */}
            <main className="flex-1 flex items-center justify-center px-4 py-10 sm:px-8 lg:py-12">
                <div className="w-full max-w-sm">
                    <span className="cg-pill bg-accent-tint text-accent uppercase tracking-[0.1em] mb-5">
                        Vendor
                    </span>

                    <h1 className="cg-h1 mb-1.5">Sign in</h1>
                    <p className="cg-sub mb-8">Your number and password. Nothing else.</p>

                    {pendingNotice && (
                        <div className="mb-6 p-4 bg-warn-tint border border-hairline rounded-[10px] flex gap-2.5">
                            <AlertCircle className="w-4 h-4 text-warn shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-warn">Not able to sign in yet</p>
                                <p className="text-sm text-warn/90 mt-0.5">{pendingNotice}</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="cg-label block mb-2">Phone number</label>
                            <input
                                inputMode="numeric"
                                type="tel"
                                name="phone"
                                required
                                placeholder="Your 10-digit number"
                                value={credentials.phone}
                                onChange={handleChange}
                                className="cg-input py-3"
                            />
                        </div>

                        <div>
                            <label className="cg-label block mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    required
                                    placeholder="Your password"
                                    value={credentials.password}
                                    onChange={handleChange}
                                    className="cg-input py-3 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-faint hover:text-ink"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* A tall target - this gets pressed with a thumb, often
                            with one hand, often outdoors */}
                        <button type="submit" disabled={isLoading} className="cg-btn cg-btn-primary w-full py-3.5">
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isLoading ? "Signing in" : "Sign in"}
                        </button>
                    </form>

                    <p className="text-center text-sm text-ink-soft mt-8 pt-8 border-t border-hairline">
                        New here?{" "}
                        <Link to="/technician/admin/register" className="text-accent font-semibold hover:text-accent-deep">
                            Join as a vendor
                        </Link>
                    </p>

                    <p className="text-center text-xs text-ink-faint mt-6">
                        <a href="mailto:support@cosmosgen.com" className="hover:text-ink-soft">
                            support@cosmosgen.com
                        </a>
                    </p>
                </div>
            </main>
        </div>
    );
};

export default TechnicianLogin;
