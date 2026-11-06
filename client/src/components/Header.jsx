import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ClipboardList,
  Heart,
  Leaf,
  LogOut,
  ShoppingCart,
  UserRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import { syncCartCount } from "../utils/cart";
import "../styles/Header.css";

function initials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function readCartCount() {
  try {
    const cart = JSON.parse(localStorage.getItem("healthyBiteCart") || "[]");
    return Array.isArray(cart)
      ? cart.reduce(
          (total, item) => total + Math.max(0, Number(item.quantity) || 1),
          0,
        )
      : 0;
  } catch {
    return 0;
  }
}

export default function Header() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [cartCount, setCartCount] = useState(readCartCount);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  async function signOut() {
    setAccountMenuOpen(false);
    try {
      await logout();
    } finally {
      navigate("/login");
    }
  }

  useEffect(() => {
    const updateCartCount = () => setCartCount(readCartCount());
    window.addEventListener("storage", updateCartCount);
    window.addEventListener("healthyBiteCartUpdated", updateCartCount);
    return () => {
      window.removeEventListener("storage", updateCartCount);
      window.removeEventListener("healthyBiteCartUpdated", updateCartCount);
    };
  }, []);

  useEffect(() => {
    if (!loading && !user?.id) {
      syncCartCount(0);
      return;
    }
    if (!user?.id) return;
    api
      .get("/cart")
      .then((response) =>
        syncCartCount(
          response.data.items.reduce((sum, item) => sum + item.quantity, 0),
        ),
      )
      .catch(() => {});
  }, [loading, user?.id]);

  return (
    <header className="auth-header">
      <Link to="/" className="brand-logo">
        <span className="brand-symbol">
          <Leaf size={17} />
        </span>{" "}
        HealthyBite
      </Link>

      <nav className="main-navigation">
        <Link
          to="/"
          className={location.pathname === "/" ? "active" : undefined}
          aria-current={location.pathname === "/" ? "page" : undefined}
        >
          Home
        </Link>
        <Link
          to="/products"
          className={
            location.pathname.startsWith("/products") ? "active" : undefined
          }
          aria-current={
            location.pathname.startsWith("/products") ? "page" : undefined
          }
        >
          Explore Meals
        </Link>
        <Link to="/#about">About Us</Link>
      </nav>
      <div className="header-actions">
        <Link
          to="/cart"
          className={`cart-link ${location.pathname === "/cart" ? "active" : ""}`}
          aria-current={location.pathname === "/cart" ? "page" : undefined}
          aria-label={
            cartCount
              ? `Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`
              : "Cart"
          }
        >
          <ShoppingCart size={18} />
          {cartCount > 0 && <i>{cartCount}</i>}
        </Link>
        <Link
          to="/wishlist"
          className={`wishlist-header-link ${location.pathname === "/wishlist" ? "active" : ""}`}
          aria-label="Wishlist"
          aria-current={location.pathname === "/wishlist" ? "page" : undefined}
        >
          <Heart size={18} />
        </Link>
        {user ? (
          <div className="account-menu-wrap">
            <button
              type="button"
              className="account-link"
              aria-label={`Account menu for ${user.name}`}
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              onClick={() => setAccountMenuOpen((open) => !open)}
            >
              {initials(user.name) || <UserRound size={17} />}
            </button>
            {accountMenuOpen && (
              <div className="account-menu" role="menu">
                <Link
                  to="/account"
                  role="menuitem"
                  onClick={() => setAccountMenuOpen(false)}
                >
                  <UserRound size={15} />
                  Profile &amp; addresses
                </Link>
                <Link
                  to="/orders"
                  role="menuitem"
                  onClick={() => setAccountMenuOpen(false)}
                >
                  <ClipboardList size={15} />
                  My orders
                </Link>
                <Link
                  to="/wishlist"
                  role="menuitem"
                  onClick={() => setAccountMenuOpen(false)}
                >
                  <Heart size={15} />
                  Wishlist
                </Link>
                <button type="button" role="menuitem" onClick={signOut}>
                  <LogOut size={15} />
                  Log out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/account" className="account-link" aria-label="Account">
            <UserRound size={17} />
          </Link>
        )}
      </div>
    </header>
  );
}
