const API_ORIGIN = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5000" : "")
).replace(/\/api\/?$/, "");

export function getImageUrl(imageUrl) {
  if (!imageUrl) return "";
  if (/^(https?:)?\/\//i.test(imageUrl) || imageUrl.startsWith("data:"))
    return imageUrl;
  return `${API_ORIGIN}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
}
