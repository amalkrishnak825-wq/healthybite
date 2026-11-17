import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { getErrorMessage, getFieldErrors } from "../api/axios";
import { pending } from "../utils/pending";
import AuthLayout from "../components/AuthLayout";
import AuthField from "../components/AuthField";
import AuthButton from "../components/AuthButton";
import GoogleButton from "../components/GoogleButton";
import PasswordMeters, { passwordChecks } from "../components/PasswordMeters";
import { getEmailError, getNameError } from "../utils/validation";
import { ArrowRight, CircleAlert, Leaf } from "lucide-react";
import "../styles/AuthFormError.css";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    agree: false,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  function handleChange(event) {
    const { name, value, checked, type } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));

    const liveError =
      name === "name"
        ? getNameError(value, { max: 80 })
        : name === "email"
          ? getEmailError(value)
          : "";
    setErrors((previous) => ({
      ...previous,
      [name]: liveError,
      form: "",
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrors({});

    const nextErrors = {};

    const nameError = getNameError(form.name, { required: true, max: 80 });
    const emailError = getEmailError(form.email, true);
    if (nameError) nextErrors.name = nameError;
    if (emailError) nextErrors.email = emailError;

    if (!Object.values(passwordChecks(form.password)).every(Boolean)) {
      nextErrors.password = "Please meet all password requirements.";
    }

    if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    if (!form.agree) {
      nextErrors.agree = "Please accept the terms to continue.";
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/register", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      pending.setVerify(form.email.trim());
      pending.setRegistration({
        name: form.name.trim(),
        password: form.password,
      });
      navigate("/verify-email", {
        state: {
          notice:
            "Account created. Check your email for the verification code.",
        },
      });
    } catch (error) {
      setErrors({ ...getFieldErrors(error), form: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout image="/login-bg.jpg" className="auth-register-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-symbol">
            <Leaf size={19} />
          </span>
          Healthy<span className="brand-accent">Bite</span>
        </div>
        <h1>Create Your Account</h1>
        <p>
          Start your healthy journey with seasonal, chef-crafted nutritious
          meals delivered directly to your doorstep.
        </p>

        <GoogleButton />

        <div className="auth-divider">
          <span>or register with email</span>
        </div>

        <form onSubmit={handleSubmit}>
          {errors.form && (
            <div className="auth-form-error" role="alert">
              <CircleAlert size={17} />
              <span>{errors.form}</span>
            </div>
          )}
          <AuthField
            label="Full name"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Your name"
            autoComplete="name"
            error={errors.name}
          />

          <AuthField
            label="Email address"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            autoComplete="email"
            hint="Use an inbox you can access; we’ll send a verification code."
            error={errors.email}
          />

          <AuthField
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Create a strong password"
            autoComplete="new-password"
            error={errors.password}
          />

          <PasswordMeters password={form.password} />

          <AuthField
            label="Confirm password"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="Enter your password again"
            autoComplete="new-password"
            error={errors.confirmPassword}
          />

          <label className="auth-terms">
            <input
              type="checkbox"
              name="agree"
              checked={form.agree}
              onChange={handleChange}
            />
            I agree to HealthyBite’s <Link to="/terms">Terms of Service</Link>{" "}
            and acknowledge the <Link to="/privacy-policy">Privacy Policy</Link>
            .
          </label>

          {errors.agree && <p className="field-error">{errors.agree}</p>}

          <AuthButton loading={loading}>
            Create Account <ArrowRight size={15} />
          </AuthButton>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
