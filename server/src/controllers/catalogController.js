import crypto from "node:crypto";
import fs from "node:fs/promises";
import mongoose from "mongoose";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import Cart from "../models/Cart.js";
import Wishlist from "../models/Wishlist.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";

const escaped = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const makeSlug = (value) => `${slugify(value) || "item"}-${crypto.randomBytes(3).toString("hex")}`;
const booleanValue = (value, fallback = false) => {
  if (value === undefined) return fallback;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  throw new AppError("Publication and block status values must be boolean.", 400);
};
const publicProductFilter = { isPublished: true, isDeleted: false, isBlocked: false };
const allowedDietaryTags = ["Vegetarian", "Vegan", "Gluten-Free", "High Protein", "Dairy-Free", "Keto Friendly", "Nut-Free", "Organic"];
const requireId = (id, label) => { if (!mongoose.isValidObjectId(id)) throw new AppError(`${label} not found.`, 404); };

export const listCategories = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
  const search = String(req.query.search || "").trim().slice(0, 80);
  const filter = { isDeleted: false, ...(search ? { $or: [{ name: { $regex: escaped(search), $options: "i" } }, { description: { $regex: escaped(search), $options: "i" } }] } : {}) };
  const [categories, total] = await Promise.all([Category.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Category.countDocuments(filter)]);
  res.json({ success: true, categories, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const listAdminCategories = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
  const search = String(req.query.search || "").trim().slice(0, 80);
  const filter = search ? { $or: [{ name: { $regex: escaped(search), $options: "i" } }, { description: { $regex: escaped(search), $options: "i" } }] } : {};
  const [categories, total] = await Promise.all([Category.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Category.countDocuments(filter)]);
  res.json({ success: true, categories, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const createCategory = asyncHandler(async (req, res) => {
  const { name, description = "" } = req.body;
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80) throw new AppError("Category name must be between 2 and 80 characters.", 400);
  if (typeof description !== "string" || description.length > 500) throw new AppError("Category description cannot exceed 500 characters.", 400);
  const category = await Category.create({ name: name.trim(), description: description.trim(), slug: makeSlug(name) });
  res.status(201).json({ success: true, category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  requireId(req.params.id, "Category");
  const category = await Category.findById(req.params.id);
  if (!category || category.isDeleted) throw new AppError("Category not found.", 404);
  const { name, description } = req.body;
  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80) throw new AppError("Category name must be between 2 and 80 characters.", 400);
    category.name = name.trim();
    category.slug = makeSlug(name);
  }
  if (description !== undefined) {
    if (typeof description !== "string" || description.length > 500) throw new AppError("Category description cannot exceed 500 characters.", 400);
    category.description = description.trim();
  }
  await category.save();
  res.json({ success: true, category });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  requireId(req.params.id, "Category");
  const category = await Category.findById(req.params.id);
  if (!category || category.isDeleted) throw new AppError("Category not found.", 404);
  category.isDeleted = true;
  await category.save();
  await Product.updateMany({ category: category._id, isDeleted: false }, { $set: { isDeleted: true, isPublished: false } });
  res.json({ success: true, message: "Category and its products were removed from the catalog." });
});

const normalizeProductInput = (body, files = [], existing = null) => {
  const data = {};
  for (const key of ["name", "description", "category", "subtitle", "prepTime"]) if (body[key] !== undefined) data[key] = String(body[key]).trim();
  for (const key of ["price", "stock", "compareAtPrice"]) {
    if (body[key] !== undefined && body[key] !== "") {
      const value = Number(body[key]);
      if (!Number.isFinite(value) || value < 0 || (key === "stock" && (!Number.isInteger(value) || value > 1000000)) || (key !== "stock" && value > 100000000)) throw new AppError(`${key} must be a valid non-negative ${key === "stock" ? "whole number" : "amount"}.`, 400);
      data[key] = value;
    }
  }
  if (body.highlights !== undefined) {
    try { data.highlights = JSON.parse(body.highlights); } catch { throw new AppError("Product highlights are invalid.", 400); }
    if (!Array.isArray(data.highlights) || data.highlights.length > 12 || data.highlights.some(item => typeof item !== "string" || item.trim().length > 160)) throw new AppError("Add up to 12 valid product highlights.", 400);
    data.highlights = data.highlights.map(item => item.trim()).filter(Boolean);
  }
  if (body.dietaryTags !== undefined) {
    try { data.dietaryTags = JSON.parse(body.dietaryTags); } catch { throw new AppError("Dietary tags are invalid.", 400); }
    const allowed = allowedDietaryTags;
    if (!Array.isArray(data.dietaryTags) || data.dietaryTags.length > allowed.length || data.dietaryTags.some(tag => !allowed.includes(tag))) throw new AppError("Select valid dietary tags.", 400);
  }
  if (body.nutrition !== undefined) {
    try { data.nutrition = JSON.parse(body.nutrition); } catch { throw new AppError("Nutritional information is invalid.", 400); }
    const keys = ["calories", "protein", "carbs", "fats"];
    if (!data.nutrition || typeof data.nutrition !== "object" || Array.isArray(data.nutrition) || Object.keys(data.nutrition).some(key => !keys.includes(key))) throw new AppError("Nutritional information is invalid.", 400);
    data.nutrition = Object.fromEntries(keys.map(key => {
      const value = data.nutrition[key];
      if (value === "" || value === null || value === undefined) return [key, null];
      const number = Number(value);
      if (!Number.isFinite(number) || number < 0 || number > 100000) throw new AppError(`${key} must be a valid non-negative amount.`, 400);
      return [key, number];
    }));
  }
  if (body.isPublished !== undefined) data.isPublished = booleanValue(body.isPublished);
  if (body.isBlocked !== undefined) data.isBlocked = booleanValue(body.isBlocked);
  const uploadedImages = files.map(file => ({ url: `/uploads/products/${file.filename}`, alt: "" }));
  if (uploadedImages.length) data.images = [...(existing?.images || []), ...uploadedImages];
  if (body.removeImages !== undefined) {
    let remove = [];
    try { remove = JSON.parse(body.removeImages); } catch { throw new AppError("Image removal selection is invalid.", 400); }
    if (!Array.isArray(remove)) throw new AppError("Image removal selection is invalid.", 400);
    const kept = (data.images || existing?.images || []).filter(image => !remove.includes(image.url));
    data.images = [...kept, ...uploadedImages.filter(image => !kept.some(keptImage => keptImage.url === image.url))];
  }
  return data;
};

const validateProduct = async (data, partial = false) => {
  const required = ["name", "description", "price", "category", "stock"];
  if (!partial && required.some(key => data[key] === undefined || data[key] === "")) throw new AppError("Name, description, price, category, and stock are required.", 400);
  if (data.name !== undefined && (data.name.length < 2 || data.name.length > 140)) throw new AppError("Product name must be between 2 and 140 characters.", 400);
  if (data.description !== undefined && (!data.description || data.description.length > 5000)) throw new AppError("Product description is required and must be under 5000 characters.", 400);
  if (data.subtitle !== undefined && data.subtitle.length > 160) throw new AppError("Subtitle cannot exceed 160 characters.", 400);
  if (data.prepTime !== undefined && data.prepTime.length > 60) throw new AppError("Preparation time cannot exceed 60 characters.", 400);
  if (data.price !== undefined && data.price <= 0) throw new AppError("Price must be greater than zero.", 400);
  if (data.compareAtPrice !== undefined && data.compareAtPrice !== null && data.compareAtPrice < data.price) throw new AppError("Original price must be equal to or greater than the sale price.", 400);
  if (data.stock !== undefined && (!Number.isInteger(data.stock) || data.stock > 1000000)) throw new AppError("Stock must be a whole number between 0 and 1,000,000.", 400);
  if (data.category !== undefined && (!mongoose.isValidObjectId(data.category) || !await Category.exists({ _id: data.category, isDeleted: false }))) throw new AppError("Select an active category.", 400);
  if (data.images && data.images.length > 8) throw new AppError("A product can have at most 8 images.", 400);
  if (data.images && data.images.length < 1) throw new AppError("Upload at least one product image.", 400);
};

export const listProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(48, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));
  const search = String(req.query.search || "").trim().slice(0, 100);
  const filter = { ...publicProductFilter };
  if (search) filter.$or = [{ name: { $regex: escaped(search), $options: "i" } }, { description: { $regex: escaped(search), $options: "i" } }];
  if (req.query.category) {
    const categoryIds = [...new Set(String(req.query.category).split(",").map(id => id.trim()).filter(Boolean))];
    if (!categoryIds.length || categoryIds.some(id => !mongoose.isValidObjectId(id))) throw new AppError("Select a valid category.", 400);
    filter.category = categoryIds.length === 1 ? categoryIds[0] : { $in: categoryIds };
  }
  if (req.query.dietaryTag) {
    const dietaryTag = String(req.query.dietaryTag).trim();
    if (!allowedDietaryTags.includes(dietaryTag)) throw new AppError("Select a valid dietary filter.", 400);
    filter.dietaryTags = dietaryTag;
  }
  if (req.query.dietaryTags !== undefined && req.query.dietaryTags !== "") {
    const dietaryTags = [...new Set(String(req.query.dietaryTags).split(",").map(tag => tag.trim()).filter(Boolean))];
    if (dietaryTags.length > allowedDietaryTags.length || dietaryTags.some(tag => !allowedDietaryTags.includes(tag))) throw new AppError("Select valid dietary filters.", 400);
    if (dietaryTags.length) filter.dietaryTags = { $all: dietaryTags };
  }
  const minPrice = req.query.minPrice === undefined || req.query.minPrice === "" ? null : Number(req.query.minPrice);
  const maxPrice = req.query.maxPrice === undefined || req.query.maxPrice === "" ? null : Number(req.query.maxPrice);
  if ((minPrice !== null && (!Number.isFinite(minPrice) || minPrice < 0)) || (maxPrice !== null && (!Number.isFinite(maxPrice) || maxPrice < 0))) throw new AppError("Price filters must be valid non-negative amounts.", 400);
  if (minPrice !== null || maxPrice !== null) filter.price = { ...(minPrice !== null ? { $gte: minPrice } : {}), ...(maxPrice !== null ? { $lte: maxPrice } : {}) };
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) throw new AppError("Minimum price cannot be greater than maximum price.", 400);
  filter.stock = { $gt: 0 };
  const sorts = { recent: { createdAt: -1 }, price_asc: { price: 1, name: 1 }, price_desc: { price: -1, name: 1 }, name_asc: { name: 1 }, name_desc: { name: -1 } };
  const sort = sorts[req.query.sort] || sorts.recent;
  const categoryFilter = { isDeleted: false };
  const [products, total] = await Promise.all([
    Product.find(filter).populate({ path: "category", match: categoryFilter, select: "name slug" }).sort(sort).skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter),
  ]);
  const available = products.filter(item => item.category);
  res.json({ success: true, products: available, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const listAdminProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
  const search = String(req.query.search || "").trim().slice(0, 100);
  const clauses = [{ isDeleted: false }];
  if (search) clauses.push({ $or: [{ name: { $regex: escaped(search), $options: "i" } }, { description: { $regex: escaped(search), $options: "i" } }, { subtitle: { $regex: escaped(search), $options: "i" } }] });
  if (req.query.category) {
    if (!mongoose.isValidObjectId(req.query.category)) throw new AppError("Select a valid category.", 400);
    clauses.push({ category: req.query.category });
  }
  if (req.query.availability === "active") clauses.push({ isPublished: true, isBlocked: false, stock: { $gt: 0 } });
  else if (req.query.availability === "inactive") clauses.push({ $or: [{ isPublished: false }, { isBlocked: true }, { stock: 0 }] });
  const filter = clauses.length === 1 ? clauses[0] : { $and: clauses };
  const [products, total] = await Promise.all([Product.find(filter).populate("category", "name").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Product.countDocuments(filter)]);
  res.json({ success: true, products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const getAdminCatalogStats = asyncHandler(async (req, res) => {
  const activeFilter = { isDeleted: false, isBlocked: false, isPublished: true, stock: { $gt: 0 } };
  const [totalMeals, activeMeals, lowStockMeals, priceStats] = await Promise.all([
    Product.countDocuments({ isDeleted: false }),
    Product.countDocuments(activeFilter),
    Product.countDocuments({ isDeleted: false, $or: [{ stock: { $lte: 5 } }, { isPublished: false }, { isBlocked: true }] }),
    Product.aggregate([{ $match: { isDeleted: false } }, { $group: { _id: null, average: { $avg: "$price" } } }]),
  ]);
  res.json({ success: true, stats: { totalMeals, activeMeals, lowStockMeals, averagePrice: Math.round(priceStats[0]?.average || 0) } });
});

export const getAdminProduct = asyncHandler(async (req, res) => {
  requireId(req.params.id, "Product");
  const product = await Product.findOne({ _id: req.params.id, isDeleted: false }).populate("category", "name");
  if (!product) throw new AppError("Product not found.", 404);
  res.json({ success: true, product });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ $and: [{ $or: [{ slug: req.params.slug }, ...(req.params.slug.match(/^[0-9a-f]{24}$/i) ? [{ _id: req.params.slug }] : [])] }, publicProductFilter] }).populate({ path: "category", match: { isDeleted: false }, select: "name slug" });
  if (!product?.category) throw new AppError("This product is unavailable.", 404);
  const relatedProducts = await Product.find({ ...publicProductFilter, stock: { $gt: 0 }, category: product.category._id, _id: { $ne: product._id } }).select("name slug price compareAtPrice images stock").limit(4);
  res.json({ success: true, product, relatedProducts });
});

export const createProduct = asyncHandler(async (req, res) => {
  try {
    const data = normalizeProductInput(req.body, req.files);
    await validateProduct(data);
    if (!data.images?.length) throw new AppError("Upload at least one product image.", 400);
    const product = await Product.create({ ...data, slug: makeSlug(data.name) });
    res.status(201).json({ success: true, product });
  } catch (error) {
    await removeUploadedProductFiles(req.files);
    throw error;
  }
});

export const updateProduct = asyncHandler(async (req, res) => {
  try {
    requireId(req.params.id, "Product");
    const product = await Product.findById(req.params.id);
    if (!product || product.isDeleted) throw new AppError("Product not found.", 404);
    const data = normalizeProductInput(req.body, req.files, product);
    if (data.compareAtPrice === undefined && req.body.compareAtPrice === "") data.compareAtPrice = null;
    await validateProduct({
      name: data.name ?? product.name,
      description: data.description ?? product.description,
      price: data.price ?? product.price,
      compareAtPrice: data.compareAtPrice === undefined ? product.compareAtPrice : data.compareAtPrice,
      category: data.category ?? (product.category?._id || product.category),
      stock: data.stock ?? product.stock,
      images: data.images ?? product.images,
    });
    if (data.name) data.slug = product.slug || makeSlug(data.name);
    Object.assign(product, data);
    await product.save();
    res.json({ success: true, product });
  } catch (error) {
    await removeUploadedProductFiles(req.files);
    throw error;
  }
});

export const deleteProduct = asyncHandler(async (req, res) => {
  requireId(req.params.id, "Product");
  const product = await Product.findById(req.params.id);
  if (!product || product.isDeleted) throw new AppError("Product not found.", 404);
  product.isDeleted = true;
  product.isPublished = false;
  await product.save();
  res.json({ success: true, message: "Product removed from the catalog." });
});

export const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate({ path: "items.product", populate: { path: "category", select: "name slug isDeleted" } });
  const items = (cart?.items || []).filter(item => item.product).map(item => ({ product: item.product, quantity: item.quantity, valid: !item.product.isDeleted && !item.product.isBlocked && item.product.isPublished && !item.product.category?.isDeleted && item.product.stock > 0 && item.quantity <= item.product.stock, lineTotal: item.product.price * item.quantity }));
  res.json({ success: true, items, total: items.reduce((sum, item) => sum + item.lineTotal, 0), valid: items.length > 0 && items.every(item => item.valid) });
});

export const addCartItem = asyncHandler(async (req, res) => {
  requireId(req.body.productId, "Product");
  const quantity = Number(req.body.quantity ?? 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new AppError("Quantity must be between 1 and 99.", 400);
  const product = await Product.findOne({ _id: req.body.productId, ...publicProductFilter }).populate({ path: "category", match: { isDeleted: false } });
  if (!product?.category || product.stock < 1) throw new AppError("This product is unavailable or out of stock.", 409);
  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) cart = new Cart({ user: req.user._id, items: [] });
  const item = cart.items.find(entry => entry.product.toString() === product._id.toString());
  const nextQuantity = (item?.quantity || 0) + quantity;
  if (nextQuantity > Math.min(product.stock, 99)) throw new AppError(`Only ${Math.min(product.stock, 99)} can be added.`, 409);
  if (item) item.quantity = nextQuantity;
  else cart.items.push({ product: product._id, quantity });
  await cart.save();
  const wishlist = await Wishlist.findOne({ user: req.user._id });
  if (wishlist) {
    wishlist.products = wishlist.products.filter(id => id.toString() !== product._id.toString());
    await wishlist.save();
  }
  res.json({ success: true, message: "Added to cart.", count: cart.items.reduce((sum, entry) => sum + entry.quantity, 0) });
});

export const updateCartItem = asyncHandler(async (req, res) => {
  requireId(req.params.productId, "Product");
  const quantity = Number(req.body.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new AppError("Quantity must be between 1 and 99.", 400);
  const product = await Product.findOne({ _id: req.params.productId, ...publicProductFilter });
  if (!product || product.stock < quantity) throw new AppError("Requested quantity is unavailable.", 409);
  const cart = await Cart.findOne({ user: req.user._id });
  const item = cart?.items.find(entry => entry.product.toString() === req.params.productId);
  if (!item) throw new AppError("Cart item not found.", 404);
  item.quantity = quantity;
  await cart.save();
  res.json({ success: true, message: "Cart updated." });
});

export const removeCartItem = asyncHandler(async (req, res) => {
  requireId(req.params.productId, "Product");
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) throw new AppError("Cart is empty.", 404);
  cart.items = cart.items.filter(item => item.product.toString() !== req.params.productId);
  await cart.save();
  res.json({ success: true, message: "Item removed from cart." });
});

export const validateCheckout = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate({ path: "items.product", populate: { path: "category", select: "isDeleted" } });
  if (!cart?.items.length) throw new AppError("Your cart is empty.", 400);
  const invalid = cart.items.filter(item => !item.product || item.product.isDeleted || item.product.isBlocked || !item.product.isPublished || item.product.category?.isDeleted || item.product.stock < item.quantity);
  if (invalid.length) throw new AppError("Some cart items are unavailable or have changed stock. Review your cart.", 409);
  res.json({ success: true, total: cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0), items: cart.items.map(item => ({ productId: item.product._id, name: item.product.name, price: item.product.price, quantity: item.quantity, lineTotal: item.product.price * item.quantity })) });
});

export const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id }).populate({ path: "products", match: publicProductFilter, populate: { path: "category", match: { isDeleted: false }, select: "name slug" } });
  res.json({ success: true, products: (wishlist?.products || []).filter(product => product.category) });
});

export const toggleWishlist = asyncHandler(async (req, res) => {
  requireId(req.params.productId, "Product");
  const product = await Product.findOne({ _id: req.params.productId, ...publicProductFilter, stock: { $gt: 0 } });
  if (!product || !await Category.exists({ _id: product.category, isDeleted: false })) throw new AppError("This product is unavailable.", 404);
  let wishlist = await Wishlist.findOne({ user: req.user._id });
  if (!wishlist) wishlist = new Wishlist({ user: req.user._id, products: [] });
  const exists = wishlist.products.some(id => id.toString() === product._id.toString());
  wishlist.products = exists ? wishlist.products.filter(id => id.toString() !== product._id.toString()) : [...wishlist.products, product._id];
  await wishlist.save();
  res.json({ success: true, added: !exists, message: exists ? "Removed from wishlist." : "Added to wishlist." });
});

export const removeWishlistItem = asyncHandler(async (req, res) => {
  requireId(req.params.productId, "Product");
  const wishlist = await Wishlist.findOne({ user: req.user._id });
  if (wishlist) { wishlist.products = wishlist.products.filter(id => id.toString() !== req.params.productId); await wishlist.save(); }
  res.json({ success: true, message: "Removed from wishlist." });
});

export const removeUploadedProductFiles = async (files = []) => {
  await Promise.all(files.map(file => fs.unlink(file.path).catch(() => {})));
};
