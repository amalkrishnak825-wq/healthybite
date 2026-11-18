import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import QuantityStepper from "../components/QuantityStepper";
import ActionConfirmation from "../components/ActionConfirmation";
import api, { getErrorMessage } from "../api/axios";
import { addProductToCart } from "../utils/cart";
import { getImageUrl } from "../utils/imageUrl";
import "../styles/Catalog.css";

function isUnavailableProduct(product) {
  return (
    product.isDeleted ||
    product.isBlocked ||
    !product.isPublished ||
    product.category?.isDeleted ||
    product.category?.isActive === false
  );
}

function canOrderProduct(product) {
  return !isUnavailableProduct(product) && product.stock > 0;
}

export default function WishlistPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [error, setError] = useState("");
  const [pendingProduct, setPendingProduct] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const response = await api.get("/wishlist");
    setProducts(response.data.products);
  }, []);
  useEffect(() => {
    load().catch((failure) => {
      if (failure.response?.status === 401) navigate("/login");
      else setError(getErrorMessage(failure));
    });
  }, [load, navigate]);
  async function remove(id) {
    try {
      await api.delete(`/wishlist/${id}`);
      setProducts((current) => current.filter((product) => product._id !== id));
    } catch (failure) {
      setError(getErrorMessage(failure));
    }
  }
  function changeQuantity(product, delta) {
    const availableStock = Math.min(Number(product.stock) || 0, 99);
    setQuantities((current) => {
      const currentQuantity = current[product._id] || 1;
      const nextQuantity = Math.max(
        1,
        Math.min(availableStock, currentQuantity + delta),
      );
      return { ...current, [product._id]: nextQuantity };
    });
  }
  async function add() {
    if (!pendingProduct) return;
    setBusy(true);
    try {
      await addProductToCart(
        api,
        pendingProduct._id,
        quantities[pendingProduct._id] || 1,
      );
      setProducts((current) =>
        current.filter((item) => item._id !== pendingProduct._id),
      );
      setPendingProduct(null);
    } catch (failure) {
      setPendingProduct(null);
      setError(getErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  async function addAllToCart() {
    const availableProducts = products.filter(canOrderProduct);
    if (!availableProducts.length) return;

    setBusy(true);
    setError("");
    const addedIds = [];
    const failedNames = [];

    for (const product of availableProducts) {
      try {
        await addProductToCart(api, product._id, quantities[product._id] || 1);
        await api.delete(`/wishlist/${product._id}`);
        addedIds.push(product._id);
      } catch {
        failedNames.push(product.name);
      }
    }

    if (addedIds.length) {
      setProducts((current) =>
        current.filter((product) => !addedIds.includes(product._id)),
      );
    }
    if (failedNames.length) {
      setError(
        `${addedIds.length} item(s) added. Could not add: ${failedNames.join(", ")}.`,
      );
    }
    setBusy(false);
  }

  const availableProducts = products.filter(canOrderProduct);
  const availableTotal = availableProducts.reduce(
    (total, product) =>
      total + Number(product.price) * (quantities[product._id] || 1),
    0,
  );
  return (
    <div className="home-page wishlist-route">
      <Header />
      <main className="wishlist-page">
        <div className="catalog-heading">
          <div>
            <span className="home-section-label">SAVED FOR LATER</span>
            <h1>Wishlist</h1>
          </div>
          <Link to="/products">Explore products</Link>
        </div>
        {error && <div className="catalog-error">{error}</div>}
        {products.map((product) => {
          const quantity = quantities[product._id] || 1;
          const canOrder = canOrderProduct(product);
          const status = isUnavailableProduct(product)
            ? "Unavailable"
            : product.stock > 0
              ? `${product.stock} in stock`
              : "Out of stock";
          return (
            <article className="cart-row wishlist-row" key={product._id}>
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
              <div className="wishlist-item-details">
                <Link to={`/products/${product.slug}`}>
                  <b>{product.name}</b>
                </Link>
                <small className={canOrder ? "stock-available" : "stock-empty"}>
                  {status}
                </small>
              </div>
              <QuantityStepper
                className="wishlist-quantity-control"
                value={quantity}
                onDecrease={() => changeQuantity(product, -1)}
                onIncrease={() => changeQuantity(product, 1)}
                decreaseDisabled={quantity <= 1}
                increaseDisabled={!canOrder || quantity >= Math.min(product.stock, 99)}
                decreaseLabel={`Decrease ${product.name} quantity`}
                increaseLabel={`Increase ${product.name} quantity`}
              />
              <b className="cart-line-total">
                ₹{(Number(product.price) * quantity).toFixed(2)}
              </b>
              <button
                className="wishlist-add-to-cart"
                disabled={!canOrder}
                onClick={() => setPendingProduct(product)}
              >
                {canOrder ? "Add to cart" : status}
              </button>
              <button
                className="cart-remove"
                onClick={() => remove(product._id)}
                aria-label={`Remove ${product.name} from wishlist`}
              >
                <Trash2 size={16} />
              </button>
            </article>
          );
        })}
        {products.length > 0 && (
          <div className="wishlist-bulk-cart">
            <span>
              {availableProducts.length
                ? `${availableProducts.length} available item(s) · ₹${availableTotal.toFixed(2)}`
                : "No available items to add"}
            </span>
            <button
              type="button"
              disabled={!availableProducts.length || busy}
              onClick={addAllToCart}
            >
              {busy ? "Adding items…" : "Add all to cart"}
            </button>
          </div>
        )}
        {!products.length && !error && (
          <div className="catalog-empty">Your wishlist is empty.</div>
        )}
      </main>
      <ActionConfirmation
        open={Boolean(pendingProduct)}
        title="Add to cart?"
        message={
          pendingProduct
            ? `Add ${quantities[pendingProduct._id] || 1} × ${pendingProduct.name} to your cart?`
            : ""
        }
        confirmLabel="Add to cart"
        busy={busy}
        onCancel={() => setPendingProduct(null)}
        onConfirm={add}
      />
      <Footer />
    </div>
  );
}
