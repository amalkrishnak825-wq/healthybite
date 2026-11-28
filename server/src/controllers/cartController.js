import Cart from "../models/Cart.js";
import Wishlist from "../models/Wishlist.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  findOrderableProduct,
  isOrderableProduct,
  MAX_CART_ITEM_QUANTITY,
  requireId,
} from "../utils/catalog.js";

export const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate({
    path: "items.product",
    populate: {
      path: "category",
      select: "name slug isDeleted isActive",
    },
  });
  const items = (cart?.items || [])
    .filter((item) => item.product)
    .map((item) => ({
      product: item.product,
      quantity: item.quantity,
      valid: isOrderableProduct(item.product, item.quantity),
      lineTotal: item.product.price * item.quantity,
    }));
  res.json({
    success: true,
    items,
    total: items.reduce((sum, item) => sum + item.lineTotal, 0),
    valid: items.length > 0 && items.every((item) => item.valid),
  });
});

export const addCartItem = asyncHandler(async (req, res) => {
  requireId(req.body.productId, "Product");
  const quantity = Number(req.body.quantity ?? 1);
  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > MAX_CART_ITEM_QUANTITY
  )
    throw new AppError(
      `Quantity must be between 1 and ${MAX_CART_ITEM_QUANTITY}.`,
      400,
    );
  const product = await findOrderableProduct(req.body.productId);
  if (!product?.category || product.stock < 1)
    throw new AppError("This product is unavailable or out of stock.", 409);
  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) cart = new Cart({ user: req.user._id, items: [] });
  const item = cart.items.find(
    (entry) => entry.product.toString() === product._id.toString(),
  );
  const nextQuantity = (item?.quantity || 0) + quantity;
  if (nextQuantity > MAX_CART_ITEM_QUANTITY)
    throw new AppError(
      `You can add up to ${MAX_CART_ITEM_QUANTITY} of each product.`,
      409,
    );
  if (nextQuantity > product.stock)
    throw new AppError(
      `Only ${product.stock} can be added.`,
      409,
    );
  if (item) item.quantity = nextQuantity;
  else cart.items.push({ product: product._id, quantity });
  await cart.save();
  const wishlist = await Wishlist.findOne({ user: req.user._id });
  if (wishlist) {
    wishlist.products = wishlist.products.filter(
      (id) => id.toString() !== product._id.toString(),
    );
    await wishlist.save();
  }
  res.json({
    success: true,
    message: "Added to cart.",
    count: cart.items.reduce((sum, entry) => sum + entry.quantity, 0),
  });
});

export const updateCartItem = asyncHandler(async (req, res) => {
  requireId(req.params.productId, "Product");
  const quantity = Number(req.body.quantity);
  const cart = await Cart.findOne({ user: req.user._id });
  const item = cart?.items.find(
    (entry) => entry.product.toString() === req.params.productId,
  );
  if (!item) throw new AppError("Cart item not found.", 404);

  if (!Number.isInteger(quantity) || quantity < 1)
    throw new AppError("Quantity must be a positive whole number.", 400);
  const isReducingQuantity = quantity < item.quantity;
  if (quantity > MAX_CART_ITEM_QUANTITY && !isReducingQuantity)
    throw new AppError(
      `You can have up to ${MAX_CART_ITEM_QUANTITY} of each product.`,
      400,
    );

  const product = await findOrderableProduct(req.params.productId);
  if (
    !product?.category ||
    product.stock < 1 ||
    (!isReducingQuantity && product.stock < quantity)
  )
    throw new AppError("Requested quantity is unavailable.", 409);
  item.quantity = quantity;
  await cart.save();
  res.json({ success: true, message: "Cart updated." });
});

export const removeCartItem = asyncHandler(async (req, res) => {
  requireId(req.params.productId, "Product");
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) throw new AppError("Cart is empty.", 404);
  cart.items = cart.items.filter(
    (item) => item.product.toString() !== req.params.productId,
  );
  await cart.save();
  res.json({ success: true, message: "Item removed from cart." });
});

export const validateCheckout = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate({
    path: "items.product",
    populate: { path: "category", select: "isDeleted isActive" },
  });
  if (!cart?.items.length) throw new AppError("Your cart is empty.", 400);
  const invalid = cart.items.filter(
    (item) => !isOrderableProduct(item.product, item.quantity),
  );
  if (invalid.length)
    throw new AppError(
      "Some cart items are unavailable or have changed stock. Review your cart.",
      409,
    );
  res.json({
    success: true,
    total: cart.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    ),
    items: cart.items.map((item) => ({
      productId: item.product._id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      lineTotal: item.product.price * item.quantity,
    })),
  });
});
