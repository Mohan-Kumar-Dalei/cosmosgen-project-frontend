import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminProtectedRoute } from "../components/pages/Protected/ProtectedRoute";

const CustomerDemo = lazy(() => import("../components/pages/CustomerDemo"));
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
const AdminTechnicians = lazy(() => import("../components/pages/Admin/AdminTechnicians"));
const AdminWallets = lazy(() => import("../components/pages/Admin/AdminWallets"));
const AdminStaff = lazy(() => import("../components/pages/Admin/AdminStaff"));
const AdminAnalytics = lazy(() => import("../components/pages/Admin/AdminAnalytics"));

const PageLoader = () => (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50">
        <div className="w-10 h-10 border-4 border-green-700 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600 font-medium">Loading Cosmosgen Platform...</p>
    </div>
);

const AppRouter = () => {
    return (
        <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    {/* Customer */}
                    <Route path="/chat" element={<CustomerDemo />} />

                    {/* Technician */}
                    <Route path="/technician/admin/register" element={<TechnicianRegister />} />
                    <Route path="/technician/admin/login" element={<TechnicianLogin />} />
                    <Route path="/technician/admin/profile" element={<TechnicianProfile />} />
                    <Route path="/technician/admin" element={<TechnicianPanel />} />

                    {/* Admin (backoffice) */}
                    <Route path="/admin/register" element={<AdminRegister />} />
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/owner/login" element={<OwnerLogin />} />
                    <Route
                        path="/admin"
                        element={
                            <AdminProtectedRoute>
                                <AdminDashboard />
                            </AdminProtectedRoute>
                        }
                    />
                    <Route path="/admin/tickets" element={
                        <AdminProtectedRoute requiredPermission="VIEW_TICKETS"><AdminTickets /></AdminProtectedRoute>
                    } />
                    <Route path="/admin/payments" element={
                        <AdminProtectedRoute requiredPermission="VIEW_PAYMENTS"><AdminPayments /></AdminProtectedRoute>
                    } />
                    <Route path="/admin/services" element={
                        <AdminProtectedRoute requiredPermission="MANAGE_PRICING"><AdminServices /></AdminProtectedRoute>
                    } />
                    <Route path="/admin/technicians" element={
                        <AdminProtectedRoute requiredPermission="VIEW_TECHNICIANS"><AdminTechnicians /></AdminProtectedRoute>
                    } />

                    <Route path="/admin/wallets" element={
                        <AdminProtectedRoute requiredPermission="VIEW_WALLETS"><AdminWallets /></AdminProtectedRoute>
                    } />
                    <Route path="/admin/staff" element={
                        <AdminProtectedRoute requiredPermission="MANAGE_STAFF"><AdminStaff /></AdminProtectedRoute>
                    } />
                    <Route path="/admin/analytics" element={
                        <AdminProtectedRoute requiredPermission="VIEW_ANALYTICS"><AdminAnalytics /></AdminProtectedRoute>
                    } />

                    <Route path="*" element={<Navigate to="/chat" replace />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
};

export default AppRouter;