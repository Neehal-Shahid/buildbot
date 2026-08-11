import { AdminAuthProvider, useAdminAuth } from "../context/AdminAuthContext";
import AdminLogin from "./admin/AdminLogin";
import AdminApp from "./admin/AdminApp";

function AdminGate() {
  const { token } = useAdminAuth();
  return token ? <AdminApp /> : <AdminLogin />;
}

export default function AdminPage() {
  return (
    <AdminAuthProvider>
      <AdminGate />
    </AdminAuthProvider>
  );
}
