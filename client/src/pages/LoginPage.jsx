
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api, { getErrorMessage } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";
import AuthField from "../components/AuthField";
import AuthButton from "../components/AuthButton";
import GoogleButton from "../components/GoogleButton";
import { Leaf, ArrowRight, CircleAlert, CircleCheck } from "lucide-react";
import "../styles/AuthFormError.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
    remember: true,
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice] = useState(location.state?.notice || "");

  function handleChange(event) {
    const { name, value, checked, type } = event.target;
    setErrorMessage("");

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await api.post("/auth/login", form);
      const user = response.data.user;

      setUser(user ?? null);
      navigate(location.state?.from?.pathname || "/account", {
        replace: true,
      });
    } catch (error) {
      const message = getErrorMessage(error);

      if (error.response?.status === 403 && /verif/i.test(message)) {
        setErrorMessage("Please verify your email before signing in.");
      } else {
        setErrorMessage(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout image="/login-bg.jpg" className="auth-login-page">
      <div className="auth-card">
        <div className="auth-brand"><span className="brand-symbol"><Leaf size={19}/></span>Healthy<span className="brand-accent">Bite</span></div>
        <h1>Welcome Back!</h1>
        <p>Sign in to nourish your day and access customized meal plans.</p>

        <GoogleButton />

        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        <form onSubmit={handleSubmit}>
          {errorMessage && <div className="auth-form-error" role="alert"><CircleAlert size={17}/><span>{errorMessage}</span></div>}
          {notice && <div className="auth-form-success" role="status"><CircleCheck size={17}/><span>{notice}</span></div>}
          <AuthField
            label="Email address"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            autoComplete="email"
          />

          <AuthField
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Enter your password"
            autoComplete="current-password"
          />

          <div className="auth-form-options">
            <label>
              <input
                type="checkbox"
                name="remember"
                checked={form.remember}
                onChange={handleChange}
              />
              Remember me
            </label>

            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          <AuthButton loading={loading}>
            Sign In <ArrowRight size={16}/>
          </AuthButton>
        </form>

        <p className="auth-switch">
          Don't have an account yet? <Link to="/register">Create Account</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
