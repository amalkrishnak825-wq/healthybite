import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  CircleAlert,
  CircleCheck,
  Clock3,
  MailCheck,
  Pencil,
  ShieldCheck,
} from "lucide-react";
import api, { getErrorMessage } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { pending } from "../utils/pending";
import { maskEmail, mmss } from "../utils/format";
import useCountdown from "../hooks/useCountdown";
import AuthLayout from "../components/AuthLayout";
import AuthButton from "../components/AuthButton";
import OtpInput from "../components/OtpInput";
import "../styles/AuthFormError.css";

export default function OtpPage({ mode = "register" }) {
  const isReset = mode === "reset";
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();

  const email = isReset ? pending.getReset() : pending.getVerify();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState(
    location.state?.notice || "",
  );
  const { seconds, restart, isRunning } = useCountdown(60);

  useEffect(() => {
    if (!email) {
      navigate(isReset ? "/forgot-password" : "/register", {
        replace: true,
      });
    }
  }, [email, isReset, navigate]);

  async function handleVerify(event) {
    event.preventDefault();

    if (otp.length !== 6) {
      setErrorMessage("Enter the complete six-digit code.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      if (isReset) {
        const response = await api.post("/auth/verify-reset-otp", {
          email,
          otp,
        });

        if (!response.data.resetToken) {
          throw new Error("The server did not return a reset token.");
        }

        pending.setResetToken(response.data.resetToken);
        navigate("/reset-password");
      } else {
        const registration = pending.getRegistration();
        if (!registration) {
          navigate("/register", { replace: true });
          return;
        }
        const response = await api.post("/auth/verify-otp", {
          email,
          otp,
          ...registration,
        });

        pending.clearVerify();
        setUser(response.data.user ?? null);
        navigate("/account", { replace: true });
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (isRunning) return;

    setLoading(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      if (isReset) {
        await api.post("/auth/forgot-password", { email });
      } else {
        await api.post("/auth/resend-otp", { email });
      }

      setOtp("");
      restart(60);
      setStatusMessage("A new verification code has been requested.");
    } catch (error) {
      const retryAfter = error.response?.data?.resendAfterSeconds;

      if (Number.isFinite(retryAfter) && retryAfter > 0) {
        restart(retryAfter);
      }

      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout className="auth-otp-page">
      <div className="auth-card">
        <div className="centered-auth-icon">
          <MailCheck />
        </div>
        <h1>{isReset ? "Verify Your Email" : "Verify Your Email"}</h1>
        <p>
          Enter the 6-digit verification code sent to your registered address.
        </p>
        <div className="otp-email-pill">
          <AtSign size={14} />
          {maskEmail(email)}
          <Pencil size={12} />
        </div>

        <form onSubmit={handleVerify}>
          {errorMessage && (
            <div className="auth-form-error" role="alert">
              <CircleAlert size={17} />
              <span>{errorMessage}</span>
            </div>
          )}
          {statusMessage && (
            <div className="auth-form-success" role="status">
              <CircleCheck size={17} />
              <span>{statusMessage}</span>
            </div>
          )}
          <OtpInput
            value={otp}
            onChange={(value) => {
              setOtp(value);
              setErrorMessage("");
            }}
            disabled={loading}
          />

          <div className="otp-expiry">
            <Clock3 size={14} />
            {isRunning
              ? `Resend code in ${mmss(seconds)}`
              : "Your code may have expired"}
          </div>
          <p className="otp-resend">
            Didn’t receive the code?{" "}
            {!isRunning ? (
              <button type="button" onClick={handleResend} disabled={loading}>
                Resend Code
              </button>
            ) : (
              <span>Resend Code</span>
            )}
          </p>

          <AuthButton loading={loading}>
            Verify Email <ArrowRight size={16} />
          </AuthButton>
        </form>

        <p className="auth-switch">
          <Link to={isReset ? "/forgot-password" : "/login"}>
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </p>
        <div className="secure-note">
          <ShieldCheck size={14} /> Protected by HealthyBite End-to-End
          Encryption
        </div>
      </div>
    </AuthLayout>
  );
}
