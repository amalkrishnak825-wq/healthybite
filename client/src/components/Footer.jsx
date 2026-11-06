import { Link } from "react-router-dom";
import { Leaf } from "lucide-react";

export default function Footer() {
  return (
    <footer className="auth-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            <span className="footer-logo-icon">
              <Leaf size={17} />
            </span>
            HealthyBite
          </Link>

          <p>Delicious, nutritious meals made to fuel your day.</p>
        </div>

        <div className="footer-column">
          <h4>Quick Links</h4>
          <Link to="/">Home</Link>
          <Link to="/meals">Explore Meals</Link>
          <Link to="/about">About Us</Link>
          <Link to="/contact">Contact</Link>
        </div>

        <div className="footer-column">
          <h4>Account</h4>
          <Link to="/login">Sign In</Link>
          <Link to="/account/orders">Order History</Link>
          <Link to="/account/orders">Track Order</Link>
        </div>

        <div className="footer-column">
          <h4>Legal</h4>
          <Link to="/privacy-policy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/nutrition-transparency">Nutritional Transparency</Link>
        </div>
      </div>

      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} HealthyBite Technologies Pvt. Ltd. All
          rights reserved.
        </span>
        <span>♡ Pure Organic Ingredients</span>
      </div>
    </footer>
  );
}
