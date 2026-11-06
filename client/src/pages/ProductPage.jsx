import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Heart, ShoppingBag } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ProductCard from "../components/ProductCard";
import ActionConfirmation from "../components/ActionConfirmation";
import api, { getErrorMessage } from "../api/axios";
import { addProductToCart } from "../utils/cart";
import "../styles/Catalog.css";

export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [wishlist, setWishlist] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api
      .get(`/products/${slug}`)
      .then((response) => {
        if (active) {
          setProduct(response.data.product);
          setRelated(response.data.relatedProducts);
          setImageIndex(0);
        }
      })
      .catch((failure) => {
        if (!active) return;
        if (failure.response?.status === 404)
          navigate("/products", {
            replace: true,
            state: { notice: "That product is unavailable." },
          });
        else setError(getErrorMessage(failure));
      });
    return () => {
      active = false;
    };
  }, [slug, navigate]);
  useEffect(() => {
    api
      .get("/wishlist")
      .then((response) =>
        setWishlist(response.data.products.some((item) => item.slug === slug)),
      )
      .catch(() => {});
  }, [slug]);
  async function toggleWishlist() {
    try {
      const result = await api.post(`/wishlist/${product._id}`);
      setWishlist(result.data.added);
    } catch (failure) {
      if (failure.response?.status === 401) navigate("/login");
      else setError(getErrorMessage(failure));
    }
  }
  async function confirmAction() {
    setActionBusy(true);
    try {
      if (pendingAction === "cart") await addProductToCart(api, product._id);
      else {
        const result = await api.post(`/wishlist/${product._id}`);
        setWishlist(result.data.added);
      }
      setError("");
      setPendingAction("");
    } catch (failure) {
      setPendingAction("");
      if (failure.response?.status === 401) navigate("/login");
      else setError(getErrorMessage(failure));
    } finally {
      setActionBusy(false);
    }
  }
  if (error && !product)
    return (
      <div className="home-page">
        <Header />
        <main className="catalog-page">
          <div className="catalog-error">{error}</div>
          <Link to="/products">Browse products</Link>
        </main>
        <Footer />
      </div>
    );
  if (!product)
    return (
      <div className="home-page">
        <Header />
        <main className="catalog-page">Loading product…</main>
        <Footer />
      </div>
    );
  const images = product.images?.length
    ? product.images
    : [{ url: "/login-bg.jpg", alt: product.name }];
  const discount =
    product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : 0;
  return (
    <div className="home-page">
      <Header />
      <main className="catalog-page">
        <div className="catalog-breadcrumb">
          <Link to="/">Home</Link> /{" "}
          <Link to={`/products?category=${product.category?._id || ""}`}>
            {product.category?.name}
          </Link>{" "}
          / <Link to="/products">Products</Link> / {product.name}
        </div>
        {error && <div className="catalog-error">{error}</div>}
        <div className="product-detail-layout">
          <div>
            <div
              className={`product-gallery-main ${zoom ? "zoom" : ""}`}
              onClick={() => setZoom((value) => !value)}
            >
              <img
                src={
                  images[imageIndex]?.url?.startsWith("/")
                    ? `http://localhost:5000${images[imageIndex].url}`
                    : images[imageIndex]?.url
                }
                alt={images[imageIndex]?.alt || product.name}
              />
            </div>
            <div className="product-thumbs">
              {images.map((image, index) => (
                <button
                  key={image.url}
                  className={imageIndex === index ? "active" : ""}
                  onClick={() => {
                    setImageIndex(index);
                    setZoom(false);
                  }}
                >
                  <img
                    src={
                      image.url.startsWith("/")
                        ? `http://localhost:5000${image.url}`
                        : image.url
                    }
                    alt={image.alt || product.name}
                  />
                </button>
              ))}
            </div>
            <small className="catalog-zoom-hint">Click image to zoom</small>
          </div>
          <section className="product-detail-copy">
            <span className="home-section-label">
              {product.category?.name || "HEALTHYBITE"}
            </span>
            <h1>{product.name}</h1>
            <p>{product.description}</p>
            <div
              className={`product-detail-price ${discount ? "has-offer" : ""}`}
            >
              {discount > 0 && (
                <span className="product-offer-caption">OFFER PRICE</span>
              )}
              <span className="product-current-price">
                ₹{Number(product.price).toFixed(2)}
              </span>
              {product.compareAtPrice > product.price && (
                <>
                  <del>₹{Number(product.compareAtPrice).toFixed(2)}</del>
                  <span className="discount-label">{discount}% off</span>
                </>
              )}
            </div>
            <b className={product.stock ? "stock-available" : "stock-empty"}>
              {product.stock ? `${product.stock} available` : "Out of stock"}
            </b>
            <ul className="product-highlights">
              {(product.highlights || []).map((highlight, index) => (
                <li key={`${highlight}-${index}`}>{highlight}</li>
              ))}
            </ul>
            <div className="product-detail-actions">
              <button
                className="home-primary"
                disabled={!product.stock}
                onClick={() => setPendingAction("cart")}
              >
                <ShoppingBag size={16} /> Add to cart
              </button>
              <button
                className={`catalog-card-wish ${wishlist ? "selected" : ""}`}
                onClick={() =>
                  wishlist ? toggleWishlist() : setPendingAction("wishlist")
                }
                aria-label={
                  wishlist ? "Remove from wishlist" : "Add to wishlist"
                }
              >
                <Heart fill={wishlist ? "currentColor" : "none"} />
              </button>
            </div>
          </section>
        </div>
        <section className="related-products">
          <h2>Related products</h2>
          <div className="catalog-grid">
            {related.map((item) => (
              <ProductCard key={item._id} product={item} />
            ))}
          </div>
        </section>
      </main>
      <ActionConfirmation
        open={Boolean(pendingAction)}
        title={pendingAction === "cart" ? "Add to cart?" : "Add to wishlist?"}
        message={
          pendingAction === "cart"
            ? `Add ${product.name} to your cart?`
            : `Save ${product.name} to your wishlist?`
        }
        confirmLabel={
          pendingAction === "cart" ? "Add to cart" : "Add to wishlist"
        }
        busy={actionBusy}
        onCancel={() => setPendingAction("")}
        onConfirm={confirmAction}
      />
      <Footer />
    </div>
  );
}
