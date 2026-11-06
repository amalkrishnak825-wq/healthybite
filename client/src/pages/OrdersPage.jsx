import { Link } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "../styles/Catalog.css";

export default function OrdersPage() {
  return (
    <div className="home-page">
      <Header />
      <main className="wishlist-page">
        <div className="catalog-heading">
          <div>
            <span className="home-section-label">YOUR HEALTHYBITE</span>
            <h1>My orders</h1>
            <p>Review your past meal orders.</p>
          </div>
          <Link to="/products">Explore meals</Link>
        </div>
        <section className="catalog-empty">
          <ClipboardList size={28} />
          <p>Order history will appear here when orders are available.</p>
          <Link to="/products">Browse meals</Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
