import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import QuantityStepper from "../components/QuantityStepper";
import api, { getErrorMessage } from "../api/axios";
import { syncCartCount } from "../utils/cart";
import { getImageUrl } from "../utils/imageUrl";
import "../styles/Catalog.css";

export default function CartPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], total: 0, valid: false });
  const [error, setError] = useState("");
  const loadCart = useCallback(async () => {
    const response = await api.get("/cart");
    setCart(response.data);
    syncCartCount(
      response.data.items.reduce((total, item) => total + item.quantity, 0),
    );
  }, []);
  useEffect(() => {
    loadCart().catch((failure) => setError(getErrorMessage(failure)));
  }, [loadCart]);
  async function quantity(productId, next) {
    setError("");
    try {
      if (next < 1) await api.delete(`/cart/items/${productId}`);
      else await api.patch(`/cart/items/${productId}`, { quantity: next });
      await loadCart();
    } catch (failure) {
      setError(getErrorMessage(failure));
    }
  }
  async function remove(productId) {
    setError("");
    try {
      await api.delete(`/cart/items/${productId}`);
      await loadCart();
    } catch (failure) {
      setError(getErrorMessage(failure));
    }
  }
  return (
    <div className="home-page">
      <Header />
      <main className="cart-page">
        <div className="catalog-heading">
          <div>
            <span className="home-section-label">YOUR ITEMS</span>
            <h1>Shopping cart</h1>
          </div>
          <Link to="/products">Continue shopping</Link>
        </div>
        {error && <div className="catalog-error">{error}</div>}
        {cart.items.length ? (
          <>
            <div>
              {cart.items.map((item) => {
                const product = item.product;
                const unavailable =
                  product.isDeleted ||
                  product.isBlocked ||
                  !product.isPublished ||
                  product.category?.isDeleted;
                const status = unavailable
                  ? "Unavailable"
                  : product.stock < 1
                    ? "Out of stock"
                    : item.quantity > product.stock
                      ? `Only ${product.stock} in stock — reduce the quantity`
                      : `${product.stock} in stock`;
                return (
                  <article className="cart-row" key={product._id}>
                    <img
                      src={
                        product.images?.[0]?.url
                          ? product.images[0].url.startsWith("/")
                            ? getImageUrl(product.images[0].url)
                            : product.images[0].url
                          : "/login-bg.jpg"
                      }
                      alt={product.name}
                    />
                    <div>
                      <Link to={`/products/${product.slug}`}>
                        <b>{product.name}</b>
                      </Link>
                      <small
                        className={
                          item.valid ? "stock-available" : "stock-empty"
                        }
                      >
                        {status}
                      </small>
                    </div>
                    <QuantityStepper
                      value={item.quantity}
                      onDecrease={() => quantity(product._id, item.quantity - 1)}
                      onIncrease={() => quantity(product._id, item.quantity + 1)}
                      decreaseDisabled={item.quantity <= 1}
                      increaseDisabled={!item.valid || item.quantity >= Math.min(product.stock, 99)}
                    />
                    <b className="cart-line-total">
                      ₹{item.lineTotal.toFixed(2)}
                    </b>
                    <button
                      className="cart-remove"
                      onClick={() => remove(product._id)}
                      aria-label="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </article>
                );
              })}
            </div>
            <div className="cart-summary">
              <span>
                Total <b>₹{cart.total.toFixed(2)}</b>
              </span>
              <button disabled={!cart.valid} onClick={() => navigate("/checkout")}>
                Continue to checkout
              </button>
            </div>
          </>
        ) : (
          <div className="catalog-empty">
            Your cart is empty. <Link to="/products">Browse products</Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
