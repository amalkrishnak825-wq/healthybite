import mongoose from "mongoose";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  deleteCloudinaryImages,
  uploadProductImages,
} from "../config/cloudinary.js";
import {
  allowedDietaryTags,
  booleanValue,
  ensureUniqueMealDetails,
  makeSlug,
  publicProductFilter,
  requireId,
} from "../utils/catalog.js";
import {
  escapeRegex,
  paginationMetadata,
  parsePagination,
} from "../utils/query.js";

const normalizeProductInput = (body, uploadedImages = [], existing = null) => {
  const data = {};
  for (const key of ["name", "description", "category", "subtitle", "prepTime"])
    if (body[key] !== undefined) data[key] = String(body[key]).trim();
  for (const key of ["price", "stock", "compareAtPrice"]) {
    if (body[key] !== undefined && body[key] !== "") {
      const value = Number(body[key]);
      if (
        !Number.isFinite(value) ||
        value < 0 ||
        (key === "stock" && (!Number.isInteger(value) || value > 1000000)) ||
        (key !== "stock" && value > 100000000)
      )
        throw new AppError(
          `${key} must be a valid non-negative ${key === "stock" ? "whole number" : "amount"}.`,
          400,
        );
      data[key] = value;
    }
  }
  if (body.highlights !== undefined) {
    try {
      data.highlights = JSON.parse(body.highlights);
    } catch {
      throw new AppError("Product highlights are invalid.", 400);
    }
    if (
      !Array.isArray(data.highlights) ||
      data.highlights.length > 12 ||
      data.highlights.some(
        (item) => typeof item !== "string" || item.trim().length > 160,
      )
    )
      throw new AppError("Add up to 12 valid product highlights.", 400);
    data.highlights = data.highlights
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (body.dietaryTags !== undefined) {
    try {
      data.dietaryTags = JSON.parse(body.dietaryTags);
    } catch {
      throw new AppError("Dietary tags are invalid.", 400);
    }
    const allowed = allowedDietaryTags;
    if (
      !Array.isArray(data.dietaryTags) ||
      data.dietaryTags.length > allowed.length ||
      data.dietaryTags.some((tag) => !allowed.includes(tag))
    )
      throw new AppError("Select valid dietary tags.", 400);
  }
  if (body.nutrition !== undefined) {
    try {
      data.nutrition = JSON.parse(body.nutrition);
    } catch {
      throw new AppError("Nutritional information is invalid.", 400);
    }
    const keys = ["calories", "protein", "carbs", "fats"];
    if (
      !data.nutrition ||
      typeof data.nutrition !== "object" ||
      Array.isArray(data.nutrition) ||
      Object.keys(data.nutrition).some((key) => !keys.includes(key))
    )
      throw new AppError("Nutritional information is invalid.", 400);
    data.nutrition = Object.fromEntries(
      keys.map((key) => {
        const value = data.nutrition[key];
        if (value === "" || value === null || value === undefined)
          return [key, null];
        const number = Number(value);
        if (!Number.isFinite(number) || number < 0 || number > 100000)
          throw new AppError(
            `${key} must be a valid non-negative amount.`,
            400,
          );
        return [key, number];
      }),
    );
  }
  if (body.isPublished !== undefined)
    data.isPublished = booleanValue(body.isPublished);
  if (body.isFeatured !== undefined)
    data.isFeatured = booleanValue(body.isFeatured);
  if (body.isBlocked !== undefined)
    data.isBlocked = booleanValue(body.isBlocked);
  const imageRecords = uploadedImages.map((image) => ({
    url: image.url,
    publicId: image.publicId,
    alt: "",
  }));
  if (imageRecords.length)
    data.images = [...(existing?.images || []), ...imageRecords];
  if (body.removeImages !== undefined) {
    let remove = [];
    try {
      remove = JSON.parse(body.removeImages);
    } catch {
      throw new AppError("Image removal selection is invalid.", 400);
    }
    if (!Array.isArray(remove))
      throw new AppError("Image removal selection is invalid.", 400);
    const kept = (data.images || existing?.images || []).filter(
      (image) => !remove.includes(image.url),
    );
    data.images = [
      ...kept,
      ...imageRecords.filter(
        (image) => !kept.some((keptImage) => keptImage.url === image.url),
      ),
    ];
  }
  return data;
};

const validateProduct = async (data, partial = false) => {
  const required = ["name", "description", "price", "category", "stock"];
  if (
    !partial &&
    required.some((key) => data[key] === undefined || data[key] === "")
  )
    throw new AppError(
      "Name, description, price, category, and stock are required.",
      400,
    );
  if (
    data.name !== undefined &&
    (data.name.length < 2 || data.name.length > 140)
  )
    throw new AppError(
      "Product name must be between 2 and 140 characters.",
      400,
    );
  if (
    data.description !== undefined &&
    (!data.description || data.description.length > 5000)
  )
    throw new AppError(
      "Product description is required and must be under 5000 characters.",
      400,
    );
  if (data.subtitle !== undefined && data.subtitle.length > 160)
    throw new AppError("Subtitle cannot exceed 160 characters.", 400);
  if (data.prepTime !== undefined && data.prepTime.length > 60)
    throw new AppError("Preparation time cannot exceed 60 characters.", 400);
  if (data.price !== undefined && data.price <= 0)
    throw new AppError("Price must be greater than zero.", 400);
  if (
    data.compareAtPrice !== undefined &&
    data.compareAtPrice !== null &&
    data.compareAtPrice < data.price
  )
    throw new AppError(
      "Original price must be equal to or greater than the sale price.",
      400,
    );
  if (
    data.stock !== undefined &&
    (!Number.isInteger(data.stock) || data.stock > 1000000)
  )
    throw new AppError(
      "Stock must be a whole number between 0 and 1,000,000.",
      400,
    );
  if (
    data.category !== undefined &&
    (!mongoose.isValidObjectId(data.category) ||
      !(await Category.exists({
        _id: data.category,
        isDeleted: false,
        isActive: { $ne: false },
      })))
  )
    throw new AppError("Select an active category.", 400);
  if (data.images && data.images.length > 5)
    throw new AppError("A meal can have at most 5 images.", 400);
  if (data.images && data.images.length < 1)
    throw new AppError("Upload at least one meal image.", 400);
};

export const listProducts = asyncHandler(async (req, res) => {
  const { page, limit } = parsePagination(req.query, {
    defaultLimit: 8,
    maxLimit: 8,
  });
  const search = String(req.query.search || "")
    .trim()
    .slice(0, 100);
  const filter = { ...publicProductFilter };
  if (req.query.featured === "true") {
    filter.$and = [
      ...(filter.$and || []),
      { $or: [{ isFeatured: true }, { isFeatured: { $exists: false } }] },
    ];
  }
  if (search)
    filter.$or = [
      { name: { $regex: escapeRegex(search), $options: "i" } },
      { description: { $regex: escapeRegex(search), $options: "i" } },
    ];
  if (req.query.category) {
    const categoryIds = [
      ...new Set(
        String(req.query.category)
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ];
    if (
      !categoryIds.length ||
      categoryIds.some((id) => !mongoose.isValidObjectId(id))
    )
      throw new AppError("Select a valid category.", 400);
    filter.category =
      categoryIds.length === 1 ? categoryIds[0] : { $in: categoryIds };
  }
  if (req.query.dietaryTag) {
    const dietaryTag = String(req.query.dietaryTag).trim();
    if (!allowedDietaryTags.includes(dietaryTag))
      throw new AppError("Select a valid dietary filter.", 400);
    filter.dietaryTags = dietaryTag;
  }
  if (req.query.dietaryTags !== undefined && req.query.dietaryTags !== "") {
    const dietaryTags = [
      ...new Set(
        String(req.query.dietaryTags)
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    ];
    if (
      dietaryTags.length > allowedDietaryTags.length ||
      dietaryTags.some((tag) => !allowedDietaryTags.includes(tag))
    )
      throw new AppError("Select valid dietary filters.", 400);
    if (dietaryTags.length) filter.dietaryTags = { $all: dietaryTags };
  }
  const minPrice =
    req.query.minPrice === undefined || req.query.minPrice === ""
      ? null
      : Number(req.query.minPrice);
  const maxPrice =
    req.query.maxPrice === undefined || req.query.maxPrice === ""
      ? null
      : Number(req.query.maxPrice);
  if (
    (minPrice !== null && (!Number.isFinite(minPrice) || minPrice < 0)) ||
    (maxPrice !== null && (!Number.isFinite(maxPrice) || maxPrice < 0))
  )
    throw new AppError(
      "Price filters must be valid non-negative amounts.",
      400,
    );
  if (minPrice !== null || maxPrice !== null)
    filter.price = {
      ...(minPrice !== null ? { $gte: minPrice } : {}),
      ...(maxPrice !== null ? { $lte: maxPrice } : {}),
    };
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice)
    throw new AppError(
      "Minimum price cannot be greater than maximum price.",
      400,
    );
  // Keep published meals visible when inventory reaches zero so customers can
  // see their out-of-stock status; cart and checkout still enforce stock.
  const sorts = {
    recent: { createdAt: -1 },
    price_asc: { price: 1, name: 1 },
    price_desc: { price: -1, name: 1 },
    name_asc: { name: 1 },
    name_desc: { name: -1 },
  };
  const sort = sorts[req.query.sort] || sorts.recent;
  const activeCategoryIds = await Category.distinct("_id", {
    isDeleted: false,
    isActive: { $ne: false },
  });
  const requestedCategoryIds = filter.category
    ? new Set(
        (Array.isArray(filter.category.$in)
          ? filter.category.$in
          : [filter.category]
        ).map(String),
      )
    : null;
  filter.category = {
    $in: requestedCategoryIds
      ? activeCategoryIds.filter((id) => requestedCategoryIds.has(String(id)))
      : activeCategoryIds,
  };
  const categoryFilter = {
    isDeleted: false,
    isActive: { $ne: false },
  };
  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate({
        path: "category",
        match: categoryFilter,
        select: "name slug",
      })
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);
  const available = products.filter((item) => item.category);
  res.json({
    success: true,
    products: available,
    pagination: paginationMetadata(page, limit, total),
  });
});

export const listAdminProducts = asyncHandler(async (req, res) => {
  const { page, limit } = parsePagination(req.query, {
    defaultLimit: 10,
    maxLimit: 50,
  });
  const search = String(req.query.search || "")
    .trim()
    .slice(0, 100);
  const clauses = [{ isDeleted: false }];
  if (search)
    clauses.push({
      $or: [
        { name: { $regex: escapeRegex(search), $options: "i" } },
        { description: { $regex: escapeRegex(search), $options: "i" } },
        { subtitle: { $regex: escapeRegex(search), $options: "i" } },
      ],
    });
  if (req.query.category) {
    if (!mongoose.isValidObjectId(req.query.category))
      throw new AppError("Select a valid category.", 400);
    clauses.push({ category: req.query.category });
  }
  if (req.query.availability === "active")
    clauses.push({ isPublished: true, isBlocked: false, stock: { $gt: 0 } });
  else if (req.query.availability === "inactive")
    clauses.push({
      $or: [{ isPublished: false }, { isBlocked: true }, { stock: 0 }],
    });
  const filter = clauses.length === 1 ? clauses[0] : { $and: clauses };
  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("category", "name isActive")
      .sort({ isPublished: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);
  res.json({
    success: true,
    products,
    pagination: paginationMetadata(page, limit, total),
  });
});

export const getAdminCatalogStats = asyncHandler(async (req, res) => {
  const activeFilter = {
    isDeleted: false,
    isBlocked: false,
    isPublished: true,
    stock: { $gt: 0 },
  };
  const [totalMeals, activeMeals, inactiveMeals, lowStockMeals, priceStats] =
    await Promise.all([
      Product.countDocuments({ isDeleted: false }),
      Product.countDocuments(activeFilter),
      Product.countDocuments({
        isDeleted: false,
        $or: [{ isPublished: false }, { isBlocked: true }, { stock: 0 }],
      }),
      Product.countDocuments({
        isDeleted: false,
        $or: [
          { stock: { $lte: 5 } },
          { isPublished: false },
          { isBlocked: true },
        ],
      }),
      Product.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: null, average: { $avg: "$price" } } },
      ]),
    ]);
  res.json({
    success: true,
    stats: {
      totalMeals,
      activeMeals,
      inactiveMeals,
      lowStockMeals,
      averagePrice: Math.round(priceStats[0]?.average || 0),
    },
  });
});

export const getAdminProduct = asyncHandler(async (req, res) => {
  requireId(req.params.id, "Product");
  const product = await Product.findOne({
    _id: req.params.id,
    isDeleted: false,
  }).populate("category", "name isActive");
  if (!product) throw new AppError("Product not found.", 404);
  res.json({ success: true, product });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    $and: [
      {
        $or: [
          { slug: req.params.slug },
          ...(req.params.slug.match(/^[0-9a-f]{24}$/i)
            ? [{ _id: req.params.slug }]
            : []),
        ],
      },
      publicProductFilter,
    ],
  }).populate({
    path: "category",
    match: { isDeleted: false, isActive: { $ne: false } },
    select: "name slug",
  });
  if (!product?.category)
    throw new AppError("This product is unavailable.", 404);
  const relatedProducts = await Product.find({
    ...publicProductFilter,
    stock: { $gt: 0 },
    category: product.category._id,
    _id: { $ne: product._id },
  })
    .select("name slug price compareAtPrice images stock")
    .limit(4);
  res.json({ success: true, product, relatedProducts });
});

export const createProduct = asyncHandler(async (req, res) => {
  let uploadedImages = [];
  try {
    uploadedImages = await uploadProductImages(req.files);
    const data = normalizeProductInput(req.body, uploadedImages);
    await validateProduct(data);
    await ensureUniqueMealDetails(data.name, data.description);
    if (!data.images?.length)
      throw new AppError("Upload at least one meal image.", 400);
    const product = await Product.create({
      ...data,
      slug: makeSlug(data.name),
    });
    res.status(201).json({ success: true, product });
  } catch (error) {
    await deleteCloudinaryImages(uploadedImages);
    throw error;
  }
});

export const updateProduct = asyncHandler(async (req, res) => {
  let uploadedImages = [];
  let removedImages = [];
  try {
    requireId(req.params.id, "Product");
    const product = await Product.findById(req.params.id);
    if (!product || product.isDeleted)
      throw new AppError("Product not found.", 404);
    uploadedImages = await uploadProductImages(req.files);
    const data = normalizeProductInput(req.body, uploadedImages, product);
    const nextName = data.name ?? product.name;
    const nextDescription = data.description ?? product.description;
    if (nextName !== product.name || nextDescription !== product.description)
      await ensureUniqueMealDetails(nextName, nextDescription, product._id);
    if (data.compareAtPrice === undefined && req.body.compareAtPrice === "")
      data.compareAtPrice = null;
    await validateProduct({
      name: data.name ?? product.name,
      description: data.description ?? product.description,
      price: data.price ?? product.price,
      compareAtPrice:
        data.compareAtPrice === undefined
          ? product.compareAtPrice
          : data.compareAtPrice,
      category: data.category ?? (product.category?._id || product.category),
      stock: data.stock ?? product.stock,
      images: data.images ?? product.images,
    });
    const previousImages = product.images || [];
    if (data.name) data.slug = product.slug || makeSlug(data.name);
    Object.assign(product, data);
    await product.save();
    removedImages = previousImages.filter(
      (image) =>
        !product.images.some((savedImage) => savedImage.url === image.url),
    );
    await deleteCloudinaryImages(removedImages);
    res.json({ success: true, product });
  } catch (error) {
    await deleteCloudinaryImages(uploadedImages);
    throw error;
  }
});

export const deleteProduct = asyncHandler(async (req, res) => {
  requireId(req.params.id, "Product");
  const product = await Product.findById(req.params.id);
  if (!product || product.isDeleted)
    throw new AppError("Product not found.", 404);
  product.isDeleted = true;
  product.isPublished = false;
  await product.save();
  res.json({ success: true, message: "Product removed from the catalog." });
});
