import { LoaderCircle } from "lucide-react";

export default function QuantityStepper({
  value,
  onDecrease,
  onIncrease,
  decreaseDisabled = false,
  increaseDisabled = false,
  decreaseLabel = "Decrease quantity",
  increaseLabel = "Increase quantity",
  className = "",
  disabled = false,
  loading = false,
}) {
  return (
    <div
      className={`cart-quantity ${className}`.trim()}
      aria-busy={loading}
    >
      <button type="button" disabled={disabled || loading || decreaseDisabled} onClick={onDecrease} aria-label={decreaseLabel}>−</button>
      <span>{value}</span>
      {loading && (
        <span className="cart-quantity-loading" aria-hidden="true">
          <LoaderCircle size={14} />
        </span>
      )}
      <button type="button" disabled={disabled || loading || increaseDisabled} onClick={onIncrease} aria-label={increaseLabel}>+</button>
    </div>
  );
}
