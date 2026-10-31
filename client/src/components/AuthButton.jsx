
export default function AuthButton({
  children,
  type = "submit",
  loading = false,
  disabled = false,
}) {
  return (
    <button
      type={type}
      className="auth-button"
      disabled={disabled || loading}
    >
      {loading ? "Please wait..." : children}
    </button>
  );
}
