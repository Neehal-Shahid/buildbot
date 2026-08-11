import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastProvider } from "./components/ui/ToastProvider";
import { ConfirmProvider } from "./components/ui/ConfirmDialog";
import { GlobalLoader } from "./components/ui/GlobalLoader";
import VerifyPage from "./pages/VerifyPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AdminPage from "./pages/AdminPage";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";

// Route paths mirror the original dashboard/vercel.json exactly, including
// keeping the literal *.html paths (not just clean URLs) because
// server/email.js hardcodes links like `${APP_URL}/verify.html?token=...`
// in already-sent and future verification/reset emails — those must keep
// resolving after the frontend migrates.
export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ConfirmProvider>
          <GlobalLoader />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/index.html" element={<LandingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard.html" element={<DashboardPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin.html" element={<AdminPage />} />
            <Route path="/verify.html" element={<VerifyPage />} />
            <Route path="/reset-password.html" element={<ResetPasswordPage />} />
          </Routes>
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
