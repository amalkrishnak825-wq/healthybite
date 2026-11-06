import { Link } from "react-router-dom";
import {
  Activity,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Tag,
  Truck,
  UtensilsCrossed,
  Users,
} from "lucide-react";

const navigationItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Meals", icon: UtensilsCrossed, to: "/admin/meals", key: "meals" },
  { label: "Orders", icon: ClipboardList },
  {
    label: "Customers",
    icon: Users,
    to: "/admin/users",
    key: "customers",
  },
  { label: "Delivery Agents", icon: Truck },
  { label: "Coupons", icon: Tag },
  { label: "Reports & Analytics", icon: Activity },
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
