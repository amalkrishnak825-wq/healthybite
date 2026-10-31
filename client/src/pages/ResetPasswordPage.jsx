
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { getErrorMessage } from "../api/axios";
import { pending } from "../utils/pending";
import AuthLayout from "../components/AuthLayout";
import AuthField from "../components/AuthField";
import AuthButton from "../components/AuthButton";
import PasswordMeters, {
  passwordChecks,
} from "../components/PasswordMeters";
import { ArrowLeft, CircleAlert, KeyRound, ShieldCheck } from "lucide-react";
import "../styles/AuthFormError.css";

export default function ResetPasswordPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
    setErrorMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const resetToken = pending.getResetToken();

    if (!resetToken) {
      navigate("/forgot-password", { replace: true, state: { error: "Your reset session has expired. Please request a new code." } });
      return;
    }

    if (!Object.values(passwordChecks(form.password)).every(Boolean)) {
      setErrorMessage("Please meet all password requirements.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      await api.post("/auth/reset-password", {
        resetToken,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });

      pending.clearReset();
      pending.clearResetToken();

      navigate("/password-reset-success", { replace: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout className="auth-reset-page">
      <div className="auth-card">
        <div className="centered-auth-icon"><KeyRound/></div>
        <h1>Reset Password</h1>
        <p>Create a new password for your HealthyBite account.</p>

        <form onSubmit={handleSubmit}>
          {errorMessage && <div className="auth-form-error" role="alert"><CircleAlert size={17}/><span>{errorMessage}</span></div>}
          <AuthField
            label="New password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Enter your new password"
            autoComplete="new-password"
          />

          <PasswordMeters password={form.password} />

          <AuthField
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="Enter it again"
            autoComplete="new-password"
          />

          <AuthButton loading={loading}>
            Update Password <span>→</span>
          </AuthButton>
        </form>
        <Link className="auth-back-link" to="/login"><ArrowLeft size={14}/> Back to Sign In</Link>
        <div className="secure-note"><ShieldCheck size={14}/> Protected by HealthyBite End-to-End 256-Bit SSL Encryption</div>
      </div>
    </AuthLayout>
  );
}
