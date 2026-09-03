import React, { useEffect, useState, useCallback } from "react";
import AdminLayout from "./AdminLayout";
import { api, getErrorMessage } from "../../services/api";
import { Plus, Trash2, Loader2, AlertCircle, Pencil, X, Package, RefreshCw, ChevronDown } from "lucide-react";

const CATEGORY_LABELS = { labour: "Service charge", part: "Part", service: "Add-on service" };
const CATEGORY_STYLES = {
    labour: "bg-blue-100 text-blue-700",
    part: "bg-gray-100 text-gray-700",
    service: "bg-purple-100 text-purple-700",
};

const APPLIANCES = ["AC", "Refrigerator", "Washing Machine", "Microwave", "Water Purifier (RO)", "Other"];

const AdminServices = () => {
    const [services, setServices] = useState([]);
    const [activeKey, setActiveKey] = useState("");
    const [activeAppliance, setActiveAppliance] = useState("AC");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [isApplianceDropdownOpen, setIsApplianceDropdownOpen] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await api.get("/admin/pricing");
            setServices(res.data.data);
            setActiveKey((prev) => prev || res.data.data[0]?.serviceKey || "");
            setError("");
        } catch (err) {
            setError(getErrorMessage(err, "Could not load the price list"));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const activeService = services.find((s) => s.serviceKey === activeKey);
    let items = activeService?.itemsList || [];

    if (activeKey === "AC_APPLIANCE") {
        items = items.filter(i => i.subCategory === activeAppliance);
    }

    const handleDelete = async (itemId) => {
        try {
            await api.delete("/admin/pricing/" + activeKey + "/items/" + itemId);
            load();
        } catch (err) {
            setError(getErrorMessage(err, "Could not remove this item"));
        }
    };

    const grouped = items.reduce((acc, item) => {
        const key = item.category || "part";
        (acc[key] = acc[key] || []).push(item);
        return acc;
    }, {});

    return (
        <AdminLayout>
            <div className="flex items-start justify-between gap-3 mb-6">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Service pricing</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Technicians pick from this list — they never type prices.
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
                        onClick={() => { setEditing(null); setShowForm(true); }}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-lg"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Add item</span>
                    </button>
                </div>
            </div>

            {services.length > 0 && (
                <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg overflow-x-auto">
                    {services.map((s) => (
                        <button
                            key={s.serviceKey}
                            onClick={() => setActiveKey(s.serviceKey)}
                            className={"flex items-center gap-1.5 px-3 sm:px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors " + (activeKey === s.serviceKey ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                        >
                            {s.serviceLabel}
                            <span className="text-[10px] font-bold text-gray-400">{s.itemsList.length}</span>
                        </button>
                    ))}
                </div>
            )}

            {activeKey === "AC_APPLIANCE" && (
                <div className="mb-5 relative max-w-[240px]">
                    <div 
                        onClick={() => setIsApplianceDropdownOpen(!isApplianceDropdownOpen)}
                        className="flex items-center justify-between px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium cursor-pointer hover:border-gray-400 transition-colors"
                    >
                        <span className="text-gray-900">{activeAppliance}</span>
                        <ChevronDown className={"w-4 h-4 text-gray-500 transition-transform duration-200 " + (isApplianceDropdownOpen ? "rotate-180" : "")} />
                    </div>
                    {isApplianceDropdownOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsApplianceDropdownOpen(false)} />
                            <div className="absolute top-full left-0 mt-1.5 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-1.5 max-h-60 overflow-y-auto">
                                {APPLIANCES.map((app) => (
                                    <button
                                        key={app}
                                        className={"w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 " + (activeAppliance === app ? "bg-green-50/50 text-green-700 font-bold" : "text-gray-700 font-medium")}
                                        onClick={() => {
                                            setActiveAppliance(app);
                                            setIsApplianceDropdownOpen(false);
                                        }}
                                    >
                                        {app}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
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
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-16 animate-pulse" />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
                    <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900">No items yet</p>
                    <p className="text-sm text-gray-500 mt-1">
                        Add the parts and charges technicians bill for this service.
                    </p>
                </div>
            ) : (
                <div className="space-y-6 pb-8">
                    {["labour", "service", "part"].map((cat) =>
                        grouped[cat]?.length ? (
                            <div key={cat}>
                                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                                    {CATEGORY_LABELS[cat]}
                                </h2>
                                <div className="space-y-2">
                                    {grouped[cat].map((item) => (
                                        <div
                                            key={item._id}
                                            className={"bg-white border rounded-xl p-3 sm:p-4 " + (item.isActive ? "border-gray-200" : "border-gray-100 opacity-50")}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
                                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                        <span className={"text-[10px] font-bold px-1.5 py-0.5 rounded " + CATEGORY_STYLES[item.category]}>
                                                            {item.category.toUpperCase()}
                                                        </span>
                                                        {item.isDefault && (
                                                            <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                                                                AUTO
                                                            </span>
                                                        )}
                                                        {!item.isActive && (
                                                            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                                                HIDDEN
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <span className="font-bold text-gray-900 text-sm mr-1">Rs {item.priceDisplay}</span>
                                                    <button
                                                        onClick={() => { setEditing(item); setShowForm(true); }}
                                                        className="p-2 text-gray-400 hover:text-gray-700"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item._id)}
                                                        className="p-2 text-gray-400 hover:text-red-500"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null
                    )}
                </div>
            )}

            {showForm && (
                <PricingForm
                    services={services}
                    activeKey={activeKey}
                    activeAppliance={activeAppliance}
                    editing={editing}
                    onClose={() => { setShowForm(false); setEditing(null); }}
                    onSaved={() => { setShowForm(false); setEditing(null); load(); }}
                    onError={setError}
                />
            )}
        </AdminLayout>
    );
};

const PricingForm = ({ services, activeKey, activeAppliance, editing, onClose, onSaved, onError }) => {
    const [serviceKey, setServiceKey] = useState(activeKey);
    const [form, setForm] = useState({
        name: editing?.name || "",
        category: editing?.category || "part",
        priceRupees: editing ? (editing.pricePaise / 100).toString() : "",
        isDefault: editing?.isDefault || false,
        isActive: editing ? editing.isActive : true,
        subCategory: editing?.subCategory || (activeKey === "AC_APPLIANCE" ? activeAppliance : ""),
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!form.name.trim() || form.priceRupees === "") return;
        setSubmitting(true);
        onError("");
        try {
            if (editing) {
                await api.put("/admin/pricing/" + activeKey + "/items/" + editing._id, {
                    name: form.name.trim(),
                    category: form.category,
                    priceRupees: Number(form.priceRupees),
                    isDefault: form.isDefault,
                    isActive: form.isActive,
                    ...(activeKey === "AC_APPLIANCE" && form.subCategory && { subCategory: form.subCategory })
                });
            } else {
                await api.post("/admin/pricing/" + serviceKey + "/items", {
                    name: form.name.trim(),
                    category: form.category,
                    priceRupees: Number(form.priceRupees),
                    isDefault: form.isDefault,
                    ...(serviceKey === "AC_APPLIANCE" && form.subCategory && { subCategory: form.subCategory })
                });
            }
            onSaved();
        } catch (err) {
            onError(getErrorMessage(err, "Could not save this item"));
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900">{editing ? "Edit item" : "Add item"}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {!editing && (
                    <>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Service</label>
                        <select
                            value={serviceKey}
                            onChange={(e) => {
                                setServiceKey(e.target.value);
                                if (e.target.value === "AC_APPLIANCE" && !form.subCategory) {
                                    setForm({ ...form, subCategory: activeAppliance });
                                }
                            }}
                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700 mb-3"
                        >
                            {services.map((s) => (
                                <option key={s.serviceKey} value={s.serviceKey}>{s.serviceLabel}</option>
                            ))}
                        </select>
                    </>
                )}

                {(serviceKey === "AC_APPLIANCE" || (editing && activeKey === "AC_APPLIANCE")) && (
                    <>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Appliance</label>
                        <select
                            value={form.subCategory}
                            onChange={(e) => setForm({ ...form, subCategory: e.target.value })}
                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700 mb-3"
                        >
                            <option value="" disabled>Select appliance</option>
                            {APPLIANCES.map((app) => (
                                <option key={app} value={app}>{app}</option>
                            ))}
                        </select>
                    </>
                )}

                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Item name</label>
                <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Capacitor"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700 mb-3"
                />

                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Type</label>
                <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700 mb-3"
                >
                    <option value="part">Part</option>
                    <option value="labour">Service charge</option>
                    <option value="service">Add-on service</option>
                </select>

                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Price (Rs)</label>
                <input
                    type="number"
                    min="0"
                    value={form.priceRupees}
                    onChange={(e) => setForm({ ...form, priceRupees: e.target.value })}
                    placeholder="450"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700 mb-3"
                />

                <label className="flex items-start gap-2 mb-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={form.isDefault}
                        onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                        className="mt-0.5 w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">
                        Add to every invoice automatically
                        <span className="block text-xs text-gray-400">Use this for the standard visit charge</span>
                    </span>
                </label>

                {editing && (
                    <label className="flex items-center gap-2 mb-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.isActive}
                            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                            className="w-4 h-4"
                        />
                        <span className="text-sm text-gray-700">Show to technicians</span>
                    </label>
                )}

                <div className="flex gap-2 mt-4">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!form.name.trim() || form.priceRupees === "" || submitting}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-green-700 hover:bg-green-800 disabled:opacity-50 rounded-lg"
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {editing ? "Save" : "Add"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminServices;