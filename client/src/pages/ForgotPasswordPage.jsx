import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api, { getErrorMessage } from "../api/axios";
import { pending } from "../utils/pending";
import AuthLayout from "../components/AuthLayout";
import AuthField from "../components/AuthField";
import AuthButton from "../components/AuthButton";
import { ArrowLeft, CircleAlert, Leaf } from "lucide-react";
import "../styles/AuthFormError.css";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(location.state?.error || "");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      await api.post("/auth/forgot-password", {
        email: email.trim(),
      });

      pending.setReset(email.trim());
      navigate("/forgot-password/verify", {
        state: {
          notice: "If the account exists, a verification code will be sent.",
        },
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout className="auth-forgot-page">
      <div className="auth-card">
        <div className="auth-compact-brand">
          <Leaf size={19} />
          HealthyBite
        </div>
        <h1>Forgot Password?</h1>
        <p>
          Enter the email address associated with your account. We'll help you
          reset your password.
        </p>

        <form onSubmit={handleSubmit}>
          {errorMessage && (
            <div className="auth-form-error" role="alert">
              <CircleAlert size={17} />
              <span>{errorMessage}</span>
            </div>
          )}
          <AuthField
            label="Email address"
            name="email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setErrorMessage("");
            }}
            placeholder="you@example.com"
            autoComplete="email"
          />

          <AuthButton loading={loading}>Reset Password</AuthButton>
        </form>

        <p className="auth-switch">
          <Link to="/login">
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
