import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  CircleAlert,
  Eye,
  EyeOff,
  LockKeyhole,
  UtensilsCrossed,
} from "lucide-react";
import api, { getErrorMessage } from "../api/axios";
import useAdminErrorToast from "../utils/useAdminErrorToast";
import "../styles/AppPages.css";
import "../styles/AuthFormError.css";
import "../styles/AdminLogin.css";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState(location.state?.error || "");
  useAdminErrorToast(errorMessage, setErrorMessage);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setErrorMessage("");
    try {
      const response = await api.post("/auth/admin/login", { email, password });
      sessionStorage.setItem("healthyBiteAdmin", "true");
      sessionStorage.setItem(
        "healthyBiteAdminUser",
        JSON.stringify(response.data.user),
      );
      navigate("/admin/users", { replace: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-login-page">
      <Link className="brand" to="/">
        <span className="brand-mark">
          <UtensilsCrossed size={18} />
        </span>{" "}
        healthy<span>bite</span>
      </Link>
      <section className="panel admin-login-card">
        <div className="admin-lock">
          <LockKeyhole />
        </div>
        <div className="eyebrow">TEAM ACCESS</div>
        <h1>Admin sign in</h1>
        <p className="muted">Sign in to manage your HealthyBite community.</p>
        <form onSubmit={submit} className="stack-form">
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setErrorMessage("");
              }}
            />
          </label>
          <label>
            Password
            <span className="admin-password-field">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setErrorMessage("");
                }}
              />
              <button
                type="button"
                className="admin-password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>
          <button className="primary-button" disabled={busy}>
            {busy ? "Signing in…" : "Sign in securely"}
          </button>
        </form>
        <Link className="subtle-link centered" to="/">
          Back to HealthyBite
        </Link>
      </section>
    </main>
  );
}
