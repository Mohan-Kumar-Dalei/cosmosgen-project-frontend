import { useEffect, useState, useCallback } from "react";
import AdminLayout from "./AdminLayout";
import OwnerSettingsCard from "./OwnerSettingsCard";
import { useAdminAuth } from "./adminAuthContext";
import { api, getErrorMessage } from "../../services/api";
import { Plus, Trash2, Loader2, AlertCircle, Pencil, X, Package, RefreshCw, ChevronDown } from "lucide-react";

const CATEGORY_LABELS = { labour: "Service charge", part: "Part", service: "Add-on service" };
const CATEGORY_STYLES = {
    labour: "bg-info-tint text-info",
    part: "bg-sunken text-ink",
    service: "bg-info-tint text-purple-700",
};

const APPLIANCES = ["AC", "Refrigerator", "Washing Machine", "Microwave", "Water Purifier (RO)", "Other"];

const AdminServices = () => {
    const { admin } = useAdminAuth();
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
                    <h1 className="cg-h1">Service pricing</h1>
                    <p className="cg-sub mt-1">
                        Vendors pick from this list — they never type prices.
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={() => { setRefreshing(true); load(); }}
                        disabled={refreshing}
                        className="cg-icon-btn shrink-0"
                    >
                        <RefreshCw className={"w-4 h-4 " + (refreshing ? "animate-spin" : "")} />
                    </button>
                    <button
                        onClick={() => { setEditing(null); setShowForm(true); }}
                        className="cg-btn cg-btn-go px-3 sm:px-4"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Add item</span>
                    </button>
                </div>
            </div>

            {admin?.role === "superadmin" && <OwnerSettingsCard />}

            {services.length > 0 && (
                <div className="cg-tabs mb-6">
                    {services.map((s) => (
                        <button
                            key={s.serviceKey}
                            onClick={() => setActiveKey(s.serviceKey)}
                            className={"cg-tab " + (activeKey === s.serviceKey ? "cg-tab-on" : "")}
                        >
                            {s.serviceLabel}
                            <span className="text-[10px] font-bold text-ink-faint">{s.itemsList.length}</span>
                        </button>
                    ))}
                </div>
            )}

            {activeKey === "AC_APPLIANCE" && (
                <div className="mb-5 relative max-w-[240px]">
                    <div 
                        onClick={() => setIsApplianceDropdownOpen(!isApplianceDropdownOpen)}
                        className="flex items-center justify-between px-3.5 py-2.5 bg-white border border-hairline-strong rounded-lg text-sm font-medium cursor-pointer hover:border-hairline-strong transition-colors"
                    >
                        <span className="text-ink">{activeAppliance}</span>
                        <ChevronDown className={"w-4 h-4 text-ink-soft transition-transform duration-200 " + (isApplianceDropdownOpen ? "rotate-180" : "")} />
                    </div>
                    {isApplianceDropdownOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsApplianceDropdownOpen(false)} />
                            <div className="absolute top-full left-0 mt-1.5 w-full cg-card shadow-xl z-20 py-1.5 max-h-60 overflow-y-auto">
                                {APPLIANCES.map((app) => (
                                    <button
                                        key={app}
                                        className={"w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-sunken " + (activeAppliance === app ? "bg-brand-tint/50 text-brand font-bold" : "text-ink font-medium")}
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
                <div className="mb-4 p-4 bg-danger-tint border border-hairline rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold text-danger">{error}</p>
                </div>
            )}

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="cg-card p-4 h-16 animate-pulse" />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className="cg-card p-10 text-center">
                    <Package className="w-8 h-8 text-ink-faint mx-auto mb-2" />
                    <p className="font-semibold text-ink">No items yet</p>
                    <p className="text-sm text-ink-soft mt-1">
                        Add the parts and charges vendors bill for this service.
                    </p>
                </div>
            ) : (
                <div className="space-y-6 pb-8">
                    {["labour", "service", "part"].map((cat) =>
                        grouped[cat]?.length ? (
                            <div key={cat}>
                                <h2 className="text-xs font-bold text-ink-faint uppercase tracking-wide mb-2">
                                    {CATEGORY_LABELS[cat]}
                                </h2>
                                <div className="space-y-2">
                                    {grouped[cat].map((item) => (
                                        <div
                                            key={item._id}
                                            className={"bg-white border rounded-xl p-3 sm:p-4 " + (item.isActive ? "border-hairline" : "border-hairline opacity-50")}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-semibold text-ink text-sm truncate">{item.name}</p>
                                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                        <span className={"text-[10px] font-bold px-1.5 py-0.5 rounded " + CATEGORY_STYLES[item.category]}>
                                                            {item.category.toUpperCase()}
                                                        </span>
                                                        {item.isDefault && (
                                                            <span className="text-[10px] font-bold text-brand bg-brand-tint px-1.5 py-0.5 rounded">
                                                                AUTO
                                                            </span>
                                                        )}
                                                        {!item.isActive && (
                                                            <span className="text-[10px] font-bold text-ink-soft bg-sunken px-1.5 py-0.5 rounded">
                                                                HIDDEN
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <span className="cg-h2 mr-1">Rs {item.priceDisplay}</span>
                                                    <button
                                                        onClick={() => { setEditing(item); setShowForm(true); }}
                                                        className="p-2 text-ink-faint hover:text-ink"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item._id)}
                                                        className="p-2 text-ink-faint hover:text-danger"
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
                    <h3 className="font-bold text-ink">{editing ? "Edit item" : "Add item"}</h3>
                    <button onClick={onClose} className="text-ink-faint hover:text-ink-soft">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {!editing && (
                    <>
                        <label className="cg-label block mb-2">Service</label>
                        <select
                            value={serviceKey}
                            onChange={(e) => {
                                setServiceKey(e.target.value);
                                if (e.target.value === "AC_APPLIANCE" && !form.subCategory) {
                                    setForm({ ...form, subCategory: activeAppliance });
                                }
                            }}
                            className="cg-input mb-3"
                        >
                            {services.map((s) => (
                                <option key={s.serviceKey} value={s.serviceKey}>{s.serviceLabel}</option>
                            ))}
                        </select>
                    </>
                )}

                {(serviceKey === "AC_APPLIANCE" || (editing && activeKey === "AC_APPLIANCE")) && (
                    <>
                        <label className="cg-label block mb-2">Appliance</label>
                        <select
                            value={form.subCategory}
                            onChange={(e) => setForm({ ...form, subCategory: e.target.value })}
                            className="cg-input mb-3"
                        >
                            <option value="" disabled>Select appliance</option>
                            {APPLIANCES.map((app) => (
                                <option key={app} value={app}>{app}</option>
                            ))}
                        </select>
                    </>
                )}

                <label className="cg-label block mb-2">Item name</label>
                <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Capacitor"
                    className="cg-input mb-3"
                />

                <label className="cg-label block mb-2">Type</label>
                <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="cg-input mb-3"
                >
                    <option value="part">Part</option>
                    <option value="labour">Service charge</option>
                    <option value="service">Add-on service</option>
                </select>

                <label className="cg-label block mb-2">Price (Rs)</label>
                <input
                    type="number"
                    min="0"
                    value={form.priceRupees}
                    onChange={(e) => setForm({ ...form, priceRupees: e.target.value })}
                    placeholder="450"
                    className="cg-input mb-3"
                />

                <label className="flex items-start gap-2 mb-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={form.isDefault}
                        onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                        className="mt-0.5 w-4 h-4"
                    />
                    <span className="text-sm text-ink">
                        Add to every invoice automatically
                        <span className="block text-xs text-ink-faint">Use this for the standard visit charge</span>
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
                        <span className="text-sm text-ink">Show to vendors</span>
                    </label>
                )}

                <div className="flex gap-2 mt-4">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-ink border border-hairline rounded-lg hover:bg-sunken">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!form.name.trim() || form.priceRupees === "" || submitting}
                        className="cg-btn cg-btn-go flex-1"
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