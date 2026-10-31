import { Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api, { getErrorMessage } from "../api/axios";
import { addProductToCart } from "../utils/cart";
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

export default function ProductCard({ product, onError }) {
  const navigate = useNavigate();
  const fallback = figmaMealImages[product.name?.trim().toLowerCase()];
  const uploadedImage = product.images?.[0]?.url;
  const image = uploadedImage
    ? uploadedImage.startsWith("/") ? `http://localhost:5000${uploadedImage}` : uploadedImage
    : fallback || "/login-bg.jpg";
  const tags = (product.dietaryTags || []).slice(0, 3);
  const vegetarian = (product.dietaryTags || []).some(tag => ["Vegetarian", "Vegan"].includes(tag));

  async function addToCart() {
    try { await addProductToCart(api, product._id); }
    catch (error) {
      if (error.response?.status === 401) navigate("/login");
      else onError?.(getErrorMessage(error));
    }
  }

  return <article className="meal-menu-card">
    <Link className="meal-menu-image-link" to={`/products/${product.slug}`} aria-label={`View ${product.name}`}>
      <img className="meal-menu-image" src={image} alt={product.images?.[0]?.alt || product.name}/>
      <div className="meal-menu-image-badges"><span className={`meal-veg-mark ${vegetarian ? "vegetarian" : "non-vegetarian"}`} aria-label={vegetarian ? "Vegetarian" : "Not marked vegetarian"}><i/></span>{tags[0] && <span className="meal-diet-badge">{tags[0]}</span>}</div>
      {Number(product.nutrition?.calories) > 0 && <span className="meal-calorie-badge">{Math.round(product.nutrition.calories)} KCAL</span>}
    </Link>
    <div className="meal-menu-card-body">
      <div className="meal-menu-card-copy">
        <Link to={`/products/${product.slug}`} className="meal-menu-title"><h2>{product.name}</h2></Link>
        <div className="meal-menu-meta" aria-label="Meal nutrition and dietary details">
          {product.nutrition?.protein != null && <span>{Math.round(product.nutrition.protein)}G PROTEIN</span>}
          {product.nutrition?.carbs != null && <span>{Math.round(product.nutrition.carbs)}G CARBS</span>}
          {tags.slice(1, 3).map(tag => <span key={tag}>{tag}</span>)}
          {!product.nutrition?.protein && tags.length === 0 && <span>{product.category?.name || "Freshly prepared"}</span>}
        </div>
        <p className="meal-menu-description">{product.description}</p>
      </div>
      <div className="meal-menu-card-footer">
        <div className="meal-menu-price"><small>Price</small><b>₹{Number(product.price).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</b></div>
        <div className="meal-menu-actions"><Link to={`/products/${product.slug}`}>Details</Link><button type="button" disabled={!product.stock} onClick={addToCart} aria-label={`Add ${product.name} to cart`}><Plus size={13}/><span>Add</span></button></div>
      </div>
    </div>
  </article>;
}
