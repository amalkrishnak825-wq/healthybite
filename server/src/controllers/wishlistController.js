import Wishlist from "../models/Wishlist.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  findOrderableProduct,
  publicProductFilter,
  requireId,
} from "../utils/catalog.js";

export const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id }).populate({
    path: "products",
    match: publicProductFilter,
    populate: {
      path: "category",
      match: { isDeleted: false, isActive: { $ne: false } },
      select: "name slug",
    },
  });
  res.json({
    success: true,
    products: (wishlist?.products || []).filter((product) => product.category),
  });
});

export const toggleWishlist = asyncHandler(async (req, res) => {
  requireId(req.params.productId, "Product");
  const product = await findOrderableProduct(req.params.productId);
  if (!product?.category)
    throw new AppError("This product is unavailable.", 404);
  let wishlist = await Wishlist.findOne({ user: req.user._id });
  if (!wishlist) wishlist = new Wishlist({ user: req.user._id, products: [] });
  const exists = wishlist.products.some(
    (id) => id.toString() === product._id.toString(),
  );
  wishlist.products = exists
    ? wishlist.products.filter((id) => id.toString() !== product._id.toString())
    : [...wishlist.products, product._id];
  await wishlist.save();
  res.json({
    success: true,
    added: !exists,
    message: exists ? "Removed from wishlist." : "Added to wishlist.",
  });
});

export const removeWishlistItem = asyncHandler(async (req, res) => {
  requireId(req.params.productId, "Product");
  const wishlist = await Wishlist.findOne({ user: req.user._id });
  if (wishlist) {
    wishlist.products = wishlist.products.filter(
      (id) => id.toString() !== req.params.productId,
    );
    await wishlist.save();
  }
  res.json({ success: true, message: "Removed from wishlist." });
});
