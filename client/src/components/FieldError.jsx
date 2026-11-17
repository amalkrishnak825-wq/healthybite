export default function FieldError({ id, message, className = "field-error" }) {
  if (!message) return null;

  return (
    <small className={className} id={id} role="alert">
      {message}
    </small>
  );
}
