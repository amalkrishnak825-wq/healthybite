export default function AvailabilityToggle({
  active,
  disabled = false,
  busy = false,
  title,
  label,
  onToggle,
}) {
  return (
    <button
      type="button"
      className={`catalog-availability-toggle ${active ? "active" : "inactive"}`}
      disabled={disabled || busy}
      title={title}
      aria-pressed={active}
      aria-label={label}
      onClick={onToggle}
    >
      {busy ? "Saving…" : active ? "Active" : "Deactive"}
    </button>
  );
}
