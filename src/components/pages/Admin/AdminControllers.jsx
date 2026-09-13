import { useState } from "react";
import { Boxes, Images, SlidersHorizontal } from "lucide-react";
import AdminLayout from "./AdminLayout";
import ServiceCatalogPanel from "./ServiceCatalogPanel";
import SitePicturesPanel from "./SitePicturesPanel";
import OwnerSettingsCard from "./OwnerSettingsCard";
import { useAdminAuth } from "./adminAuthContext";

/**
 * Everything the owner alone decides, on one screen.
 *
 * These were scattered: what the company sells had a page of its own called
 * "Catalogue", the pictures it shows were URLs pasted into a source file, and
 * the rules about how a job may be billed were a card bolted to the top of the
 * desk's pricing screen where anybody could reach them.
 *
 * Pricing itself is deliberately not here. It has its own screen, the desk
 * edits it daily, and a second copy of the same list behind an owner-only door
 * is how two versions of a price list start to disagree.
 *
 * Owner only.
 */
const TABS = [
    {
        id: "sells",
        label: "What we sell",
        icon: Boxes,
        note: "The services the company offers. This is the one list the website, the WhatsApp menu and the assistant all read.",
    },
    {
        id: "images",
        label: "Pictures",
        icon: Images,
        note: "Every picture the customer site shows, with the link it loads from. Paste an ImageKit URL or upload a file.",
    },
    {
        id: "rules",
        label: "Rules",
        icon: SlidersHorizontal,
        note: "The handful of numbers that govern how the work is billed, without a developer being involved.",
    },
];

const AdminControllers = () => {
    const { admin } = useAdminAuth();
    const isOwner = admin?.role === "superadmin";
    const [tab, setTab] = useState("sells");

    const current = TABS.find((t) => t.id === tab) || TABS[0];

    if (!isOwner) {
        return (
            <AdminLayout>
                <div className="mb-6">
                    <h1 className="cg-h1">Controllers</h1>
                </div>

                <div className="cg-card p-8 text-center">
                    <p className="font-semibold">This one is the owner&rsquo;s.</p>
                    <p className="cg-sub mt-1.5 max-w-md mx-auto">
                        What the company sells, what it charges and the rules around both change
                        everything customers see at once, so they sit with the owner rather than
                        the desk.
                    </p>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="mb-5">
                <h1 className="cg-h1">Controllers</h1>
                <p className="cg-sub mt-1">{current.note}</p>
            </div>

            <div className="cg-tabs mb-6">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={"cg-tab " + (tab === t.id ? "cg-tab-on" : "")}
                    >
                        <t.icon className="w-4 h-4" />
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === "sells" && <ServiceCatalogPanel isOwner />}
            {tab === "images" && <SitePicturesPanel />}
            {tab === "rules" && <OwnerSettingsCard />}
        </AdminLayout>
    );
};

export default AdminControllers;
