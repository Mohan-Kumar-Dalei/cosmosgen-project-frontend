import { GooeyToaster } from "goey-toast";
import "goey-toast/styles.css";
import { AdminAuthProvider } from "./components/pages/Admin/AdminAuth";
import { AdminDataProvider } from "./components/pages/Admin/AdminDataContext";
import AppRouter from "./router/AppRouter";

const App = () => {
    return (
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
    );
};

export default App;
