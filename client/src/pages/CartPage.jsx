import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import api, { getErrorMessage } from "../api/axios";
import { syncCartCount } from "../utils/cart";
import "../styles/Catalog.css";

export default function CartPage() {
  const [cart, setCart] = useState({ items: [], total: 0, valid: false });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const loadCart = useCallback(async () => {
    const response = await api.get("/cart"); setCart(response.data); syncCartCount(response.data.items.reduce((total, item) => total + item.quantity, 0));
  }, []);
  useEffect(() => { loadCart().catch(failure => setError(getErrorMessage(failure))); }, [loadCart]);
  async function quantity(productId, next) { setError(""); try { if (next < 1) await api.delete(`/cart/items/${productId}`); else await api.patch(`/cart/items/${productId}`, { quantity: next }); await loadCart(); } catch (failure) { setError(getErrorMessage(failure)); } }
  async function remove(productId) { setError(""); try { await api.delete(`/cart/items/${productId}`); await loadCart(); } catch (failure) { setError(getErrorMessage(failure)); } }
  async function checkout() { setBusy(true); setError(""); try { const response = await api.post("/cart/validate-checkout"); setError(`Cart verified. Current total: ₹${response.data.total.toFixed(2)}. Checkout is not available yet.`); } catch (failure) { setError(getErrorMessage(failure)); } finally { setBusy(false); } }
  return <div className="home-page"><Header/><main className="cart-page"><div className="catalog-heading"><div><span className="home-section-label">YOUR ITEMS</span><h1>Shopping cart</h1></div><Link to="/products">Continue shopping</Link></div>{error && <div className="catalog-error">{error}</div>}{cart.items.length ? <><div>{cart.items.map(item => { const product = item.product; return <article className="cart-row" key={product._id}><img src={product.images?.[0]?.url ? `http://localhost:5000${product.images[0].url}` : "/login-bg.jpg"} alt={product.name}/><div><Link to={`/products/${product.slug}`}><b>{product.name}</b></Link><small className={item.valid ? "stock-available" : "stock-empty"}>{item.valid ? `${product.stock} in stock` : "Unavailable or quantity exceeds stock"}</small></div><div className="cart-quantity"><button disabled={item.quantity <= 1} onClick={() => quantity(product._id, item.quantity - 1)} aria-label="Decrease quantity">−</button><span>{item.quantity}</span><button disabled={!item.valid || item.quantity >= Math.min(product.stock, 99)} onClick={() => quantity(product._id, item.quantity + 1)} aria-label="Increase quantity">+</button></div><b className="cart-line-total">₹{item.lineTotal.toFixed(2)}</b><button className="cart-remove" onClick={() => remove(product._id)} aria-label="Remove item"><Trash2 size={16}/></button></article>; })}</div><div className="cart-summary"><span>Total <b>₹{cart.total.toFixed(2)}</b></span><button disabled={!cart.valid || busy} onClick={checkout}>{busy ? "Checking…" : "Continue to checkout"}</button></div></> : <div className="catalog-empty">Your cart is empty. <Link to="/products">Browse products</Link></div>}</main><Footer/></div>;
}
