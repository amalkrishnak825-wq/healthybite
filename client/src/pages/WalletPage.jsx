import { useEffect, useState } from "react";
import { ArrowLeft, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import api, { getErrorMessage } from "../api/axios";
import "../styles/Checkout.css";
import "../styles/Wallet.css";

const money = (amount) => `₹${Number(amount || 0).toFixed(2)}`;

export default function WalletPage() {
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get("/wallet").then(({ data }) => {
      if (active) setWallet(data.wallet || { balance: 0, transactions: [] });
    }).catch((failure) => {
      if (active) setError(getErrorMessage(failure));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="home-page">
      <Header />
      <main className="wallet-page">
        <Link className="checkout-back" to="/account"><ArrowLeft size={16} /> Back to my account</Link>
        <div className="wallet-heading"><span className="home-section-label">YOUR HEALTHYBITE</span><h1>My Wallet</h1><p>Accepted return refunds are added to your wallet and can be used at checkout.</p></div>
        {error && <div className="checkout-error" role="alert">{error}</div>}
        <section className="wallet-balance-card">
          <span className="wallet-icon"><Wallet size={21} /></span>
          <div><small>WALLET BALANCE</small><strong>{loading ? "Loading…" : error ? "—" : money(wallet.balance)}</strong></div>
        </section>
        <p className="wallet-note">Accepted return refunds are added to your wallet automatically.</p>
        <Link className="wallet-shop-link" to="/products">Shop meals</Link>
      </main>
      <Footer />
    </div>
  );
}
