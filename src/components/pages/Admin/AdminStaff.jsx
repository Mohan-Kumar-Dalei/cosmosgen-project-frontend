import React, { useEffect, useState, useCallback } from "react";
import AdminLayout from "./AdminLayout";
import { useAdminAuth } from "../Admin/adminAuthContext";
import { api, getErrorMessage } from "../../services/api";
import {
    Loader2, AlertCircle, UserPlus, X, Eye, EyeOff,
    CheckCircle2, Power, ShieldCheck, Copy, RefreshCw,
} from "lucide-react";

const AdminStaff = () => {
    const { admin } = useAdminAuth();
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [flash, setFlash] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [togglingId, setTogglingId] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await api.get("/admin/staff");
            setStaff(res.data.data);
            setError("");
        } catch (err) {
            setError(getErrorMessage(err, "Could not load the team"));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleToggle = async (id) => {
        setTogglingId(id);
        try {
            const res = await api.patch("/admin/staff/" + id + "/toggle-active");
            setFlash(res.data.message);
            setTimeout(() => setFlash(""), 4000);
            load();
        } catch (err) {
            setError(getErrorMessage(err, "Could not update this account"));
        } finally {
            setTogglingId(null);
        }
    };

    return (
        <AdminLayout>
            <div className="flex items-start justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Team</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Who can sign in to the backoffice, and what they can do.
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={() => { setRefreshing(true); load(); }}
                        disabled={refreshing}
                        className="p-2.5 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                        <RefreshCw className={"w-4 h-4 " + (refreshing ? "animate-spin" : "")} />
                    </button>
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-lg"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span className="hidden sm:inline">Add person</span>
                    </button>
                </div>
            </div>

            {flash && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    {flash}
                </div>
            )}

            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold text-red-800">{error}</p>
                </div>
            )}

            {loading ? (
                <div className="space-y-3">
                    {[1, 2].map((i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-20 animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="space-y-2 pb-8">
                    {staff.map((s) => {
                        const isSelf = String(s._id) === String(admin?._id);
                        const isOwner = s.role === "superadmin";

                        return (
                            <div
                                key={s._id}
                                className={"bg-white border rounded-xl p-4 " + (s.isActive ? "border-gray-200" : "border-gray-100 opacity-60")}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-semibold text-gray-900 text-sm">{s.name}</p>
                                            <span className={"text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide " + (isOwner ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600")}>
                                                {isOwner ? "Owner" : "Backoffice"}
                                            </span>
                                            {isSelf && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                                                    YOU
                                                </span>
                                            )}
                                            {!s.isActive && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">
                                                    DEACTIVATED
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 mt-0.5 truncate">{s.email}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {s.lastLoginAt
                                                ? "Last signed in " + new Date(s.lastLoginAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                                                : "Never signed in"}
                                        </p>
                                    </div>

                                    {/* Deactivating yourself would lock you out, so that button
                                        isn't offered at all */}
                                    {!isSelf && (
                                        <button
                                            onClick={() => handleToggle(s._id)}
                                            disabled={togglingId === s._id}
                                            className={"shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border disabled:opacity-50 " + (s.isActive ? "text-red-600 border-red-200 hover:bg-red-50" : "text-green-700 border-green-200 hover:bg-green-50")}
                                        >
                                            {togglingId === s._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
                                            {s.isActive ? "Deactivate" : "Reactivate"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showForm && (
                <AddStaffForm
                    onClose={() => setShowForm(false)}
                    onCreated={(message) => {
                        setShowForm(false);
                        setFlash(message);
                        setTimeout(() => setFlash(""), 4000);
                        load();
                    }}
                />
            )}
        </AdminLayout>
    );
};

const AddStaffForm = ({ onClose, onCreated }) => {
    const [form, setForm] = useState({ name: "", email: "", password: "", role: "backoffice" });
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [created, setCreated] = useState(null);
    const [copied, setCopied] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError("");
    };

    const generatePassword = () => {
        // Readable, not clever - it gets typed by hand once
        setForm({ ...form, password: "cg" + Math.floor(1000 + Math.random() * 9000) + "@office" });
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setError("");
        try {
            await api.post("/admin/staff", form);
            setCreated({ email: form.email, password: form.password, name: form.name, role: form.role });
        } catch (err) {
            setError(getErrorMessage(err, "Could not create this account"));
            setSubmitting(false);
        }
    };

    const copyCredentials = () => {
        navigator.clipboard.writeText(
            "Cosmosgen backoffice\nSign in: " + window.location.origin +
            (created.role === "superadmin" ? "/owner/login" : "/admin/login") +
            "\nEmail: " + created.email + "\nPassword: " + created.password
        );
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Shown once - the password can't be read back afterwards
    if (created) {
        return (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                    <div className="text-center mb-5">
                        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                            <CheckCircle2 className="w-7 h-7 text-green-600" />
                        </div>
                        <h3 className="font-bold text-gray-900">{created.name} added</h3>
                        <p className="text-sm text-gray-500 mt-1">Share these details with them.</p>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 mb-3 space-y-2">
                        <div className="flex justify-between text-sm gap-3">
                            <span className="text-gray-500 shrink-0">Email</span>
                            <span className="font-mono font-semibold text-gray-900 truncate">{created.email}</span>
                        </div>
                        <div className="flex justify-between text-sm gap-3">
                            <span className="text-gray-500 shrink-0">Password</span>
                            <span className="font-mono font-semibold text-gray-900">{created.password}</span>
                        </div>
                        <div className="flex justify-between text-sm gap-3">
                            <span className="text-gray-500 shrink-0">Sign in at</span>
                            <span className="font-mono text-gray-900 text-xs">
                                {created.role === "superadmin" ? "/owner/login" : "/admin/login"}
                            </span>
                        </div>
                    </div>

                    {created.role === "superadmin" && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3">
                            <p className="text-xs text-amber-800">
                                Owner accounts also need the company security key to sign in.
                            </p>
                        </div>
                    )}

                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg mb-4">
                        <p className="text-xs text-gray-600">
                            Save this now — the password can't be shown again.
                        </p>
                    </div>

                    <button
                        onClick={copyCredentials}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mb-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                        <Copy className="w-4 h-4" />
                        {copied ? "Copied" : "Copy details"}
                    </button>
                    <button
                        onClick={() => onCreated(created.name + " can now sign in")}
                        className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-2.5 rounded-lg text-sm"
                    >
                        Done
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900">Add someone to the team</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role</label>
                <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700 mb-1"
                >
                    <option value="backoffice">Backoffice — tickets, technicians, payments</option>
                    <option value="superadmin">Owner — everything, including wallets and team</option>
                </select>
                <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Owners can move money and manage the team
                </p>

                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full name</label>
                <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Their full name"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700 mb-3"
                />

                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="name@cosmosgen.com"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700 mb-3"
                />

                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <div className="flex gap-2 mb-1">
                    <div className="relative flex-1">
                        <input
                            type={showPassword ? "text" : "password"}
                            name="password"
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
                    <button
                        onClick={generatePassword}
                        className="shrink-0 px-3 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                        Generate
                    </button>
                </div>
                <p className="text-xs text-gray-400 mb-3">They can change it later.</p>

                {error && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !form.name || !form.email || form.password.length < 6}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-green-700 hover:bg-green-800 disabled:opacity-50 rounded-lg"
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Create
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminStaff;