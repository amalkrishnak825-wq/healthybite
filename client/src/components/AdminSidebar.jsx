import { Link } from "react-router-dom";
import {
  Activity,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Tag,
  UtensilsCrossed,
  Users,
} from "lucide-react";

const navigationItems = [
  { label: "Overview", icon: LayoutDashboard, to: "/admin/overview", key: "overview" },
  { label: "Meals", icon: UtensilsCrossed, to: "/admin/meals", key: "meals" },
  { label: "Orders", icon: ClipboardList, to: "/admin/orders", key: "orders" },
  {
    label: "Customers",
    icon: Users,
    to: "/admin/users",
    key: "customers",
  },
  { label: "Coupons", icon: Tag, to: "/admin/coupons", key: "coupons" },
  { label: "Reports & Analytics", icon: Activity, to: "/admin/reports", key: "reports" },
];

export default function AdminSidebar({ activePage, onLogout }) {
  return (
    <aside className="admin-rail">
      <Link to="/" className="admin-brand">
        <span className="admin-brand-mark">
          <UtensilsCrossed size={20} />
        </span>
        <span>
          <b>HealthyBite</b>
          <small>FRESH · HEALTHY · DELICIOUS</small>
        </span>
      </Link>
      <nav className="admin-nav">
        <span className="admin-nav-label">WORKSPACE</span>
        {navigationItems.map(({ label, icon: Icon, to, key }) => {
          const className = key === activePage ? "current" : undefined;
          const content = (
            <>
              <Icon />
              {label}
            </>
          );

          return to ? (
            <Link key={label} className={className} to={to}>
              {content}
            </Link>
          ) : (
            <a key={label}>{content}</a>
          );
        })}
      </nav>
      <button className="admin-logout" onClick={onLogout}>
        <LogOut size={17} /> Logout
      </button>
    </aside>
  );
}
