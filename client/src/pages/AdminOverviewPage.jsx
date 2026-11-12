import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  IndianRupee,
  PackagePlus,
  ShoppingBag,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api, { getErrorMessage } from "../api/axios";
import AdminPageLayout from "../components/AdminPageLayout";
import { getImageUrl } from "../utils/imageUrl";
import { readAdminUser } from "../utils/admin";
import useAdminErrorToast from "../utils/useAdminErrorToast";
import "../styles/AdminOverview.css";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const emptyRows = [];
const dateKey = (date) => date.toISOString().slice(0, 10);

export default function AdminOverviewPage() {
  const navigate = useNavigate();
  const admin = readAdminUser();
  const [report, setReport] = useState(null);
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({ totalOrders: 0, revenue: 0 });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useAdminErrorToast(error, setError);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/orders/admin/reports", { params: { days: 7 } }),
      api.get("/orders/admin", { params: { page: 1, limit: 6 } }),
    ])
      .then(([reportResponse, ordersResponse]) => {
        if (!active) return;
        setReport(reportResponse.data);
        setOrders(ordersResponse.data.orders || []);
        setSummary(ordersResponse.data.summary || { totalOrders: 0, revenue: 0 });
        setError("");
      })
      .catch((failure) => {
        if (!active) return;
        if ([401, 403].includes(failure.response?.status)) {
          sessionStorage.removeItem("healthyBiteAdmin");
          navigate("/admin/login", { replace: true, state: { error: getErrorMessage(failure) } });
        } else setError(getErrorMessage(failure));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [navigate]);

  const dailyByDate = new Map((report?.daily || emptyRows).map((day) => [day._id, day]));
  const week = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - (6 - offset));
    const key = dateKey(date);
    return { key, date, ...(dailyByDate.get(key) || { revenue: 0, units: 0, orders: 0 }) };
  });
  const maxRevenue = Math.max(1, ...week.map((day) => day.revenue));
  const maxUnits = Math.max(1, ...week.map((day) => day.units));
  const totalUnits = week.reduce((sum, day) => sum + day.units, 0);
  const activeOrders = (report?.statuses || emptyRows)
    .filter((item) => ["placed", "awaiting_payment"].includes(item._id))
    .reduce((sum, item) => sum + item.count, 0);
  const popularMeals = report?.topMeals || emptyRows;
  const firstName = admin.name?.trim().split(/\s+/)[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const linePoints = week.map((day, index) => `${index * 100 + 50},${165 - (day.units / maxUnits) * 125}`).join(" ");

  return (
    <AdminPageLayout activePage="overview">
      <section className="admin-page operations-page admin-overview-page">
        <header className="overview-welcome-card">
          <div>
            <span className="overview-welcome-kicker">HEALTHYBITE ADMIN</span>
            <h1>{greeting}, {firstName}!</h1>
            <p>Here’s what’s happening across your meal store this week.</p>
          </div>
          <div className="overview-welcome-actions">
            <span className="overview-today"><CalendarDays size={15} />{new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
            <Link to="/admin/meals/new" className="overview-create-meal"><PackagePlus size={15} /> Create New Meal</Link>
          </div>
        </header>

        <div className="overview-metrics">
          <article className="overview-metric"><div><small>TOTAL REVENUE</small><b>{loading ? "…" : money(summary.revenue)}</b><p>Successful orders to date</p></div><span className="overview-metric-icon revenue"><IndianRupee size={17} /></span></article>
          <article className="overview-metric"><div><small>ACTIVE ORDERS</small><b>{loading ? "…" : activeOrders}</b><p>Placed or awaiting payment · 7 days</p></div><span className="overview-metric-icon active"><ClipboardList size={17} /></span></article>
          <article className="overview-metric"><div><small>ORDERS THIS WEEK</small><b>{loading ? "…" : report?.summary.orders || 0}</b><p>{totalUnits} meals sold this week</p></div><span className="overview-metric-icon orders"><ShoppingBag size={17} /></span></article>
          <article className="overview-metric"><div><small>AVERAGE ORDER VALUE</small><b>{loading ? "…" : money(report?.summary.averageOrderValue)}</b><p>Successfully paid orders · 7 days</p></div><span className="overview-metric-icon average"><Users size={17} /></span></article>
        </div>

        <div className="overview-main-grid">
          <section className="overview-panel overview-stream-panel">
            <header className="overview-panel-heading"><div><span>LIVE ORDER STREAM</span><h2>Recent orders</h2><p>Latest activity from your customers.</p></div><Link to="/admin/orders">View all orders <ArrowRight size={14} /></Link></header>
            <div className="overview-orders-table-wrap">
              <table className="overview-orders-table">
                <thead><tr><th>Order</th><th>Customer</th><th>Meal items</th><th>City</th><th>Amount</th></tr></thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id}>
                      <td><b>#{order._id.slice(-6).toUpperCase()}</b></td>
                      <td><span>{order.user?.name || order.address?.fullName || "Customer"}</span><small>{new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small></td>
                      <td className="overview-meal-cell">{order.items?.map((item) => item.name).join(", ") || "Meal order"}</td>
                      <td><span className="overview-city-label">{order.address?.city || "—"}</span></td>
                      <td><b>{money(order.pricing?.total)}</b></td>
                    </tr>
                  ))}
                  {!loading && !orders.length && <tr><td colSpan="5" className="overview-empty-cell">No recent orders yet.</td></tr>}
                  {loading && !orders.length && <tr><td colSpan="5" className="overview-empty-cell">Loading orders…</td></tr>}
                </tbody>
              </table>
            </div>
            <footer className="overview-stream-footer"><span>Showing the latest {orders.length} orders</span><Link to="/admin/orders">Open order management <ArrowRight size={13} /></Link></footer>
          </section>

          <section className="overview-panel overview-popular-panel">
            <header className="overview-panel-heading"><div><span>BEST SELLERS</span><h2>Top selling this week</h2><p>Meals customers ordered most.</p></div><UtensilsCrossed size={17} /></header>
            {popularMeals.length ? <div className="overview-popular-list">{popularMeals.slice(0, 5).map((meal, index) => (
              <div className="overview-popular-item" key={meal._id}>
                <span className="overview-popular-image"><UtensilsCrossed size={14} />{meal.image && <img src={getImageUrl(meal.image)} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />}</span>
                <div className="overview-popular-name"><b title={meal._id}>{meal._id}</b><small>{meal.units} sold</small></div>
                <span className="overview-popular-rank">{String(index + 1).padStart(2, "0")}</span>
              </div>
            ))}</div> : <div className="overview-empty">No meal sales this week yet.</div>}
            <Link className="overview-manage-meals" to="/admin/meals">Manage meal catalog <ArrowRight size={13} /></Link>
          </section>

          <section className="overview-panel overview-trend-panel">
            <header className="overview-panel-heading"><div><span>WEEKLY TREND</span><h2>Revenue & Kitchen Output</h2><p>Daily revenue and meal units sold this week.</p></div><Link to="/admin/reports">View reports <ArrowRight size={14} /></Link></header>
            {loading ? <div className="overview-empty">Loading weekly trend…</div> : (
              <div className="overview-trend-chart">
                <div className="overview-chart-labels"><span>{money(maxRevenue)}</span><span>{money(maxRevenue / 2)}</span><span>₹0</span></div>
                <div className="overview-chart-plot">
                  <div className="overview-chart-bars">{week.map((day) => <div className="overview-chart-column" key={day.key} title={`${day.key} · ${money(day.revenue)} · ${day.units} meals`}><span className="overview-chart-bar" style={{ height: `${Math.max(2, day.revenue / maxRevenue * 100)}%` }} /><small>{day.date.toLocaleDateString(undefined, { weekday: "short" })}</small></div>)}</div>
                  <svg className="overview-units-line" viewBox="0 0 700 180" preserveAspectRatio="none" aria-hidden="true"><polyline points={linePoints} /></svg>
                </div>
              </div>
            )}
            <footer className="overview-chart-legend"><span><i className="revenue-key" />Revenue ({money(report?.summary.revenue)})</span><span><i className="units-key" />Meals sold ({totalUnits})</span><small>Last 7 days</small></footer>
          </section>

          <section className="overview-panel overview-shortcut-panel">
            <header className="overview-panel-heading"><div><span>STORE WORKSPACE</span><h2>Quick access</h2><p>Manage your store from one place.</p></div></header>
            <div className="overview-shortcuts">
              <Link to="/admin/meals"><PackagePlus size={16} /><span>Meals</span><ArrowRight size={13} /></Link>
              <Link to="/admin/orders"><ClipboardList size={16} /><span>Orders</span><ArrowRight size={13} /></Link>
              <Link to="/admin/users"><Users size={16} /><span>Customers</span><ArrowRight size={13} /></Link>
            </div>
          </section>
        </div>
      </section>
    </AdminPageLayout>
  );
}
