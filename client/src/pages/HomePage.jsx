import { useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  CupSoda,
  Leaf,
  Salad,
  ShieldCheck,
  Sparkles,
  Truck,
  Utensils,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ProductCard from "../components/ProductCard";
import api, { getErrorMessage } from "../api/axios";
import useFocusRefresh from "../hooks/useFocusRefresh";
import "../styles/Home.css";
import "../styles/Auth.css";
import "../styles/Catalog.css";

const categories = [
  [Salad, "Healthy Bowls"],
  [Leaf, "Salads"],
  [CupSoda, "Smoothies"],
];
const categoryOrder = ["healthy bowls", "salads", "smoothies"];

export default function HomePage() {
  const navigate = useNavigate();
  const [meals, setMeals] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [mealsLoading, setMealsLoading] = useState(true);
  const [mealsError, setMealsError] = useState("");
  const [wishlistIds, setWishlistIds] = useState(() => new Set());
  const [wishlistBusyId, setWishlistBusyId] = useState("");
  const focusRevision = useFocusRefresh();

  useEffect(() => {
    let active = true;

    api
      .get("/categories")
      .then((response) => {
        if (!active) return;

        const allowedNames = new Set(categoryOrder);
        const uniqueCategories = new Map();

        (response.data.categories || []).forEach((category) => {
          const normalizedName = category.name?.trim().toLowerCase();
          if (allowedNames.has(normalizedName) && !uniqueCategories.has(normalizedName)) {
            uniqueCategories.set(normalizedName, category);
          }
        });

        setAvailableCategories(
          categoryOrder
            .map((name) => uniqueCategories.get(name))
            .filter(Boolean),
        );
      })
      .catch(() => {
        if (active) setAvailableCategories([]);
      });

    return () => {
      active = false;
    };
  }, [focusRevision]);

  useEffect(() => {
    let active = true;
    api
      .get("/products", {
        params: { page: 1, limit: 4, sort: "recent", featured: true },
      })
      .then((response) => {
        if (active) setMeals(response.data.products || []);
      })
      .catch((error) => {
        if (active) setMealsError(getErrorMessage(error));
      })
      .finally(() => {
        if (active) setMealsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [focusRevision]);

  useEffect(() => {
    let active = true;
    api
      .get("/wishlist")
      .then((response) => {
        if (active)
          setWishlistIds(
            new Set(
              (response.data.products || []).map((product) => product._id),
            ),
          );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function toggleWishlist(meal) {
    setWishlistBusyId(meal._id);
    try {
      const response = await api.post(`/wishlist/${meal._id}`);
      setWishlistIds((current) => {
        const next = new Set(current);
        if (response.data.added) next.add(meal._id);
        else next.delete(meal._id);
        return next;
      });
    } catch (error) {
      if (error.response?.status === 401) navigate("/login");
      else setMealsError(getErrorMessage(error));
    } finally {
      setWishlistBusyId("");
    }
  }

  return (
    <div className="home-page">
      <Header />
      <main>
        <section className="home-hero">
          <div className="home-hero-copy">
            <div className="home-label">
              <Sparkles size={13} /> 100% ORGANIC &amp; CHEF-CRAFTED
            </div>
            <h1>
              Eat Fresh.
              <br />
              <em>Live Better.</em>
            </h1>
            <p>
              Discover delicious, nutritious meals made to fuel your day.
              Healthy eating has never been easier, more transparent, or
              delightfully flavourful.
            </p>
            <div className="home-hero-buttons">
              <Link className="home-primary" to="/products">
                Explore Meals <ArrowRight size={15} />
              </Link>
              <a className="home-secondary" href="#about">
                Learn More
              </a>
            </div>
            <div className="home-trust-row">
              <div>
                <b>★ 4.9/5</b>
                <small>12k+ Foodies</small>
              </div>
              <div>
                <b>
                  <Clock3 size={13} /> 30 Min
                </b>
                <small>Fast Delivery</small>
              </div>
              <div>
                <b>
                  <Leaf size={13} /> 100%
                </b>
                <small>Plant-forward</small>
              </div>
            </div>
          </div>
          <div className="home-hero-visual">
            <img
              src="/login-bg.jpg"
              alt="A fresh quinoa and avocado salad bowl"
            />
            <div className="meal-fresh-badge">
              <span>✳</span> Fresh Avocado &amp; Quinoa · 480 kcal
            </div>
            <div className="meal-protein-badge">
              <BadgeCheck size={13} /> High Protein (32g) · Gluten-Free
            </div>
          </div>
        </section>
        <section className="category-section">
          <div className="home-section-title">
            <div>
              <span className="home-section-label">CURATED MENU</span>
              <h2>Explore by Category</h2>
              <p>
                Wholesome options crafted by clinical nutritionists and
                executive chefs to suit your dietary goals.
              </p>
            </div>
          </div>
          <div className="category-grid">
            {categories
              .map(([Icon, title]) => ({
                Icon,
                title,
                category: availableCategories.find(
                  (item) =>
                    item.name?.trim().toLowerCase() === title.toLowerCase(),
                ),
              }))
              .filter((item) => item.category)
              .map(({ Icon, title, category }) => (
                <Link
                  to={`/products?category=${encodeURIComponent(category._id)}`}
                  className="category-card"
                  key={title}
                >
                  <span className="category-icon">
                    <Icon size={18} />
                  </span>
                  <b>{title}</b>
                  <small>Explore meals</small>
                </Link>
              ))}
          </div>
        </section>
        <section className="fresh-section" id="meals">
          <div className="home-section-title">
            <div>
              <span className="home-section-label">CHEF’S TABLE SELECTION</span>
              <h2>Fresh Picks for You</h2>
              <p>
                Nutrient-dense entrées prepared with cold-pressed oils and
                unprocessed ingredients.
              </p>
            </div>
            <a className="view-all-meals" href="/products">
              View All Meals <ArrowRight size={14} />
            </a>
          </div>
          <div className="meal-menu-grid">
            {meals.map((meal) => (
              <ProductCard
                key={meal._id}
                product={meal}
                onError={setMealsError}
                isWishlisted={wishlistIds.has(meal._id)}
                wishlistBusy={wishlistBusyId === meal._id}
                onToggleWishlist={() => toggleWishlist(meal)}
              />
            ))}
            {mealsLoading && <p>Loading fresh picks…</p>}
            {!mealsLoading && !mealsError && meals.length === 0 && (
              <p>New meals are coming soon.</p>
            )}
            {mealsError && <p role="alert">{mealsError}</p>}
          </div>
        </section>
        <section className="home-story" id="about">
          <div className="home-story-copy">
            <span className="home-section-label">CLEAN LIVING COMMITMENT</span>
            <h2>Your Healthy Journey Starts Here.</h2>
            <p>
              Fresh ingredients. Balanced meals. Better everyday choices
              designed to seamlessly fit your lifestyle.
            </p>
            <div className="home-story-badges">
              <span>
                <ShieldCheck size={13} /> Zero Preservatives
              </span>
              <span>
                <BadgeCheck size={13} /> Certified Organic
              </span>
              <span>
                <Leaf size={13} /> Calorie Transparency
              </span>
            </div>
            <a href="#meals" className="story-button">
              Explore Menu <ArrowRight size={13} />
            </a>
          </div>
          <img src="/login-bg.jpg" alt="HealthyBite fresh ingredients" />
        </section>
        <section className="home-values">
          <div className="home-values-heading">
            <span className="home-section-label">OUR PHILOSOPHY</span>
            <h2>Why Choose HealthyBite?</h2>
            <p>
              We take the guesswork out of wholesome eating with transparent,
              clean culinary standards.
            </p>
          </div>
          <div className="values-grid">
            {[
              [
                Leaf,
                "Fresh Ingredients",
                "100% locally sourced organic produce harvested daily from sustainable partner farms.",
              ],
              [
                ShieldCheck,
                "Balanced Nutrition",
                "Every meal formulated by certified dietitians to ensure optimal macros and micronutrients.",
              ],
              [
                Truck,
                "Convenient Delivery",
                "Seamless ordering experience with scheduled, temperature-monitored drop-offs to your door.",
              ],
              [
                Utensils,
                "Chef-Crafted Taste",
                "Recipes bursting with cold-pressed dressings and botanical aromatics—never bland or boring.",
              ],
            ].map(([Icon, title, copy]) => (
              <article className="value-card" key={title}>
                <span>
                  <Icon size={15} />
                </span>
                <b>{title}</b>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
