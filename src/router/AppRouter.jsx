import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AdminProtectedRoute } from "../components/pages/Protected/ProtectedRoute";
import { DeveloperRoute } from "../components/pages/Developer/DeveloperRoute";
import { CustomerProvider } from "../components/pages/Customer/customerAuth";
import { AreaProvider } from "../components/pages/Customer/area";
import { CUSTOMER_ROUTES } from "./customerRoutes";

/*
 * The public pages name their module through the map next door, so that the
 * warmer and this share one chunk rather than one each.
 */
const CustomerHome = lazy(CUSTOMER_ROUTES["/"]);
const CustomerServices = lazy(CUSTOMER_ROUTES["/services"]);
const CustomerHowItWorks = lazy(CUSTOMER_ROUTES["/how-it-works"]);
const CustomerAccount = lazy(CUSTOMER_ROUTES["/account"]);
const CustomerAssistant = lazy(CUSTOMER_ROUTES["/ai-assistant/chat"]);
const CustomerAbout = lazy(CUSTOMER_ROUTES["/about"]);
const CustomerPricing = lazy(CUSTOMER_ROUTES["/pricing"]);
const CustomerJoin = lazy(CUSTOMER_ROUTES["/join"]);
const CustomerFaq = lazy(CUSTOMER_ROUTES["/faq"]);
const CustomerTracking = lazy(() => import("../components/pages/CustomerTracking"));
const TechnicianPanel = lazy(() => import("../components/pages/Technician/TechnicianPanel"));
const TechnicianRegister = lazy(() => import("../components/pages/Technician/TechnicianRegister"));
const TechnicianLogin = lazy(() => import("../components/pages/Technician/TechnicianLogin"));
const TechnicianProfile = lazy(() => import("../components/pages/Technician/TechnicianProfile"));

// Admin panel (abhi banayenge)
const AdminRegister = lazy(() => import("../components/pages/Admin/AdminRegister"));
const AdminLogin = lazy(() => import("../components/pages/Admin/AdminLogin"));
const OwnerLogin = lazy(() => import("../components/pages/Admin/OwnerLogin"));
const AdminDashboard = lazy(() => import("../components/pages/Admin/AdminDashboard"));
const AdminTickets = lazy(() => import("../components/pages/Admin/Tickets/AdminTickets"));
const AdminPayments = lazy(() => import("../components/pages/Admin/AdminPayments"));
const AdminServices = lazy(() => import("../components/pages/Admin/AdminServices"));
const AdminControllers = lazy(() => import("../components/pages/Admin/AdminControllers"));
const DeveloperLogin = lazy(() => import("../components/pages/Developer/DeveloperLogin"));
const DeveloperKeys = lazy(() => import("../components/pages/Developer/DeveloperKeys"));
const AdminTechnicians = lazy(() => import("../components/pages/Admin/AdminTechnicians"));
const AdminStaff = lazy(() => import("../components/pages/Admin/AdminStaff"));
const AdminAnalytics = lazy(() => import("../components/pages/Admin/AdminAnalytics"));

const PageLoader = () => (
    <div className="flex flex-col justify-center items-center min-h-screen bg-canvas">
        <div className="w-8 h-8 border-2 border-hairline-strong border-t-brand rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-ink-faint">Loading Cosmosgen</p>
    </div>
);

/**
 * Every route below is lazy, and Suspense only covers a chunk that is still
 * arriving - not one that never arrives. A failed chunk request rejects, React
 * unmounts the tree, and the user is left on a white screen with nothing but a
 * console message. That happens for ordinary reasons: a dropped connection
 * mid-navigation, a stale cached copy after a deploy, or a browser that cannot
 * read its own disk cache.
 *
 * So catch it and say so, with the one action that actually fixes it.
 */
class RouteErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { failed: false };
    }

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error) {
        console.error("Route failed to load:", error);
    }

    render() {
        if (!this.state.failed) return this.props.children;

        return (
            <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 px-6 text-center">
                <p className="text-lg font-semibold text-gray-900">This page didn't load</p>
                <p className="mt-1.5 text-sm text-gray-500 max-w-sm">
                    The connection dropped or a cached file is out of date. Reloading usually
                    fixes it.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-5 px-5 py-2.5 bg-green-700 hover:bg-green-800 text-white font-semibold rounded-lg text-sm"
                >
                    Reload
                </button>
            </div>
        );
    }
}

const AppRouter = () => {
    return (
        <>
            {/* Wrapped around everything rather than around the customer
                routes alone: the header on those pages reads the session, and
                a provider mounted inside a route remounts - and re-asks the
                server who this is - on every navigation between them.

                `BrowserRouter` itself lives in App, above the admin provider,
                so that provider can read the current route instead of the
                address bar as it was when the tab opened. */}
            <CustomerProvider>
                <AreaProvider>
            <RouteErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                    <Routes>
                        {/* Customer - the public face of the company.
                            No booking here: a job needs a pin on a map and a
                            code at the door, and a web form can honestly offer
                            neither. These pages explain the work and hand over
                            to WhatsApp or the app. */}
                        <Route path="/" element={<CustomerHome />} />
                        <Route path="/services" element={<CustomerServices />} />
                        <Route path="/how-it-works" element={<CustomerHowItWorks />} />
                        {/*
                          * A customer's own jobs, at their own address.
                          *
                          * The id is theirs and the page is behind their
                          * session, so it identifies the page rather than
                          * granting anything: opening somebody else's id shows
                          * you your own jobs, because the server answers the
                          * cookie and not the URL.
                          */}
                        <Route path="/account" element={<CustomerAccount />} />
                        <Route path="/account/:customerId" element={<CustomerAccount />} />
                        {/*
                          * The assistant lives under its own name, and carries
                          * the conversation's id in the address.
                          *
                          * A thread is a real thing on the server that outlives
                          * the tab, so it should be addressable: this is what
                          * lets somebody reopen a conversation on another
                          * device, or send it to the office when something has
                          * gone wrong. The old `/chat` is kept as a redirect,
                          * because it has been given out.
                          */}
                        <Route path="/ai-assistant/chat" element={<CustomerAssistant />} />
                        <Route path="/ai-assistant/chat/:chatId" element={<CustomerAssistant />} />
                        <Route path="/chat" element={<Navigate to="/ai-assistant/chat" replace />} />
                        <Route path="/about" element={<CustomerAbout />} />
                        <Route path="/pricing" element={<CustomerPricing />} />
                        <Route path="/join" element={<CustomerJoin />} />
                        <Route path="/faq" element={<CustomerFaq />} />

                        {/* Public. The token in the path is the credential -
                            the customer followed this link from WhatsApp and
                            has no account to sign in to. */}
                        <Route path="/track/:token" element={<CustomerTracking />} />

                        {/* Technician */}
                        <Route path="/technician/admin/register" element={<TechnicianRegister />} />
                        <Route path="/technician/admin/login" element={<TechnicianLogin />} />
                        <Route path="/technician/admin/profile" element={<TechnicianProfile />} />
                        <Route path="/technician/admin/:id/profile" element={<TechnicianProfile />} />
                        <Route path="/technician/admin" element={<TechnicianPanel />} />
                        <Route path="/technician/admin/:id" element={<TechnicianPanel />} />

                        {/* Admin (backoffice) */}
                        <Route path="/admin/register" element={<AdminRegister />} />
                        <Route path="/admin/login" element={<AdminLogin />} />
                        <Route path="/owner/login" element={<OwnerLogin />} />
                    
                        <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
                        <Route path="/admin/:id" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
                    
                        <Route path="/admin/tickets" element={<AdminProtectedRoute requiredPermission="VIEW_TICKETS"><AdminTickets /></AdminProtectedRoute>} />
                        <Route path="/admin/:id/tickets" element={<AdminProtectedRoute requiredPermission="VIEW_TICKETS"><AdminTickets /></AdminProtectedRoute>} />
                    
                        <Route path="/admin/payments" element={<AdminProtectedRoute requiredPermission="VIEW_PAYMENTS"><AdminPayments /></AdminProtectedRoute>} />
                        <Route path="/admin/:id/payments" element={<AdminProtectedRoute requiredPermission="VIEW_PAYMENTS"><AdminPayments /></AdminProtectedRoute>} />
                    
                        <Route path="/admin/services" element={<AdminProtectedRoute requiredPermission="MANAGE_PRICING"><AdminServices /></AdminProtectedRoute>} />
                    
                        <Route path="/admin/controllers" element={<AdminProtectedRoute><AdminControllers /></AdminProtectedRoute>} />

                        {/* The engine room. Its own door, its own sign-in, and
                            nothing of the backoffice's chrome around it. */}
                        <Route path="/developer/login" element={<DeveloperLogin />} />
                        <Route path="/developer" element={<DeveloperRoute><DeveloperKeys /></DeveloperRoute>} />
                        <Route path="/admin/:id/controllers" element={<AdminProtectedRoute><AdminControllers /></AdminProtectedRoute>} />
                        <Route path="/admin/:id/services" element={<AdminProtectedRoute requiredPermission="MANAGE_PRICING"><AdminServices /></AdminProtectedRoute>} />
                    
                        <Route path="/admin/technicians" element={<AdminProtectedRoute requiredPermission="VIEW_TECHNICIANS"><AdminTechnicians /></AdminProtectedRoute>} />
                        <Route path="/admin/:id/technicians" element={<AdminProtectedRoute requiredPermission="VIEW_TECHNICIANS"><AdminTechnicians /></AdminProtectedRoute>} />

                        <Route path="/admin/wallets" element={<AdminProtectedRoute requiredPermission="VIEW_WALLETS"><AdminPayments /></AdminProtectedRoute>} />
                        <Route path="/admin/:id/wallets" element={<AdminProtectedRoute requiredPermission="VIEW_WALLETS"><AdminPayments /></AdminProtectedRoute>} />
                    
                        <Route path="/admin/staff" element={<AdminProtectedRoute requiredPermission="MANAGE_STAFF"><AdminStaff /></AdminProtectedRoute>} />
                        <Route path="/admin/:id/staff" element={<AdminProtectedRoute requiredPermission="MANAGE_STAFF"><AdminStaff /></AdminProtectedRoute>} />
                    
                        <Route path="/admin/analytics" element={<AdminProtectedRoute requiredPermission="VIEW_ANALYTICS"><AdminAnalytics /></AdminProtectedRoute>} />
                        <Route path="/admin/:id/analytics" element={<AdminProtectedRoute requiredPermission="VIEW_ANALYTICS"><AdminAnalytics /></AdminProtectedRoute>} />

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Suspense>
            </RouteErrorBoundary>
                </AreaProvider>
            </CustomerProvider>
        </>
    );
};

export default AppRouter;