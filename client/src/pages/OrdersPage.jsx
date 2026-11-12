import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import AdminPagination from "../components/AdminPagination";
import OrderDeliveryProgress from "../components/OrderDeliveryProgress";
import OrderStatusBadge from "../components/OrderStatusBadge";
import api, { getErrorMessage } from "../api/axios";
import "../styles/Catalog.css";
import "../styles/Checkout.css";

const pageSize = 4;

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  useEffect(() => {
    let active = true;
    api.get("/orders", { params: { page, limit: pageSize } }).then((response) => {
      if (!active) return;
      setOrders(response.data.orders || []);
      setPagination(response.data.pagination || { page, pages: 1, total: 0 });
      setError("");
    }).catch((failure) => {
      if (active) setError(getErrorMessage(failure));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page]);

  function changePage(nextPage) {
    setLoading(true);
    setPage(nextPage);
  }

  return (
    <div className="home-page">
      <Header />
      <main className="wishlist-page">
        <div className="catalog-heading"><div><span className="home-section-label">YOUR HEALTHYBITE</span><h1>My orders</h1><p>Review your past meal orders.</p></div><Link to="/products">Explore meals</Link></div>
        {error && <div className="checkout-error" role="alert">{error}</div>}
        {loading ? <div className="checkout-loading">Loading your orders…</div> : pagination.total ? <>
          <div className="orders-list">{orders.map((order) => <article className="order-card" key={order._id}>
            <div className="order-card-heading"><span><small>ORDER #{String(order._id).slice(-8).toUpperCase()}</small><b>{new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</b></span><OrderStatusBadge order={order} /></div>
            <OrderDeliveryProgress order={order} />
            <div className="order-card-items">{order.items.map((item, index) => <div className="order-card-item" key={`${order._id}-${index}`}><img src={item.image?.startsWith("/") ? `http://localhost:5000${item.image}` : item.image || "/login-bg.jpg"} alt="" /><span><b>{item.name}</b><small>Qty {item.quantity} · ₹{item.unitPrice.toFixed(2)} each</small></span><strong>₹{item.lineTotal.toFixed(2)}</strong></div>)}</div>
            <div className="order-card-footer"><span>{order.address.city}, {order.address.state} · {order.walletAppliedAmount > 0 && order.cashDueAmount > 0 ? "Wallet + Cash on Delivery" : order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMethod === "wallet" ? "HealthyBite Wallet" : "Razorpay"}</span><strong>{order.cashDueAmount > 0 && order.walletAppliedAmount > 0 ? `Due ₹${order.cashDueAmount.toFixed(2)}` : `Payable ₹${order.pricing.total.toFixed(2)}`}</strong></div>
            <div className="order-card-actions">
              <Link className="order-view-details" to={`/orders/${order._id}`}>View order details</Link>
              {order.paymentStatus === "failed" && <Link className="order-retry-link" to={`/payment/failure/${order._id}`}>Retry payment</Link>}
            </div>
          </article>)}</div>
          <AdminPagination
            page={page}
            pages={pagination.pages}
            total={pagination.total}
            pageSize={pageSize}
            onPageChange={changePage}
            label="orders"
            numbered
            footerClassName="orders-pagination"
            controlsClassName="admin-pagination"
          />
        </> : <section className="catalog-empty"><ClipboardList size={28} /><p>Your order history will appear here after checkout.</p><Link to="/products">Browse meals</Link></section>}
      </main>
      <Footer />
    </div>
  );
}
