import AdminLayout from "./AdminLayout";
import PricingPanel from "./PricingPanel";

/**
 * The desk's own price list.
 *
 * Everything on this screen is now the panel's, because the same list also
 * appears under the owner's controllers and two copies of a price list drift
 * apart within a month. What stayed behind is the page: a title, and the
 * layout it sits in.
 *
 * The owner's rules card used to sit at the top of this page, above somebody's
 * daily price edits. It has moved to the controllers, with the rest of what
 * only the owner may change.
 */
const AdminServices = () => (
    <AdminLayout>
        <div className="mb-6">
            <h1 className="cg-h1">Service pricing</h1>
            <p className="cg-sub mt-1">
                Every charge, part and add-on a vendor can put on an invoice.
            </p>
        </div>

        <PricingPanel />
    </AdminLayout>
);

export default AdminServices;
