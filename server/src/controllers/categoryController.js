import Category from "../models/Category.js";
import Product from "../models/Product.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  booleanValue,
  ensureUniqueCategoryDetails,
  makeSlug,
  requireId,
} from "../utils/catalog.js";
import {
  escapeRegex,
  paginationMetadata,
  parsePagination,
} from "../utils/query.js";

export const listCategories = asyncHandler(async (req, res) => {
  const { page, limit } = parsePagination(req.query, {
    defaultLimit: 50,
    maxLimit: 50,
  });
  const search = String(req.query.search || "")
    .trim()
    .slice(0, 80);
  const filter = {
    isDeleted: false,
    isActive: { $ne: false },
    ...(search
      ? {
          $or: [
            { name: { $regex: escapeRegex(search), $options: "i" } },
            { description: { $regex: escapeRegex(search), $options: "i" } },
          ],
        }
      : {}),
  };
  const [categories, total] = await Promise.all([
    Category.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Category.countDocuments(filter),
  ]);
  res.json({
    success: true,
    categories,
    pagination: paginationMetadata(page, limit, total),
  });
});

export const listAdminCategories = asyncHandler(async (req, res) => {
  const { page, limit } = parsePagination(req.query, {
    defaultLimit: 10,
    maxLimit: 50,
  });
  const search = String(req.query.search || "")
    .trim()
    .slice(0, 80);
  const filter = search
    ? {
        $or: [
          { name: { $regex: escapeRegex(search), $options: "i" } },
          { description: { $regex: escapeRegex(search), $options: "i" } },
        ],
      }
    : {};
  const [categories, total] = await Promise.all([
    Category.find(filter)
      .sort({ isDeleted: 1, isActive: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Category.countDocuments(filter),
  ]);
  res.json({
    success: true,
    categories,
    pagination: paginationMetadata(page, limit, total),
  });
});

export const createCategory = asyncHandler(async (req, res) => {
  const { name, description = "" } = req.body;
  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.trim().length > 80
  )
    throw new AppError(
      "Category name must be between 2 and 80 characters.",
      400,
    );
  if (typeof description !== "string" || description.length > 500)
    throw new AppError(
      "Category description cannot exceed 500 characters.",
      400,
    );
  await ensureUniqueCategoryDetails(name.trim(), description.trim());
  const category = await Category.create({
    name: name.trim(),
    description: description.trim(),
    slug: makeSlug(name),
  });
  res.status(201).json({ success: true, category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  requireId(req.params.id, "Category");
  const category = await Category.findById(req.params.id);
  if (!category || category.isDeleted)
    throw new AppError("Category not found.", 404);
  const { name, description, isActive } = req.body;
  if (name !== undefined) {
    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      name.trim().length > 80
    )
      throw new AppError(
        "Category name must be between 2 and 80 characters.",
        400,
      );
    category.name = name.trim();
    category.slug = makeSlug(name);
  }
  if (description !== undefined) {
    if (typeof description !== "string" || description.length > 500)
      throw new AppError(
        "Category description cannot exceed 500 characters.",
        400,
      );
    category.description = description.trim();
  }
  if (isActive !== undefined) {
    if (typeof isActive !== "boolean")
      throw new AppError("Category status must be boolean.", 400);
    category.isActive = isActive;
  }
  if (name !== undefined || description !== undefined)
    await ensureUniqueCategoryDetails(
      category.name,
      category.description,
      category._id,
    );
  await category.save();
  res.json({ success: true, category });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  requireId(req.params.id, "Category");
  const category = await Category.findById(req.params.id);
  if (!category || category.isDeleted)
    throw new AppError("Category not found.", 404);
  category.isDeleted = true;
  category.isActive = false;
  await category.save();
  await Product.updateMany(
    { category: category._id, isDeleted: false },
    { $set: { isDeleted: true, isPublished: false } },
  );
  res.json({
    success: true,
    message: "Category and its products were removed from the catalog.",
  });
});
