export const MAX_CART_ITEM_QUANTITY = 5;

export function isUnavailableProduct(product) {
  return (
    !product ||
    product.isDeleted ||
    product.isBlocked ||
    !product.isPublished ||
    product.category?.isDeleted ||
    product.category?.isActive === false
  );
}

export function getMaximumOrderQuantity(product) {
  return Math.max(
    0,
    Math.min(Number(product?.stock) || 0, MAX_CART_ITEM_QUANTITY),
  );
}

export function canOrderProduct(product, quantity = 1) {
  return (
    !isUnavailableProduct(product) &&
    Number.isInteger(quantity) &&
    quantity >= 1 &&
    quantity <= getMaximumOrderQuantity(product)
  );
}
