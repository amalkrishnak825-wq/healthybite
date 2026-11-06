export function readAdminUser() {
  try {
    return JSON.parse(sessionStorage.getItem("healthyBiteAdminUser") || "{}");
  } catch {
    return {};
  }
}

export function getInitials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "HB"
  );
}
