export function passwordChecks(password = "") {
  return {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
  };
}

export function PasswordRules({ password = "" }) {
  const checks = passwordChecks(password);

  const rules = [
    ["length", "At least 8 characters"],
    ["lowercase", "One lowercase letter (a-z)"],
    ["uppercase", "One uppercase letter (A-Z)"],
    ["number", "One number (0-9)"],
  ];

  return (
    <ul className="password-rules">
      {rules.map(([key, label]) => (
        <li key={key} className={checks[key] ? "rule-valid" : ""}>
          {checks[key] ? "✓" : "○"} {label}
        </li>
      ))}
    </ul>
  );
}

export default function PasswordMeters({ password = "" }) {
  const checks = passwordChecks(password);
  const score = Object.values(checks).filter(Boolean).length;

  return (
    <div className="password-meter">
      <div className="password-meter-bars">
        {[1, 2, 3, 4].map((level) => (
          <span key={level} className={score >= level ? "meter-filled" : ""} />
        ))}
      </div>

      <p>
        Password strength:{" "}
        {score === 0
          ? "Not started"
          : score <= 2
            ? "Weak"
            : score === 3
              ? "Good"
              : "Strong"}
      </p>

      <PasswordRules password={password} />
    </div>
  );
}
