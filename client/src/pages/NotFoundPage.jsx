import { ArrowLeft, CalendarDays, CookingPot, Home, Leaf, Utensils } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "../styles/StatusPages.css";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="auth-layout status-layout not-found-page">
      <Header />
      <main className="not-found-main">
        <div className="not-found-art" aria-hidden="true">
          <CookingPot size={56} strokeWidth={1.5} />
          <Leaf className="not-found-leaf not-found-leaf-one" size={18} />
          <Leaf className="not-found-leaf not-found-leaf-two" size={13} />
        </div>
        <span className="not-found-eyebrow">ERROR 404 · LOST HARVEST</span>
        <p className="not-found-code">404</p>
        <h1>Oops! Page Not Found</h1>
        <p className="not-found-copy">
          The culinary page you are looking for may have been harvested,
          seasoned differently, or simply does not exist.
        </p>
        <div className="not-found-actions">
          <Link className="not-found-home-button" to="/">
            <Home size={17} /> Back to Home
          </Link>
          <button
            className="not-found-back-button"
            type="button"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={17} /> Go Back
          </button>
        </div>
        <div className="not-found-explore">
          <span className="not-found-divider" />
          <p>Or explore our most popular wholesome avenues:</p>
          <div className="not-found-links">
            <Link to="/products">
              <Utensils size={15} /> Seasonal Menu
            </Link>
            <Link to="/products">
              <CalendarDays size={15} /> Curated Meal Plans
            </Link>
            <Link to="/about">
              <Leaf size={15} /> Our Philosophy
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
