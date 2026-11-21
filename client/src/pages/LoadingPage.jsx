import { LoaderCircle } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "../styles/StatusPages.css";

export default function LoadingPage() {
  return (
    <div className="auth-layout status-layout loading-page">
      <Header />
      <main className="loading-main" aria-live="polite" aria-busy="true">
        <div className="loading-brand-mark">
          <img src="/healthybite-mark.png" alt="" />
          <span className="loading-spinner" aria-hidden="true">
            <LoaderCircle size={18} />
          </span>
        </div>
        <h1>HealthyBite</h1>
        <p className="loading-tagline">FRESH · HEALTHY · DELICIOUS</p>
        <div className="loading-progress" aria-hidden="true">
          <span />
        </div>
        <p className="loading-message">Plating the nourishment...</p>
      </main>
      <Footer />
    </div>
  );
}
