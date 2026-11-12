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
}) {
  return (
    <div className={`cart-quantity ${className}`.trim()}>
      <button type="button" disabled={disabled || decreaseDisabled} onClick={onDecrease} aria-label={decreaseLabel}>−</button>
      <span>{value}</span>
      <button type="button" disabled={disabled || increaseDisabled} onClick={onIncrease} aria-label={increaseLabel}>+</button>
    </div>
  );
}
