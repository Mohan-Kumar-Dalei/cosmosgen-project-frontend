import React from "react";
import { Toaster } from "sonner";
import { AdminAuthProvider } from "./components/pages/Admin/AdminAuth";
import { AdminDataProvider } from "./components/pages/Admin/AdminDataContext";
import AppRouter from "./router/AppRouter";

const App = () => {
    return (
        <AdminAuthProvider>
            <AdminDataProvider>
                <AppRouter />
                <Toaster
                    position="bottom-center"
                    richColors
                    closeButton
                    duration={5000}
                    toastOptions={{ style: { fontFamily: "inherit" } }}
                />
            </AdminDataProvider>
        </AdminAuthProvider>
    );
};

export default App;