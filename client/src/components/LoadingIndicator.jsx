import { LoaderCircle } from "lucide-react";
import "./LoadingIndicator.css";

export default function LoadingIndicator({
  message = "Loading…",
  className = "",
}) {
  return (
    <div
      className={`loading-indicator ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <LoaderCircle size={17} aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
