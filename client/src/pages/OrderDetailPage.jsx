import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, PackageCheck, RotateCcw } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ProductImage from "../components/ProductImage";
import ActionConfirmation from "../components/ActionConfirmation";
import OrderStatusBadge from "../components/OrderStatusBadge";
import api, { getErrorMessage } from "../api/axios";
import "../styles/Checkout.css";

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmCancelOrder, setConfirmCancelOrder] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [confirmCancelReturn, setConfirmCancelReturn] = useState(false);
  const [cancellingReturn, setCancellingReturn] = useState(false);
  const [returnMessage, setReturnMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function loadOrder() {
      try {
        const response = await api.get(`/orders/${orderId}`);
        if (!active) return;
        const nextOrder = response.data.order;
        setOrder(nextOrder);
      } catch (failure) {
        if (active) setError(getErrorMessage(failure));
      } finally {
        if (active) setLoading(false);
      }
    }
    loadOrder();
    return () => {
      active = false;
    };
  }, [orderId]);

  async function cancelOrder() {
    setCancellingOrder(true);
    setError("");
    try {
      const response = await api.post(`/orders/${orderId}/cancel`);
      setOrder(response.data.order);
      setReturnMessage(response.data.walletRefundAmount > 0
        ? `Your order was cancelled. ₹${Number(response.data.walletRefundAmount).toFixed(2)} was refunded to your HealthyBite Wallet.`
        : "Your order was cancelled and the meal stock was restored.");
      setConfirmCancelOrder(false);
    } catch (failure) {
      setError(getErrorMessage(failure));
    } finally {
      setCancellingOrder(false);
    }
  }

  async function cancelReturnRequest() {
    setCancellingReturn(true);
    setError("");
    try {
      const response = await api.post(`/orders/${orderId}/return/cancel`);
      setOrder(response.data.order);
      setReturnMessage("Your return request was cancelled.");
      setConfirmCancelReturn(false);
    } catch (failure) {
      setError(getErrorMessage(failure));
    } finally {
      setCancellingReturn(false);
    }
  }

  return (
    <div className="home-page">
      <Header />
      <main className="order-detail-page">
        <Link className="checkout-back" to="/orders"><ArrowLeft size={16} /> Back to my orders</Link>
        {loading ? <div className="checkout-loading">Loading order details…</div> : error && !order ? <div className="checkout-error" role="alert">{error}</div> : order && <>
          {error && <div className="checkout-error" role="alert">{error}</div>}
          <div className="order-detail-heading"><div><span className="home-section-label">ORDER DETAILS</span><h1>Order #{String(order._id).slice(-8).toUpperCase()}</h1><p>Placed {new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p></div><OrderStatusBadge order={order} /></div>
          {returnMessage && <div className="order-return-success" role="status">{returnMessage}</div>}
          <div className="order-detail-layout">
            <section className="checkout-panel">
              <div className="checkout-panel-heading"><div><PackageCheck size={18} /><h2>Items ordered</h2></div></div>
              <div className="order-detail-items">{order.items.map((item, index) => <article className="order-detail-item" key={`${order._id}-${index}`}><ProductImage src={item.image} alt={item.name} /><div><b>{item.name}</b><small>₹{item.unitPrice.toFixed(2)} × {item.quantity}</small></div><strong>₹{item.lineTotal.toFixed(2)}</strong></article>)}</div>
            </section>
            <div className="order-detail-side">
              <section className="checkout-panel"><div className="checkout-panel-heading"><div><MapPin size={18} /><h2>Delivery address</h2></div></div><div className="order-detail-address"><b>{order.address.fullName}</b><span>{order.address.phone}</span><span>{order.address.houseNo}, {order.address.street}{order.address.landmark ? `, ${order.address.landmark}` : ""}</span><span>{order.address.city}, {order.address.state} {order.address.pincode}</span></div></section>
              <section className="checkout-panel order-detail-payment"><h2>Payment summary</h2><span>Items subtotal <b>₹{order.pricing.subtotal.toFixed(2)}</b></span><span>Shipping <b>{order.pricing.shipping ? `₹${order.pricing.shipping.toFixed(2)}` : "Free"}</b></span><span>Tax <b>₹{order.pricing.tax.toFixed(2)}</b></span>{order.pricing.discount > 0 && <span className="checkout-savings">Coupon {order.pricing.couponCode} <b>−₹{order.pricing.discount.toFixed(2)}</b></span>}<strong>Total payable <b>₹{order.pricing.total.toFixed(2)}</b></strong>{order.walletAppliedAmount > 0 && <span className="checkout-savings">Wallet paid <b>−₹{order.walletAppliedAmount.toFixed(2)}</b></span>}{order.cashDueAmount > 0 && order.walletAppliedAmount > 0 && <span>Cash due at delivery <b>₹{order.cashDueAmount.toFixed(2)}</b></span>}<small>{order.walletAppliedAmount > 0 && order.cashDueAmount > 0 ? "HealthyBite Wallet + Cash on Delivery" : order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMethod === "wallet" ? "Paid with HealthyBite Wallet" : "Paid online with Razorpay"}</small>{order.deliveredAt && <small>Delivered: {new Date(order.deliveredAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</small>}</section>
              {order.paymentStatus === "failed" && <Link className="checkout-place-order order-detail-retry" to={`/checkout?retry=${order._id}`}>Retry payment</Link>}
              {order.status === "placed" && ["paid", "not_required"].includes(order.paymentStatus) && <button className="order-cancel-button" type="button" onClick={() => setConfirmCancelOrder(true)}>Cancel order</button>}
              {order.status === "return_requested" && <p className="order-return-note" role="status">Your return request is awaiting review.</p>}
              {order.status === "return_accepted" && <p className="order-return-note" role="status">{order.returnRequest?.refundAmount != null ? `Your return request was accepted. ₹${Number(order.returnRequest.refundAmount).toFixed(2)} was added to your HealthyBite Wallet.` : "Your return request has been accepted. The HealthyBite team will contact you about next steps."}</p>}
              {order.status === "return_requested" && <button className="order-return-cancel" type="button" onClick={() => setConfirmCancelReturn(true)}>Cancel return request</button>}
              {order.status === "delivered" && <Link className="order-return-button" to={`/orders/${orderId}/return`}><RotateCcw size={15} /> Request return</Link>}
            </div>
          </div>
        </>}
      </main>
      <ActionConfirmation
        open={confirmCancelOrder}
        title="Cancel this order?"
        message="You can cancel while the order status is Order Placed. Cancellation is unavailable after it moves Out for Delivery. Any amount already paid online or from your wallet will be refunded to your HealthyBite Wallet."
        confirmLabel="Cancel order"
        busy={cancellingOrder}
        onCancel={() => setConfirmCancelOrder(false)}
        onConfirm={cancelOrder}
      />
      <ActionConfirmation
        open={confirmCancelReturn}
        title="Cancel return request?"
        message="Your order will return to its delivered status, and you can submit another return request later."
        confirmLabel="Cancel return request"
        busy={cancellingReturn}
        onCancel={() => setConfirmCancelReturn(false)}
        onConfirm={cancelReturnRequest}
      />
      <Footer />
    </div>
  );
}
