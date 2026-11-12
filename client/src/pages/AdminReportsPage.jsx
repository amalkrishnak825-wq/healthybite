import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, CalendarDays, Download, IndianRupee, Tag, TrendingUp, UtensilsCrossed, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api, { getErrorMessage } from "../api/axios";
import AdminPageHeader from "../components/AdminPageHeader";
import AdminPageLayout from "../components/AdminPageLayout";
import { getImageUrl } from "../utils/imageUrl";
import useAdminErrorToast from "../utils/useAdminErrorToast";
import "../styles/AdminOperations.css";
import "../styles/AdminReports.css";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const emptyRows = [];
const today = new Date().toISOString().slice(0, 10);
const weekAgo = () => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 6);
  return date.toISOString().slice(0, 10);
};

function downloadReport(report, daysLabel) {
  const rows = [
    ["HealthyBite Reports & Analytics", daysLabel],
    [],
    ["Metric", "Value"],
    ["Total revenue", report.summary.revenue || 0],
    ["Total orders", report.summary.orders || 0],
    ["Average order value", report.summary.averageOrderValue || 0],
    ["New customers", report.summary.newCustomers || 0],
    [],
    ["Revenue by date"],
    ["Date", "Revenue", "Orders", "Meals sold"],
    ...(report.daily || []).map((day) => [day._id, day.revenue, day.orders, day.units || 0]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "healthybite-reports.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminReportsPage() {
  const navigate = useNavigate();
  const [preset, setPreset] = useState("7");
  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useAdminErrorToast(error, setError);

  useEffect(() => {
    if (preset === "custom" && (!from || !to)) return undefined;
    let active = true;
    const params = preset === "custom" ? { from, to } : { days: Number(preset) };
    api
      .get("/orders/admin/reports", { params })
      .then((response) => {
        if (active) {
          setReport(response.data);
          setError("");
        }
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
  }, [preset, from, to, navigate]);

  const daily = report?.daily || emptyRows;
  const topMeals = report?.topMeals || emptyRows;
  const categories = report?.categorySales || emptyRows;
  const coupons = report?.couponPerformance || emptyRows;
  const summary = report?.summary || {};
  const maxRevenue = useMemo(() => Math.max(1, ...daily.map((day) => day.revenue)), [daily]);
  const maxCategoryRevenue = Math.max(1, ...categories.map((item) => item.revenue));
  const points = daily.map((day, index) => {
    const x = daily.length <= 1 ? 500 : index / (daily.length - 1) * 1000;
    const y = 220 - day.revenue / maxRevenue * 180;
    return { day, x, y };
  });
  const revenueLine = points.map(({ x, y }) => `${x},${y}`).join(" ");
  const revenueArea = points.length ? `M 0 220 L ${points.map(({ x, y }) => `${x} ${y}`).join(" L ")} L 1000 220 Z` : "";
  const rangeLabel = preset === "custom" ? `${from} – ${to}` : `Last ${preset} days`;
  const dateLabelStep = Math.max(1, Math.ceil(daily.length / 6));

  return (
    <AdminPageLayout activePage="reports">
      <section className="admin-page operations-page admin-reports-page">
        <AdminPageHeader
          kicker="BUSINESS PERFORMANCE"
          title="Reports & Analytics"
          description="Review revenue, order trends, customer growth, meals, and promotions."
          action={(
            <div className="reports-header-actions">
              <div className="reports-date-pills" aria-label="Report date range">
                <button type="button" className={preset === "7" ? "selected" : ""} onClick={() => { setLoading(true); setPreset("7"); }}>Last 7 days</button>
                <button type="button" className={preset === "30" ? "selected" : ""} onClick={() => { setLoading(true); setPreset("30"); }}>Last 30 days</button>
                <button type="button" className={preset === "custom" ? "selected" : ""} onClick={() => { setLoading(true); setPreset("custom"); }}><CalendarDays size={13} /> Custom</button>
              </div>
              <button type="button" className="reports-download" disabled={!report} onClick={() => report && downloadReport(report, rangeLabel)}><Download size={14} /> Download CSV</button>
            </div>
          )}
        />
        {preset === "custom" && <div className="reports-custom-dates"><label>From<input type="date" value={from} max={to || today} onChange={(event) => { setLoading(true); setFrom(event.target.value); }} /></label><label>To<input type="date" value={to} min={from} max={today} onChange={(event) => { setLoading(true); setTo(event.target.value); }} /></label></div>}

        <div className="reports-kpis">
          <article><span className="reports-kpi-icon revenue"><IndianRupee size={16} /></span><small>TOTAL REVENUE</small><b>{loading && !report ? "…" : money(summary.revenue)}</b><p>Successful orders in range</p></article>
          <article><span className="reports-kpi-icon orders"><Activity size={16} /></span><small>TOTAL ORDERS</small><b>{loading && !report ? "…" : Number(summary.orders || 0).toLocaleString()}</b><p>Orders placed in range</p></article>
          <article><span className="reports-kpi-icon average"><TrendingUp size={16} /></span><small>AVERAGE ORDER VALUE</small><b>{loading && !report ? "…" : money(summary.averageOrderValue)}</b><p>Average per successful order</p></article>
          <article><span className="reports-kpi-icon customers"><Users size={16} /></span><small>NEW CUSTOMERS</small><b>{loading && !report ? "…" : Number(summary.newCustomers || 0).toLocaleString()}</b><p>Accounts created in range</p></article>
        </div>

        <div className="reports-dashboard-grid">
          <section className="reports-card reports-trend-card">
            <header className="reports-card-heading"><div><span>REVENUE & SALES TREND</span><h2>Revenue over time</h2><p>Daily revenue and meal volume for {rangeLabel.toLowerCase()}.</p></div><div className="reports-chart-legend"><span><i className="revenue" />Revenue</span><span><i className="volume" />Meal volume</span></div></header>
            {loading && !report ? <div className="reports-empty">Loading sales trend…</div> : daily.length ? (
              <div className="reports-line-chart">
                <div className="reports-y-labels"><span>{money(maxRevenue)}</span><span>{money(maxRevenue * .75)}</span><span>{money(maxRevenue * .5)}</span><span>{money(maxRevenue * .25)}</span></div>
                <div className="reports-chart-plot">
                  <div className="reports-grid-lines"><i /><i /><i /><i /></div>
                  <svg viewBox="0 0 1000 240" preserveAspectRatio="none" role="img" aria-label={`Revenue trend for ${rangeLabel}`}>
                    <defs><linearGradient id="reportRevenueFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#5e9b6b" stopOpacity=".26" /><stop offset="100%" stopColor="#5e9b6b" stopOpacity=".015" /></linearGradient></defs>
                    <path d={revenueArea} fill="url(#reportRevenueFill)" />
                    <polyline points={revenueLine} fill="none" stroke="#4a8a59" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                    {points.map(({ day, x, y }) => <circle key={day._id} cx={x} cy={y} r="4" fill="#fff" stroke="#3e7c4d" strokeWidth="2" vectorEffect="non-scaling-stroke"><title>{`${day._id}: ${money(day.revenue)} · ${day.units || 0} meals`}</title></circle>)}
                  </svg>
                  <div className="reports-x-labels">{daily.map((day, index) => <small key={day._id}>{index % dateLabelStep === 0 || index === daily.length - 1 ? new Date(`${day._id}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}</small>)}</div>
                </div>
              </div>
            ) : <div className="reports-empty">No sales data for this date range.</div>}
          </section>

          <section className="reports-card reports-top-meals-card">
            <header className="reports-card-heading"><div><span>TOP SELLING</span><h2>Popular meals</h2><p>Ranked by units sold.</p></div></header>
            {topMeals.length ? <div className="reports-top-meals">{topMeals.slice(0, 5).map((meal, index) => (
              <div className="reports-meal-row" key={meal._id}>
                <span className="reports-meal-rank">{index + 1}</span>
                <span className="reports-meal-image"><UtensilsCrossed size={14} />{meal.image && <img src={getImageUrl(meal.image)} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />}</span>
                <span className="reports-meal-name"><b title={meal._id}>{meal._id}</b><small>{money(meal.revenue)} revenue</small></span>
                <strong>{meal.units}<small> sold</small></strong>
              </div>
            ))}</div> : <div className="reports-empty">No meal sales in this range.</div>}
          </section>

          <section className="reports-card reports-category-card">
            <header className="reports-card-heading"><div><span>SALES MIX</span><h2>Sales by category</h2><p>Revenue from completed orders.</p></div><Tag size={15} /></header>
            {categories.length ? <>
              <div className="reports-category-bars">{categories.map((category, index) => <div className="reports-category-row" key={category._id}>
                <div><b>{category._id}</b><span>{money(category.revenue)} <small>· {category.units} meals</small></span></div>
                <i><span className={`shade-${index % 5}`} style={{ width: `${category.revenue / maxCategoryRevenue * 100}%` }} /></i>
                <small>{summary.revenue ? Math.round(category.revenue / summary.revenue * 100) : 0}%</small>
              </div>)}</div>
              <div className="reports-top-category"><span>TOP CATEGORY</span><b>{categories[0]._id}</b><strong>{money(categories[0].revenue)}</strong></div>
            </> : <div className="reports-empty">No category sales in this range.</div>}
          </section>

          <section className="reports-card reports-coupons-card">
            <header className="reports-card-heading"><div><span>PROMOTIONS</span><h2>Coupon performance</h2><p>Discounts used at checkout.</p></div><Tag size={15} /></header>
            <div className="reports-coupon-summary"><div><small>PROMO REVENUE</small><b>{money(report?.couponSummary?.discount)}</b></div><div><small>TOTAL USES</small><b>{Number(report?.couponSummary?.uses || 0).toLocaleString()}</b></div></div>
            {coupons.length ? <div className="reports-coupon-list">{coupons.slice(0, 4).map((coupon) => <div key={coupon._id}><b>{coupon._id}</b><span>{coupon.uses} uses</span><strong>{money(coupon.discount)}</strong></div>)}</div> : <div className="reports-coupon-empty">No coupons were used in this date range.</div>}
            <Link className="reports-manage-coupons" to="/admin/coupons">Manage coupons <ArrowRight size={13} /></Link>
          </section>
        </div>
      </section>
    </AdminPageLayout>
  );
}
