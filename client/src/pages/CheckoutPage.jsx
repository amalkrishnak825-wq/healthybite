import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, MapPin, Tag } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ProductImage from "../components/ProductImage";
import api, { getErrorMessage } from "../api/axios";
import { syncCartCount } from "../utils/cart";
import "../styles/Checkout.css";

function checkoutKey() {
  let key = sessionStorage.getItem("healthyBiteCheckoutKey");
  if (!key) {
    key = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    sessionStorage.setItem("healthyBiteCheckoutKey", key);
  }
  return key;
}

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const retryOrderId = searchParams.get("retry");
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState("");
  const [quote, setQuote] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWalletWithCod, setUseWalletWithCod] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponInvalid, setCouponInvalid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(() =>
    new URLSearchParams(window.location.search).has("retry") ? "razorpay" : "cod",
  );
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([api.get("/addresses"), api.post("/cart/validate-checkout"), api.get("/wallet")])
      .then(([addressResponse, cartResponse, walletResponse]) => {
        if (!active) return;
        setWalletBalance(Number(walletResponse.data.wallet?.balance) || 0);
        const saved = addressResponse.data.addresses || [];
        setAddresses(saved);
        const selected = saved.find((item) => item.isDefault)?._id || saved[0]?._id || "";
        setAddressId(selected);
        if (!cartResponse.data.items?.length) navigate("/cart", { replace: true });
        else if (!selected) {
          api.post("/orders/quote", { couponCode: "" })
            .then((response) => { if (active) setQuote(response.data); })
            .catch((failure) => { if (active) setError(getErrorMessage(failure)); });
        }
      })
      .catch((failure) => { if (active) setError(getErrorMessage(failure)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [navigate]);

  useEffect(() => {
    if (!addressId) return;
    let active = true;
    api.post("/orders/quote", { addressId, couponCode })
      .then((response) => { if (active) setQuote(response.data); })
      .catch((failure) => { if (active) setError(getErrorMessage(failure)); });
    return () => { active = false; };
  }, [addressId, couponCode]);

  const selectedAddress = useMemo(() => addresses.find((item) => item._id === addressId), [addresses, addressId]);
  const walletAppliedToCod = paymentMethod === "cod" && useWalletWithCod
    ? Math.min(walletBalance, quote?.pricing.total || 0)
    : 0;
  const codAmountDue = Math.max(0, (quote?.pricing.total || 0) - walletAppliedToCod);

  async function applyCoupon(event) {
    event.preventDefault();
    const next = couponInput.trim().toUpperCase();
    setError("");
    try {
      const response = await api.post("/orders/quote", { addressId, couponCode: next });
      setCouponCode(next);
      setQuote(response.data);
    } catch (failure) {
      const message = getErrorMessage(failure);
      if (message === "You have reached the usage limit for this coupon.") {
        setCouponInvalid(true);
        setCouponError(message);
      } else {
        setError(message);
      }
    }
  }

  async function markPaymentFailed(orderId) {
    try { await api.post(`/orders/${orderId}/payment-failed`); } catch { /* Retry remains available from the order page. */ }
    navigate(`/payment/failure/${orderId}`);
  }

  async function placeOrder() {
    if (!addressId || !quote || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = retryOrderId
        ? await api.post(`/orders/${retryOrderId}/retry-payment`)
        : await api.post("/orders", { addressId, couponCode, paymentMethod, useWallet: paymentMethod === "cod" && useWalletWithCod, checkoutKey: checkoutKey() });
      const { order } = response.data;
      if (paymentMethod === "wallet") {
        syncCartCount(0);
        sessionStorage.removeItem("healthyBiteCheckoutKey");
        navigate(`/payment/success/${order._id}?method=wallet`);
        return;
      }
      if (paymentMethod === "cod") {
        syncCartCount(0);
        sessionStorage.removeItem("healthyBiteCheckoutKey");
        navigate(`/payment/success/${order._id}?method=cod`);
        return;
      }

      const loaded = await loadRazorpay();
      if (!loaded || !response.data.razorpayKeyId) {
        await markPaymentFailed(order._id);
        return;
      }
      const checkout = new window.Razorpay({
        key: response.data.razorpayKeyId,
        amount: Math.round(order.pricing.total * 100),
        currency: "INR",
        name: "HealthyBite",
        description: `Order ${String(order._id).slice(-8)}`,
        order_id: order.razorpayOrderId,
        prefill: { name: selectedAddress?.fullName, contact: selectedAddress?.phone },
        theme: { color: "#244735" },
        handler: async (payment) => {
          try {
            await api.post("/orders/verify-payment", { orderId: order._id, ...payment });
            syncCartCount(0);
            sessionStorage.removeItem("healthyBiteCheckoutKey");
            navigate(`/payment/success/${order._id}`);
          } catch {
            await markPaymentFailed(order._id);
          }
        },
        modal: { ondismiss: () => { void markPaymentFailed(order._id); } },
      });
      checkout.on("payment.failed", () => { void markPaymentFailed(order._id); });
      checkout.open();
    } catch (failure) {
      setError(getErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="home-page">
      <Header />
      <main className="checkout-page">
        <Link className="checkout-back" to="/cart"><ArrowLeft size={16} /> Back to cart</Link>
        <div className="checkout-heading"><span className="home-section-label">ALMOST THERE</span><h1>Checkout</h1><p>Choose where we should deliver your fresh meals.</p></div>
        {error && <div className="checkout-error" role="alert">{error}</div>}
        {loading ? <div className="checkout-loading">Loading your checkout…</div> : (
          <div className="checkout-layout">
            <div className="checkout-main-column">
              <section className="checkout-panel">
                <div className="checkout-panel-heading"><div><MapPin size={18} /><h2>Delivery address</h2></div><Link to="/account/addresses/new" state={{ returnTo: "/checkout" }}>+ Add address</Link></div>
                {addresses.length ? <div className="checkout-address-list">
                  {addresses.map((address) => <label className={`checkout-address-option ${addressId === address._id ? "selected" : ""}`} key={address._id}>
                    <input type="radio" name="address" value={address._id} checked={addressId === address._id} onChange={() => { setAddressId(address._id); setError(""); }} />
                    <span><b>{address.type} {address.isDefault && <small>DEFAULT</small>}</b><span>{address.fullName} · {address.phone}</span><span>{address.houseNo}, {address.street}{address.landmark ? `, ${address.landmark}` : ""}, {address.city}, {address.state} {address.pincode}</span></span>
                    <Link to={`/account/addresses/${address._id}/edit`} state={{ returnTo: "/checkout" }}>Edit</Link>
                  </label>)}
                </div> : <div className="checkout-no-address">Add a delivery address to continue.<Link to="/account/addresses/new" state={{ returnTo: "/checkout" }}>Add address</Link></div>}
              </section>
              <section className="checkout-panel">
                <div className="checkout-panel-heading"><div><Tag size={18} /><h2>Have a Coupon Code?</h2></div></div>
                <form className="checkout-coupon-form" onSubmit={applyCoupon}><div className="checkout-coupon-input-wrap"><input aria-label="Coupon code" aria-invalid={couponInvalid} className={couponInvalid ? "invalid" : ""} placeholder="Enter coupon code" value={couponInput} onChange={(event) => { setCouponInput(event.target.value); setCouponInvalid(false); setCouponError(""); }} />{couponError && <span className="checkout-coupon-error" role="alert">{couponError}</span>}</div><button type="submit" disabled={!quote || !couponInput.trim()}>{couponCode && couponInput.trim().toUpperCase() !== couponCode ? "Update" : "Apply"}</button>{couponCode && <button type="button" className="checkout-remove-coupon" onClick={() => { setCouponInput(""); setCouponCode(""); setCouponInvalid(false); setCouponError(""); }}>Remove</button>}</form>
              </section>
              <section className="checkout-panel">
                <div className="checkout-panel-heading"><div><h2>Payment method</h2></div></div>
                <div className="checkout-payment-options">
                  {!retryOrderId && <label className={paymentMethod === "cod" ? "selected" : ""}><input type="radio" name="payment" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} /><span><b>Cash on Delivery</b><small>Pay when your order arrives</small></span></label>}
                  {!retryOrderId && paymentMethod === "cod" && walletBalance > 0 && <label className={`checkout-wallet-split${useWalletWithCod ? " selected" : ""}`}><input type="checkbox" checked={useWalletWithCod} onChange={(event) => setUseWalletWithCod(event.target.checked)} /><span><b>Use wallet balance</b><small>Available: ₹{walletBalance.toFixed(2)}{useWalletWithCod ? ` · Apply ₹${walletAppliedToCod.toFixed(2)} and pay ₹${codAmountDue.toFixed(2)} at delivery` : " · Use it together with Cash on Delivery"}</small></span></label>}
                  {!retryOrderId && <label className={paymentMethod === "wallet" ? "selected" : ""}><input type="radio" name="payment" checked={paymentMethod === "wallet"} onChange={() => setPaymentMethod("wallet")} /><span><b>HealthyBite Wallet</b><small>Balance ₹{walletBalance.toFixed(2)} · {walletBalance >= (quote?.pricing.total || 0) ? "Pay using your wallet" : `Need ₹${Math.max(0, (quote?.pricing.total || 0) - walletBalance).toFixed(2)} more`}</small></span></label>}
                  <label className={paymentMethod === "razorpay" ? "selected" : ""}><input type="radio" name="payment" checked={paymentMethod === "razorpay"} onChange={() => setPaymentMethod("razorpay")} /><span><b>Pay online with Razorpay</b><small>UPI, cards, net banking and more</small></span></label>
                </div>
              </section>
            </div>
            <aside className="checkout-panel checkout-summary">
              <h2>Order summary</h2>
              {quote?.items.map((item) => <div className="checkout-summary-item" key={item.productId}><ProductImage src={item.image} alt="" /><span><b>{item.name}</b><small>Qty {item.quantity} × ₹{item.unitPrice.toFixed(2)}</small></span><strong>₹{item.lineTotal.toFixed(2)}</strong></div>)}
              <div className="checkout-totals">
                <span>Items subtotal <b>₹{(quote?.pricing.subtotal || 0).toFixed(2)}</b></span>
                <span>Shipping <b>{quote?.pricing.shipping ? `₹${quote.pricing.shipping.toFixed(2)}` : "Free"}</b></span>
                <span>Tax (5%) <b>₹{(quote?.pricing.tax || 0).toFixed(2)}</b></span>
                {quote?.pricing.discount > 0 && <span className="checkout-savings">Coupon {quote.pricing.couponCode} <b>−₹{quote.pricing.discount.toFixed(2)}</b></span>}
                {walletAppliedToCod > 0 && <span className="checkout-savings">Wallet balance applied <b>−₹{walletAppliedToCod.toFixed(2)}</b></span>}
                <strong>Total payable <b>₹{(quote?.pricing.total || 0).toFixed(2)}</b></strong>
                {paymentMethod === "cod" && walletAppliedToCod > 0 && <span className="checkout-cod-due">Pay at delivery <b>₹{codAmountDue.toFixed(2)}</b></span>}
              </div>
              <button className="checkout-place-order" disabled={!addressId || !quote || busy || !selectedAddress || (paymentMethod === "wallet" && walletBalance < (quote?.pricing.total || 0))} onClick={placeOrder}>{busy ? "Please wait…" : paymentMethod === "cod" && walletAppliedToCod > 0 ? codAmountDue > 0 ? `Place order · Pay ₹${codAmountDue.toFixed(2)} at delivery` : "Place order · Paid with wallet" : paymentMethod === "cod" ? "Place order · Cash on Delivery" : paymentMethod === "wallet" ? "Pay with wallet" : "Continue to secure payment"}</button>
              <small className="checkout-secure-note">Your order total is confirmed by HealthyBite before payment.</small>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
