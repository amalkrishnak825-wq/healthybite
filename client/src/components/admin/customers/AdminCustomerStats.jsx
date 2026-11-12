import { Ban, Mail, ShieldCheck, Users } from "lucide-react";

const statCards = [
  {
    key: "total",
    title: "Total Customers",
    note: "Registered profiles",
    icon: Users,
  },
  {
    key: "active",
    title: "Active Accounts",
    note: (summary) => `${summary.total ? Math.round((summary.active / summary.total) * 100) : 0}% of customers`,
    icon: ShieldCheck,
  },
  {
    key: "deactivated",
    title: "Deactivated / Inactive",
    note: "Blocked from customer features",
    icon: Ban,
    tone: "red",
  },
  {
    key: "verified",
    title: "Verified Emails",
    note: "Email addresses confirmed",
    icon: Mail,
    tone: "mint",
  },
];

export default function AdminCustomerStats({ summary }) {
  return (
    <div className="admin-stats">
      {statCards.map(({ key, title, note, icon: Icon, tone = "green" }) => (
        <article className="admin-stat-card" key={key}>
          <div className="stat-label">
            {title}
            <span className={`stat-icon ${tone}`}><Icon /></span>
          </div>
          <div className="stat-number">{Number(summary[key] || 0).toLocaleString()}</div>
          <small>{typeof note === "function" ? note(summary) : note}</small>
        </article>
      ))}
    </div>
  );
}
