export function syncCartCount(count) {
  const safeCount = Math.max(0, Number(count) || 0);
  localStorage.setItem("healthyBiteCart", JSON.stringify(safeCount ? [{ quantity: safeCount }] : []));
  window.dispatchEvent(new Event("healthyBiteCartUpdated"));
}

export async function addProductToCart(api, productId, quantity = 1) {
  const response = await api.post("/cart/items", { productId, quantity });
  syncCartCount(response.data.count);
  return response.data;
}
