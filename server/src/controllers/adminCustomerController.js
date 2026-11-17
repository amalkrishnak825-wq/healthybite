import User from "../models/User.js";
import Address from "../models/Address.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { isValidIndianPhone, isValidPersonName } from "../utils/inputValidation.js";
import {
  escapeRegex,
  paginationMetadata,
  parsePagination,
} from "../utils/query.js";

export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit } = parsePagination(req.query, {
    defaultLimit: 10,
    maxLimit: 50,
  });
  const search = String(req.query.search || "")
    .trim()
    .slice(0, 100);
  const filter = {
    role: "customer",
    ...(req.query.status === "active"
      ? { isBlocked: false }
      : req.query.status === "deactivated"
        ? { isBlocked: true }
        : {}),
    ...(search
      ? {
          $or: [
            { name: { $regex: escapeRegex(search), $options: "i" } },
            { email: { $regex: escapeRegex(search), $options: "i" } },
            { phone: { $regex: escapeRegex(search), $options: "i" } },
          ],
        }
      : {}),
  };
  const [users, total] = await Promise.all([
    User.find(filter)
      .select("name email phone isVerified isBlocked createdAt profileImage")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({
    success: true,
    users,
    pagination: paginationMetadata(page, limit, total),
  });
});

export const customerSummary = asyncHandler(async (req, res) => {
  const [total, active, deactivated, verified] = await Promise.all([
    User.countDocuments({ role: "customer" }),
    User.countDocuments({ role: "customer", isBlocked: false }),
    User.countDocuments({ role: "customer", isBlocked: true }),
    User.countDocuments({ role: "customer", isVerified: true }),
  ]);
  res.json({
    success: true,
    summary: { total, active, deactivated, verified },
  });
});

export const getCustomer = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    _id: req.params.id,
    role: "customer",
  }).select("name email phone isVerified isBlocked createdAt profileImage");
  if (!user) throw new AppError("Customer not found.", 404);
  const address = await Address.findOne({ user: user._id }).sort({
    isDefault: -1,
    createdAt: -1,
  });
  res.json({ success: true, customer: { ...user.toObject(), address } });
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  if (name === undefined && phone === undefined)
    throw new AppError("Provide a customer name or phone number.", 400);
  if (
    name !== undefined &&
    !isValidPersonName(name, { max: 50 })
  )
    throw new AppError("Name must be between 2 and 50 characters.", 400);
  if (
    phone !== undefined &&
    phone !== "" &&
    !isValidIndianPhone(String(phone).trim())
  )
    throw new AppError("Enter a valid 10-digit Indian mobile number.", 400);
  const customer = await User.findOne({ _id: req.params.id, role: "customer" });
  if (!customer) throw new AppError("Customer not found.", 404);
  if (name !== undefined) customer.name = name.trim();
  if (phone !== undefined) customer.phone = phone.trim();
  await customer.save();
  res.json({
    success: true,
    message: "Customer updated successfully.",
    customer: {
      id: customer._id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      isVerified: customer.isVerified,
      isBlocked: customer.isBlocked,
      profileImage: customer.profileImage,
      createdAt: customer.createdAt,
    },
  });
});

export const setUserBlocked = asyncHandler(async (req, res) => {
  if (typeof req.body.isBlocked !== "boolean")
    throw new AppError("isBlocked must be a boolean.", 400);
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, role: "customer" },
    { isBlocked: req.body.isBlocked },
    { new: true, runValidators: true },
  ).select("name email isBlocked");
  if (!user) throw new AppError("Customer not found.", 404);
  res.json({
    success: true,
    user,
    message: user.isBlocked ? "Customer blocked." : "Customer unblocked.",
  });
});
