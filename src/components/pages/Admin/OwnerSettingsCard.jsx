import { useEffect, useState, useCallback } from "react";
import { api, getErrorMessage } from "../../services/api";
import { Loader2, Check, SlidersHorizontal } from "lucide-react";

/**
 * The handful of numbers the owner can move without a deploy.
 *
 * "How many times may a technician correct a bill" was a constant in the code,
 * so changing it meant editing a file and restarting the server. It sits here
 * rather than on its own page because it belongs with the other rules about
 * what a technician is allowed to charge.
 *
 * Only the owner sees it - the parent decides that, since the backend refuses
 * the write for anyone else anyway.
 */
const OwnerSettingsCard = () => {
    const [rows, setRows] = useState([]);
    const [drafts, setDrafts] = useState({});
    const [loading, setLoading] = useState(true);
    const [savingKey, setSavingKey] = useState(null);
    const [savedKey, setSavedKey] = useState(null);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        try {
            const res = await api.get("/admin/settings");
            setRows(res.data.data);
            setDrafts(Object.fromEntries(res.data.data.map((r) => [r.key, String(r.value)])));
            setError("");
        } catch (err) {
            setError(getErrorMessage(err, "Could not load settings"));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const save = async (row) => {
        setSavingKey(row.key);
        setError("");
        try {
            const res = await api.patch("/admin/settings/" + row.key, { value: Number(drafts[row.key]) });
            setRows(res.data.data);
            setSavedKey(row.key);
            setTimeout(() => setSavedKey(null), 2000);
        } catch (err) {
            setError(getErrorMessage(err, "Could not save that"));
        } finally {
            setSavingKey(null);
        }
    };

    if (loading) {
        return <div className="cg-card p-4 h-24 animate-pulse mb-5" />;
    }

    return (
        <div className="cg-card p-4 sm:p-5 mb-5">
            <div className="flex items-center gap-2 mb-1">
                <SlidersHorizontal className="w-4 h-4 text-ink-faint" />
                <h2 className="font-semibold text-ink text-sm">Rules you control</h2>
            </div>
            <p className="text-xs text-ink-soft mb-4">
                Only you can change these. Backoffice staff see them but cannot edit.
            </p>

            {error && (
                <div className="mb-3 p-3 bg-danger-tint border border-hairline rounded-lg text-sm text-danger">
                    {error}
                </div>
            )}

            <div className="space-y-3">
                {rows.map((row) => {
                    const draft = drafts[row.key] ?? "";
                    const changed = String(row.value) !== String(draft);

                    return (
                        <div key={row.key} className="flex flex-wrap items-end gap-3">
                            <div className="min-w-0 flex-1">
                                <label className="block text-sm font-medium text-ink">{row.label}</label>
                                <p className="text-xs text-ink-faint mt-0.5">
                                    Between {row.min} and {row.max} · default {row.default}
                                </p>
                            </div>

                            <input
                                type="number"
                                min={row.min}
                                max={row.max}
                                value={draft}
                                onChange={(e) => setDrafts((d) => ({ ...d, [row.key]: e.target.value }))}
                                className="cg-input w-24"
                            />

                            <button
                                onClick={() => save(row)}
                                disabled={!changed || savingKey === row.key}
                                className="cg-btn cg-btn-go py-2"
                            >
                                {savingKey === row.key && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                {savedKey === row.key && <Check className="w-3.5 h-3.5" />}
                                {savedKey === row.key ? "Saved" : "Save"}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default OwnerSettingsCard;
