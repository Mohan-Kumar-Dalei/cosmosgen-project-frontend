import { BrowserRouter } from "react-router-dom";
import { GooeyToaster } from "goey-toast";
import "goey-toast/styles.css";
import { AdminAuthProvider } from "./components/pages/Admin/AdminAuth";
import { AdminDataProvider } from "./components/pages/Admin/AdminDataContext";
import AppRouter from "./router/AppRouter";

/*
 * The router sits outside the providers, not inside the pages.
 *
 * It used to live in AppRouter, which put the admin provider above it - and a
 * provider above the router cannot ask which page it is on, only which address
 * the tab was opened at. That was the whole bug: somebody who landed on the
 * homepage and then clicked through to /admin/login was never checked for an
 * existing session, so a signed-in admin got the login form until they
 * reloaded.
 */
const App = () => {
    return (
        <BrowserRouter>
            <AdminAuthProvider>
                <AdminDataProvider>
                    <AppRouter />
                    <GooeyToaster
                        position="top-right"
                        theme="light"
                        closeButton
                        offset="20px"
                        duration={6000}
                        preset="smooth"
                        showProgress={false}
                        visibleToasts={4}
                    />
                </AdminDataProvider>
            </AdminAuthProvider>
        </BrowserRouter>
    );
};

export default App;
