import crypto from "node:crypto";
import mongoose from "mongoose";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import AppError from "./AppError.js";
import { escapeRegex } from "./query.js";

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const makeSlug = (value) =>
  `${slugify(value) || "item"}-${crypto.randomBytes(3).toString("hex")}`;

export const booleanValue = (value, fallback = false) => {
  if (value === undefined) return fallback;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  throw new AppError(
    "Publication and block status values must be boolean.",
    400,
  );
};

export const publicProductFilter = {
  isPublished: true,
  isDeleted: false,
  isBlocked: false,
};

export const allowedDietaryTags = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "High Protein",
  "Dairy-Free",
  "Keto Friendly",
  "Nut-Free",
  "Organic",
];

export function requireId(id, label) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(`${label} not found.`, 404);
  }
}

export function isOrderableProduct(product, quantity = 1) {
  return Boolean(
    product &&
    !product.isDeleted &&
    !product.isBlocked &&
    product.isPublished &&
    product.category &&
    !product.category.isDeleted &&
    product.category.isActive !== false &&
    product.stock >= quantity &&
    product.stock > 0,
  );
}

export function findOrderableProduct(productId, quantity = 1) {
  return Product.findOne({
    _id: productId,
    ...publicProductFilter,
    stock: { $gte: quantity },
  }).populate({
    path: "category",
    match: { isDeleted: false, isActive: { $ne: false } },
  });
}

export async function ensureUniqueMealDetails(name, description, excludeId) {
  const duplicate = await Product.exists({
    isDeleted: false,
    $or: [
      { name: { $regex: `^${escapeRegex(name)}$`, $options: "i" } },
      {
        description: { $regex: `^${escapeRegex(description)}$`, $options: "i" },
      },
    ],
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  });
  if (duplicate) {
    throw new AppError(
      "A meal with this name or description already exists.",
      409,
    );
  }
}

export async function ensureUniqueCategoryDetails(
  name,
  description,
  excludeId,
) {
  const duplicateConditions = [
    { name: { $regex: `^${escapeRegex(name)}$`, $options: "i" } },
  ];
  if (description.trim()) {
    duplicateConditions.push({
      description: { $regex: `^${escapeRegex(description)}$`, $options: "i" },
    });
  }
  const duplicate = await Category.exists({
    isDeleted: false,
    $or: duplicateConditions,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  });
  if (duplicate) {
    throw new AppError(
      "A category with this name or description already exists.",
      409,
    );
  }
}
