import { AdminAuthProvider, useAdminAuth } from "../context/AdminAuthContext";
import { useInjectedCss } from "../lib/useInjectedCss";
import adminCss from "./admin/admin.css?raw";
import AdminLogin from "./admin/AdminLogin";
import AdminApp from "./admin/AdminApp";

function AdminGate() {
  const { token } = useAdminAuth();
  return token ? <AdminApp /> : <AdminLogin />;
}

export default function AdminPage() {
  useInjectedCss(adminCss);
  return (
    <AdminAuthProvider>
      <AdminGate />
    </AdminAuthProvider>
  );
}
