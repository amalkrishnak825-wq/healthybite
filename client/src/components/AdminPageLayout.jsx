import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AdminSidebar from "./AdminSidebar";
import AdminToolbar from "./AdminToolbar";

export default function AdminPageLayout({
  activePage,
  children,
  toolbarProps,
  className = "admin-app",
}) {
  const navigate = useNavigate();
  async function logout() {
    try {
      await api.post("/auth/admin/logout");
    } finally {
      sessionStorage.removeItem("healthyBiteAdmin");
      sessionStorage.removeItem("healthyBiteAdminUser");
      navigate("/admin/login");
    }
  }

  return (
    <div className={className}>
      <AdminSidebar activePage={activePage} onLogout={logout} />
      <main className="admin-work">
        <AdminToolbar {...toolbarProps} />
        {children}
      </main>
    </div>
  );
}
