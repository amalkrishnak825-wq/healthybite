import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarDays, CheckCircle2, CircleX, ClipboardList, Clock3, MapPin, PackageCheck } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import api, { getErrorMessage } from "../api/axios";
import { getImageUrl } from "../utils/imageUrl";
import "../styles/Checkout.css";

export default function PaymentResultPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get(`/orders/${orderId}`).then((response) => {
      if (active) setOrder(response.data.order);
    }).catch((failure) => {
      if (active) setError(getErrorMessage(failure));
    });
    return () => { active = false; };
  }, [orderId]);

  const succeeded = order?.paymentStatus === "paid" || (order?.paymentStatus === "not_required" && order?.paymentMethod === "cod");
  const loading = !order && !error;

  if (succeeded && order) {
    const placedAt = new Date(order.createdAt);
    const orderReference = `HB-${String(order._id).slice(-6).toUpperCase()}`;
    const paymentLabel = order.walletAppliedAmount > 0 && order.cashDueAmount > 0 ? "Wallet + Cash on Delivery" : order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMethod === "wallet" ? "HealthyBite Wallet" : "Razorpay";

    return <div className="home-page"><Header /><main className="order-confirmation-page">
      <section className="order-confirmation-hero">
        <span className="order-confirmation-check"><CheckCircle2 size={24} /></span>
        <span className="home-section-label">ORDER CONFIRMED</span>
        <h1>Your Order Is Confirmed!</h1>
        <p>Thank you for choosing HealthyBite. We’re preparing your fresh meals with care.</p>
        <div className="order-confirmation-meta">
          <div><ClipboardList size={16} /><span><small>ORDER REFERENCE</small><b>{orderReference}</b></span></div>
          <div><CalendarDays size={16} /><span><small>PLACED ON</small><b>{placedAt.toLocaleDateString("en-IN", { dateStyle: "medium" })}</b></span></div>
          <div><Clock3 size={16} /><span><small>PAYMENT METHOD</small><b>{paymentLabel}</b></span></div>
        </div>
      </section>

      <div className="order-confirmation-layout">
        <section className="order-confirmation-items">
          <header><div><span className="home-section-label">FRESHLY PREPARED</span><h2>Artisanal Dishes Ordered</h2></div><span>{order.items.length} {order.items.length === 1 ? "item" : "items"}</span></header>
          <div className="order-confirmation-list">{order.items.map((item, index) => <article className="order-confirmation-item" key={`${order._id}-${index}`}>
            <img src={getImageUrl(item.image) || "/login-bg.jpg"} alt={item.name} />
            <div><b>{item.name}</b><small>Qty {item.quantity} · ₹{Number(item.unitPrice).toFixed(2)} each</small></div>
            <strong>₹{Number(item.lineTotal).toFixed(2)}</strong>
          </article>)}</div>
        </section>

        <aside className="order-confirmation-side">
          <section className="order-confirmation-delivery">
            <header><span><PackageCheck size={15} /> DELIVERY DETAILS</span><b>CONFIRMED</b></header>
            <h2>We’ll keep you updated</h2>
            <div><MapPin size={15} /><span><b>{order.address.fullName}</b><small>{order.address.phone}</small><small>{order.address.houseNo}, {order.address.street}{order.address.landmark ? `, ${order.address.landmark}` : ""}, {order.address.city}, {order.address.state} {order.address.pincode}</small></span></div>
          </section>

          <section className="order-confirmation-bill">
            <h2>Bill Details</h2>
            <span>Items subtotal <b>₹{Number(order.pricing.subtotal).toFixed(2)}</b></span>
            <span>Delivery fee <b>{order.pricing.shipping ? `₹${Number(order.pricing.shipping).toFixed(2)}` : "FREE"}</b></span>
            <span>Taxes <b>₹{Number(order.pricing.tax).toFixed(2)}</b></span>
            {order.pricing.discount > 0 && <span className="checkout-savings">Coupon discount <b>−₹{Number(order.pricing.discount).toFixed(2)}</b></span>}
            <strong>Grand Total <b>₹{Number(order.pricing.total).toFixed(2)}</b></strong>
            <Link to={`/orders/${order._id}`} className="order-confirmation-details">View order details</Link>
          </section>
          <Link className="order-confirmation-home" to="/" onClick={() => sessionStorage.removeItem("healthyBiteCheckoutKey")}>← Back to Home</Link>
        </aside>
      </div>
    </main><Footer /></div>;
  }

  return <div className="home-page"><Header /><main className="payment-result-page">
    <section className={`payment-result-card ${succeeded ? "success" : "failure"}`}>
      {loading ? <ClipboardList size={42} /> : succeeded ? <CheckCircle2 size={48} /> : <CircleX size={48} />}
      <span className="home-section-label">{loading ? "ORDER DETAILS" : succeeded ? "ORDER CONFIRMED" : "PAYMENT NOT COMPLETED"}</span>
      <h1>{loading ? "Checking your order…" : succeeded ? "Thank you for your order!" : "Your payment didn’t go through"}</h1>
      <p>{loading ? "Loading your order details…" : succeeded ? order?.walletAppliedAmount > 0 && order?.cashDueAmount > 0 ? `₹${order.walletAppliedAmount.toFixed(2)} was paid from your wallet. Pay ₹${order.cashDueAmount.toFixed(2)} to the delivery partner.` : order?.paymentMethod === "cod" ? "Your order is placed. Pay the delivery partner when your meals arrive." : order?.paymentMethod === "wallet" ? "Your order was paid for with your HealthyBite Wallet." : "Your payment has been verified and your order is confirmed." : "Your cart is safe. You can try the online payment again without creating another order."}</p>
      {error && <div className="checkout-error" role="alert">{error}</div>}
      {order && <div className="payment-result-total"><span>Order #{String(order._id).slice(-8).toUpperCase()}</span><b>₹{order.pricing.total.toFixed(2)}</b></div>}
      <div className="payment-result-actions">
        {!loading && !succeeded && order?.paymentMethod === "razorpay" && order?.paymentStatus === "failed" && <Link className="checkout-place-order" to={`/checkout?retry=${order._id}`}>Retry payment</Link>}
        {!loading && <><Link to="/orders"><ClipboardList size={16} /> View my orders</Link><Link to="/products" onClick={() => sessionStorage.removeItem("healthyBiteCheckoutKey")}>Continue exploring meals</Link></>}
      </div>
    </section>
  </main><Footer /></div>;
}
