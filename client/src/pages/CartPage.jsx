import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import LoadingIndicator from "../components/LoadingIndicator";
import ProductImage from "../components/ProductImage";
import QuantityStepper from "../components/QuantityStepper";
import api, { getErrorMessage } from "../api/axios";
import { syncCartCount } from "../utils/cart";
import { MAX_CART_ITEM_QUANTITY } from "../constants/cart";
import {
  canOrderProduct,
  getMaximumOrderQuantity,
  isUnavailableProduct,
} from "../utils/productAvailability";
import "../styles/Catalog.css";

export default function CartPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], total: 0, valid: false });
  const [error, setError] = useState("");
  const [isCartLoading, setIsCartLoading] = useState(true);
  const [updatingProductId, setUpdatingProductId] = useState("");
  const updateInProgress = useRef(false);
  const loadCart = useCallback(async () => {
    const response = await api.get("/cart");
    setCart(response.data);
    syncCartCount(
      response.data.items.reduce((total, item) => total + item.quantity, 0),
    );
  }, []);
  useEffect(() => {
    loadCart()
      .catch((failure) => setError(getErrorMessage(failure)))
      .finally(() => setIsCartLoading(false));
  }, [loadCart]);
  async function quantity(productId, next) {
    if (updateInProgress.current) return;
    const currentItem = cart.items.find(
      (item) => item.product._id === productId,
    );
    if (!currentItem) return;
    if (next > getMaximumOrderQuantity(currentItem.product)) return;

    updateInProgress.current = true;
    setUpdatingProductId(productId);
    setError("");
    const nextItems = cart.items.flatMap((item) => {
      if (item.product._id !== productId) return [item];
      if (next < 1) return [];
      return [
        {
          ...item,
          quantity: next,
          lineTotal: Number(item.product.price) * next,
          valid: canOrderProduct(item.product, next),
        },
      ];
    });
    const optimisticCart = {
      ...cart,
      items: nextItems,
      total: nextItems.reduce((total, item) => total + item.lineTotal, 0),
      valid: nextItems.length > 0 && nextItems.every((item) => item.valid),
    };
    setCart(optimisticCart);
    syncCartCount(
      nextItems.reduce((total, item) => total + item.quantity, 0),
    );
    try {
      if (next < 1) await api.delete(`/cart/items/${productId}`);
      else await api.patch(`/cart/items/${productId}`, { quantity: next });
    } catch (failure) {
      setError(getErrorMessage(failure));
      try {
        await loadCart();
      } catch {
        setCart(cart);
        syncCartCount(
          cart.items.reduce((total, item) => total + item.quantity, 0),
        );
      }
    } finally {
      updateInProgress.current = false;
      setUpdatingProductId("");
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
        {isCartLoading ? (
          <LoadingIndicator
            className="checkout-loading"
            message="Loading your cart…"
          />
        ) : cart.items.length ? (
          <>
            <div>
              {cart.items.map((item) => {
                const product = item.product;
                const unavailable = isUnavailableProduct(product);
                const status = unavailable
                  ? "Unavailable"
                  : item.quantity > MAX_CART_ITEM_QUANTITY
                    ? `Maximum ${MAX_CART_ITEM_QUANTITY} per product — reduce the quantity`
                    : product.stock < 1
                      ? "Out of stock"
                      : item.quantity > product.stock
                        ? `Only ${product.stock} in stock — reduce the quantity`
                        : `${product.stock} in stock`;
                return (
                  <article className="cart-row" key={product._id}>
                    <ProductImage
                      src={product.images?.[0]?.url}
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
                      increaseDisabled={
                        !item.valid || item.quantity >= getMaximumOrderQuantity(product)
                      }
                      loading={updatingProductId === product._id}
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
