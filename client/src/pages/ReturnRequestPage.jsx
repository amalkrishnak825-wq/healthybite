import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import LoadingIndicator from "../components/LoadingIndicator";
import ProductImage from "../components/ProductImage";
import QuantityStepper from "../components/QuantityStepper";
import api, { getErrorMessage } from "../api/axios";
import "../styles/Checkout.css";
import "../styles/ReturnRequest.css";

export default function ReturnRequestPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [selectedItems, setSelectedItems] = useState({});
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    api.get(`/orders/${orderId}`).then((response) => {
      if (active) setOrder(response.data.order);
    }).catch((failure) => {
      if (active) setError(getErrorMessage(failure));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [orderId]);

  const canRequest = order?.status === "delivered" && ["paid", "not_required"].includes(order.paymentStatus);
  const selectedCount = useMemo(() => Object.keys(selectedItems).length, [selectedItems]);

  function toggleItem(index, checked) {
    setSelectedItems((current) => {
      const next = { ...current };
      if (checked) next[index] = 1;
      else delete next[index];
      return next;
    });
    setError("");
  }

  async function submitRequest(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!selectedCount) {
      setError("Select at least one product to return.");
      return;
    }
    if (reason.trim().length < 5) {
      setError("Please explain the reason for your return.");
      return;
    }

    setSubmitting(true);
    try {
      const items = Object.entries(selectedItems).map(([orderItemIndex, quantity]) => ({
        orderItemIndex: Number(orderItemIndex),
        quantity: Number(quantity),
      }));
      const response = await api.post(`/orders/${orderId}/return`, { items, reason: reason.trim() });
      setOrder(response.data.order);
      setSuccess("Your return request was sent. The HealthyBite team will review it.");
    } catch (failure) {
      setError(getErrorMessage(failure));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="home-page">
      <Header />
      <main className="return-request-page">
        <Link className="checkout-back" to={`/orders/${orderId}`}><ArrowLeft size={16} /> Back to order details</Link>
        <div className="return-request-heading">
          <span className="home-section-label">ORDER SUPPORT</span>
          <h1>Request a return</h1>
          <p>Select the meal and quantity you want to return, then tell us why.</p>
        </div>

        {loading ? <LoadingIndicator className="checkout-loading" message="Loading order details…" /> : error && !order ? <div className="checkout-error" role="alert">{error}</div> : order && (
          <>
            <section className="return-request-order-ref">
              <span>Order <b>#{String(order._id).slice(-8).toUpperCase()}</b></span>
              <span>Placed {new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
            </section>

            {success || order.status === "return_requested" || order.status === "return_accepted" ? (
              <section className="return-request-result" role="status">
                <RotateCcw size={22} />
                <h2>{order.status === "return_accepted" ? "Return request accepted" : "Return request submitted"}</h2>
                <p>{success || (order.status === "return_accepted" ? "Your return request has been accepted. The HealthyBite team will contact you about next steps." : "Your return request is awaiting review by the HealthyBite team.")}</p>
                {order.returnRequest?.items?.length > 0 && <ul>{order.returnRequest.items.map((item) => <li key={`${item.orderItemIndex}-${item.product}`}>{item.name} · Qty {item.quantity}</li>)}</ul>}
                {order.status === "return_accepted" && Number(order.returnRequest?.refundAmount) > 0 && <p className="return-wallet-credit">₹{Number(order.returnRequest.refundAmount).toFixed(2)} has been added to your HealthyBite Wallet.</p>}
                {order.returnRequest?.reason && <p><b>Reason:</b> {order.returnRequest.reason}</p>}
                <Link to={`/orders/${orderId}`}>Back to order details</Link>
              </section>
            ) : canRequest ? (
              <form className="return-request-form" onSubmit={submitRequest}>
                <section className="checkout-panel">
                  <div className="checkout-panel-heading"><div><RotateCcw size={18} /><h2>Choose products and quantities</h2></div></div>
                  <div className="return-request-items">
                    {order.items.map((item, index) => {
                      const checked = Object.hasOwn(selectedItems, index);
                      return (
                        <article className={`return-request-item${checked ? " selected" : ""}`} key={`${order._id}-${index}`}>
                          <label className="return-request-item-choice">
                            <input type="checkbox" checked={checked} onChange={(event) => toggleItem(index, event.target.checked)} />
                            <ProductImage src={item.image} alt="" />
                            <span><b>{item.name}</b><small>Ordered quantity: {item.quantity} · ₹{Number(item.unitPrice).toFixed(2)} each</small></span>
                          </label>
                          <div className="return-request-quantity">
                            <span>Return quantity</span>
                            <QuantityStepper
                              value={selectedItems[index] ?? 1}
                              disabled={!checked}
                              decreaseDisabled={(selectedItems[index] ?? 1) <= 1}
                              increaseDisabled={(selectedItems[index] ?? 1) >= item.quantity}
                              decreaseLabel={`Decrease ${item.name} return quantity`}
                              increaseLabel={`Increase ${item.name} return quantity`}
                              onDecrease={() => setSelectedItems((current) => ({ ...current, [index]: Math.max(1, Number(current[index] ?? 1) - 1) }))}
                              onIncrease={() => setSelectedItems((current) => ({ ...current, [index]: Math.min(item.quantity, Number(current[index] ?? 1) + 1) }))}
                            />
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>

                <section className="checkout-panel return-request-reason">
                  <label htmlFor="return-reason">Why are you returning these products?</label>
                  <textarea id="return-reason" value={reason} onChange={(event) => { setReason(event.target.value); setError(""); }} minLength="5" maxLength="500" rows="4" placeholder="For example: the meal arrived damaged or I received the wrong item." required />
                  <small>{reason.length}/500 characters</small>
                </section>

                {error && <div className="checkout-error" role="alert">{error}</div>}
                <button className="return-request-submit" type="submit" disabled={submitting || !selectedCount || reason.trim().length < 5}>
                  {submitting ? "Submitting request…" : "Submit return request"}
                </button>
              </form>
            ) : (
              <section className="return-request-result"><h2>Return unavailable</h2><p>This order cannot accept a return request in its current status.</p><Link to={`/orders/${orderId}`}>Back to order details</Link></section>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
