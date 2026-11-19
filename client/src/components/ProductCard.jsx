import { useState } from "react";
import { Heart, Plus } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api, { getErrorMessage } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { addProductToCart } from "../utils/cart";
import { getImageUrl } from "../utils/imageUrl";
import ActionConfirmation from "./ActionConfirmation";
import greenGoddessBowl from "../assets/meal-menu/green-goddess-bowl.png";
import grilledProteinBowl from "../assets/meal-menu/grilled-protein-bowl.png";
import artisanAvocadoToast from "../assets/meal-menu/artisan-avocado-toast.png";
import freshBerrySmoothie from "../assets/meal-menu/fresh-berry-smoothie.png";
import mediterraneanSalad from "../assets/meal-menu/mediterranean-salad.png";
import quinoaPowerBowl from "../assets/meal-menu/quinoa-power-bowl.png";
import grilledChickenSalad from "../assets/meal-menu/grilled-chicken-salad.png";
import tropicalFruitSmoothie from "../assets/meal-menu/tropical-fruit-smoothie.png";

const figmaMealImages = {
  "green goddess bowl": greenGoddessBowl,
  "grilled protein bowl": grilledProteinBowl,
  "artisan avocado toast": artisanAvocadoToast,
  "fresh berry smoothie": freshBerrySmoothie,
  "mediterranean salad": mediterraneanSalad,
  "quinoa power bowl": quinoaPowerBowl,
  "grilled chicken salad": grilledChickenSalad,
  "tropical fruit smoothie": tropicalFruitSmoothie,
};

export default function ProductCard({
  product,
  onError,
  isWishlisted = false,
  wishlistBusy = false,
  onToggleWishlist,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  const [confirmAdd, setConfirmAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const fallback = figmaMealImages[product.name?.trim().toLowerCase()];
  const uploadedImage = product.images?.[0]?.url;
  const image = uploadedImage
    ? uploadedImage.startsWith("/")
      ? getImageUrl(uploadedImage)
      : uploadedImage
    : fallback || "/login-bg.jpg";
  const tags = (product.dietaryTags || []).slice(0, 3);
  const hasOffer = Number(product.compareAtPrice) > Number(product.price);
  const discount = hasOffer
    ? Math.round(
        (1 - Number(product.price) / Number(product.compareAtPrice)) * 100,
      )
    : 0;
  const vegetarian = (product.dietaryTags || []).some((tag) =>
    ["Vegetarian", "Vegan"].includes(tag),
  );

  async function addToCart() {
    setBusy(true);
    try {
      await addProductToCart(api, product._id);
      setConfirmAdd(false);
    } catch (error) {
      setConfirmAdd(false);
      if (error.response?.status === 401) {
        setUser(null);
        navigate("/login", { state: { from: location } });
      }
      else onError?.(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      className="meal-menu-card"
      role="link"
      tabIndex={0}
      aria-label={`View ${product.name} details`}
      onClick={(event) => {
        if (!event.target.closest("a, button")) {
          navigate(`/products/${product.slug}`);
        }
      }}
      onKeyDown={(event) => {
        if (
          event.target === event.currentTarget &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault();
          navigate(`/products/${product.slug}`);
        }
      }}
    >
      {onToggleWishlist && (
        <button
          type="button"
          className={`meal-card-wishlist ${isWishlisted ? "selected" : ""}`}
          aria-label={
            isWishlisted
              ? `Remove ${product.name} from wishlist`
              : `Add ${product.name} to wishlist`
          }
          aria-pressed={isWishlisted}
          disabled={wishlistBusy}
          onClick={onToggleWishlist}
        >
          <Heart size={17} fill={isWishlisted ? "currentColor" : "none"} />
        </button>
      )}
      <Link
        className="meal-menu-image-link"
        to={`/products/${product.slug}`}
        aria-label={`View ${product.name}`}
      >
        <img
          className={`meal-menu-image ${product.stock < 1 ? "out-of-stock-image" : ""}`}
          src={image}
          alt={product.images?.[0]?.alt || product.name}
        />
        <div className="meal-menu-image-badges">
          <span
            className={`meal-veg-mark ${vegetarian ? "vegetarian" : "non-vegetarian"}`}
            aria-label={vegetarian ? "Vegetarian" : "Not marked vegetarian"}
          >
            <i />
          </span>
          {tags[0] && <span className="meal-diet-badge">{tags[0]}</span>}
        </div>
        {product.stock < 1 && (
          <span className="meal-out-of-stock-badge">Out of stock</span>
        )}
        {(product.stock > 0 && hasOffer && discount > 0) ||
        Number(product.nutrition?.calories) > 0 ? (
          <div className="meal-menu-image-bottom-badges">
            {product.stock > 0 && hasOffer && discount > 0 && (
              <span
                className="meal-offer-badge"
                aria-label={`${discount}% discount`}
              >
                {discount}% OFF
              </span>
            )}
            {Number(product.nutrition?.calories) > 0 && (
              <span className="meal-calorie-badge">
                {Math.round(product.nutrition.calories)} KCAL
              </span>
            )}
          </div>
        ) : null}
      </Link>
      <div className="meal-menu-card-body">
        <div className="meal-menu-card-copy">
          <Link to={`/products/${product.slug}`} className="meal-menu-title">
            <h2>{product.name}</h2>
          </Link>
          <div
            className="meal-menu-meta"
            aria-label="Meal nutrition and dietary details"
          >
            {product.nutrition?.protein != null && (
              <span>{Math.round(product.nutrition.protein)}G PROTEIN</span>
            )}
            {product.nutrition?.carbs != null && (
              <span>{Math.round(product.nutrition.carbs)}G CARBS</span>
            )}
            {tags.slice(1, 3).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
            {!product.nutrition?.protein && tags.length === 0 && (
              <span>{product.category?.name || "Freshly prepared"}</span>
            )}
          </div>
          <p className="meal-menu-description">{product.description}</p>
        </div>
        <div className="meal-menu-card-footer">
          <div className="meal-menu-price">
            <small>Price</small>
            <b>
              ₹
              {Number(product.price).toLocaleString("en-IN", {
                maximumFractionDigits: 2,
              })}
            </b>
          </div>
          <div className="meal-menu-actions">
            <Link to={`/products/${product.slug}`}>Details</Link>
            <button
              type="button"
              disabled={!product.stock}
              onClick={() => setConfirmAdd(true)}
              aria-label={
                product.stock > 0
                  ? `Add ${product.name} to cart`
                  : `${product.name} is out of stock`
              }
            >
              {product.stock > 0 && <Plus size={13} />}
              <span>{product.stock > 0 ? "Add" : "Unavailable"}</span>
            </button>
          </div>
        </div>
      </div>
      <ActionConfirmation
        open={confirmAdd}
        title="Add to cart?"
        message={`Add ${product.name} to your cart?`}
        confirmLabel="Add to cart"
        busy={busy}
        onCancel={() => setConfirmAdd(false)}
        onConfirm={addToCart}
      />
    </article>
  );
}
