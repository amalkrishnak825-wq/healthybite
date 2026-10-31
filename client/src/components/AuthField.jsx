
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function AuthField({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  autoComplete,
}) {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <div className="auth-field">
      <label htmlFor={name}>{label}</label>

      <div className={`auth-input-wrapper ${isPassword ? "password-wrapper" : ""}`}>
        <input
          id={name}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          required
        />

        {isPassword && (
          <button
            className="password-toggle"
            type="button"
            onClick={() => setShowPassword((previous) => !previous)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}
          </button>
        )}
      </div>

      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
