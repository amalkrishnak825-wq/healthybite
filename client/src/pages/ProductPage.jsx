import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flame,
  Heart,
  Leaf,
  ShoppingBag,
} from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ProductCard from "../components/ProductCard";
import ActionConfirmation from "../components/ActionConfirmation";
import api, { getErrorMessage } from "../api/axios";
import { addProductToCart } from "../utils/cart";
import "../styles/Catalog.css";
import "../styles/ProductDetail.css";

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
  const vegetarian = (product.dietaryTags || []).some((tag) =>
    ["Vegetarian", "Vegan"].includes(tag),
  );
  function moveImage(direction) {
    setImageIndex((current) => (current + direction + images.length) % images.length);
    setZoom(false);
  }
  return (
    <div className="home-page">
      <Header />
      <main className="catalog-page product-detail-page">
        <nav className="catalog-breadcrumb product-detail-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link> /{" "}
          <Link to={`/products?category=${product.category?._id || ""}`}>
            {product.category?.name}
          </Link>{" "}
          / <Link to="/products">Products</Link> / {product.name}
        </nav>
        {error && <div className="catalog-error">{error}</div>}
        <div className="product-detail-layout">
          <div className="product-detail-gallery">
            <div
              className={`product-gallery-main ${zoom ? "zoom" : ""} ${!product.stock ? "out-of-stock" : ""}`}
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
              <div className="product-gallery-badges">
                <span className={`product-gallery-diet ${vegetarian ? "vegetarian" : ""}`}>
                  <Leaf size={13} /> {vegetarian ? "Plant based" : "Chef crafted"}
                </span>
                {!product.stock ? (
                  <span className="product-gallery-stock">Out of stock</span>
                ) : discount > 0 ? (
                  <span className="product-gallery-offer">{discount}% OFF</span>
                ) : null}
              </div>
              {images.length > 1 && (
                <>
                  <button type="button" className="product-gallery-arrow previous" aria-label="Previous image" onClick={(event) => { event.stopPropagation(); moveImage(-1); }}><ChevronLeft size={20} /></button>
                  <button type="button" className="product-gallery-arrow next" aria-label="Next image" onClick={(event) => { event.stopPropagation(); moveImage(1); }}><ChevronRight size={20} /></button>
                  <span className="product-gallery-count">{imageIndex + 1} / {images.length}</span>
                </>
              )}
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
            <small className="catalog-zoom-hint">Tap image to zoom · Use arrows to browse</small>
          </div>
          <section className="product-detail-copy">
            <span className="product-detail-category"><Leaf size={14} /> {product.category?.name || "HEALTHYBITE"}</span>
            <h1>{product.name}</h1>
            {product.subtitle && <p className="product-detail-subtitle">{product.subtitle}</p>}
            <div className="product-detail-facts">
              {product.prepTime && <span><Clock3 size={15} /> Ready in {product.prepTime}</span>}
              {Number(product.nutrition?.calories) > 0 && <span><Flame size={15} /> {Math.round(product.nutrition.calories)} kcal</span>}
              {product.dietaryTags?.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}
            </div>
            <p className="product-detail-description">{product.description}</p>
            <div
              className={`product-detail-price ${discount ? "has-offer" : ""}`}
            >
              {discount > 0 && (
                  <span className="product-offer-caption">YOUR OFFER PRICE</span>
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
            <div className={`product-detail-availability ${product.stock ? "available" : "unavailable"}`}>
              <span className="product-availability-dot" />
              <span>{product.stock ? product.stock < 6 ? `Only ${product.stock} left in stock` : "Fresh and available" : "Currently out of stock"}</span>
            </div>
            {product.highlights?.length > 0 && <div className="product-highlights-block">
              <h2>Why you’ll love it</h2>
              <ul className="product-highlights">
                {product.highlights.map((highlight, index) => (
                  <li key={`${highlight}-${index}`}><Check size={14} /> {highlight}</li>
                ))}
              </ul>
            </div>}
            <div className="product-detail-actions">
              <button
                className="home-primary"
                disabled={!product.stock}
                onClick={() => setPendingAction("cart")}
              >
                <ShoppingBag size={17} /> {product.stock ? "Add to cart" : "Currently unavailable"}
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
          <div className="product-related-heading"><span className="home-section-label">MORE TO ENJOY</span><h2>You might also like</h2><p>More fresh picks from our kitchen.</p></div>
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
