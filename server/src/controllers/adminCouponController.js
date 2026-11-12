import Coupon from "../models/Coupon.js";
import Order from "../models/Order.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";

const defaultCoupon = {
  code: "BITE10",
  discountType: "percent",
  discountValue: 10,
  minimumSubtotal: 500,
  maximumDiscount: 100,
  isActive: true,
};

export const listAdminCoupons = asyncHandler(async (_req, res) => {
  try {
    await Coupon.updateOne(
      { code: defaultCoupon.code },
      { $setOnInsert: defaultCoupon },
      { upsert: true },
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
  const [coupons, usageTotals] = await Promise.all([
    Coupon.find().sort({ createdAt: -1 }),
    // Only count coupon uses on orders that were successfully paid or placed COD.
    // Cancelled and failed/unpaid payment attempts do not consume a coupon use.
    Order.aggregate([
      {
        $match: {
          "pricing.couponCode": { $exists: true, $ne: "" },
          status: { $ne: "cancelled" },
          paymentStatus: { $in: ["paid", "not_required"] },
        },
      },
      { $group: { _id: "$pricing.couponCode", count: { $sum: 1 } } },
    ]),
  ]);
  const usageByCode = new Map(usageTotals.map(({ _id, count }) => [_id, count]));
  const couponsWithUsage = coupons.map((coupon) => ({
    ...coupon.toObject(),
    usageCount: usageByCode.get(coupon.code) || 0,
  }));
  res.json({ success: true, coupons: couponsWithUsage });
});

function readCoupon(body, existing = {}) {
  const code = String(body.code ?? existing.code ?? "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z0-9_-]{3,24}$/.test(code)) {
    throw new AppError("Coupon code must be 3–24 letters, numbers, hyphens, or underscores.", 400);
  }

  const discountType = body.discountType ?? existing.discountType ?? "percent";
  if (!["percent", "fixed"].includes(discountType)) {
    throw new AppError("Choose a percentage or fixed discount.", 400);
  }

  const discountValue = Number(body.discountValue ?? existing.discountValue);
  const minimumSubtotal = Number(body.minimumSubtotal ?? existing.minimumSubtotal ?? 0);
  const maximumDiscountInput = body.maximumDiscount !== undefined
    ? body.maximumDiscount
    : existing.maximumDiscount ?? "";
  const maximumDiscount = maximumDiscountInput === "" ? null : Number(maximumDiscountInput);
  const maxUsesPerUserInput = body.maxUsesPerUser !== undefined
    ? body.maxUsesPerUser
    : existing.maxUsesPerUser ?? "";
  const maxUsesPerUser = maxUsesPerUserInput === "" || maxUsesPerUserInput === null
    ? null
    : Number(maxUsesPerUserInput);
  const expiresAtInput = body.expiresAt !== undefined
    ? body.expiresAt
    : existing.expiresAt ?? "";
  const expiresAt = expiresAtInput ? new Date(expiresAtInput) : null;

  if (!Number.isFinite(discountValue) || discountValue <= 0 || (discountType === "percent" && discountValue > 100)) {
    throw new AppError("Discount must be greater than 0 and cannot exceed 100%.", 400);
  }
  if (!Number.isFinite(minimumSubtotal) || minimumSubtotal < 0) {
    throw new AppError("Minimum order amount must be zero or more.", 400);
  }
  if (maximumDiscount !== null && (!Number.isFinite(maximumDiscount) || maximumDiscount <= 0)) {
    throw new AppError("Maximum discount must be greater than zero or left blank.", 400);
  }
  if (maxUsesPerUser !== null && (!Number.isInteger(maxUsesPerUser) || maxUsesPerUser < 1)) {
    throw new AppError("User limit must be a whole number greater than zero, or left blank.", 400);
  }
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    throw new AppError("Enter a valid coupon expiry date.", 400);
  }
  if (expiresAt && /^\d{4}-\d{2}-\d{2}$/.test(String(expiresAtInput))) {
    expiresAt.setUTCHours(23, 59, 59, 999);
  }

  return { code, discountType, discountValue, minimumSubtotal, maximumDiscount, maxUsesPerUser, expiresAt };
}

export const createAdminCoupon = asyncHandler(async (req, res) => {
  if (req.body.isActive !== undefined && typeof req.body.isActive !== "boolean") {
    throw new AppError("Coupon status must be active or inactive.", 400);
  }
  const coupon = await Coupon.create({ ...readCoupon(req.body), isActive: req.body.isActive ?? true });
  res.status(201).json({ success: true, coupon });
});

export const updateAdminCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw new AppError("Coupon not found.", 404);

  if (req.body.isActive !== undefined) {
    if (typeof req.body.isActive !== "boolean") throw new AppError("Coupon status must be active or inactive.", 400);
    coupon.isActive = req.body.isActive;
  }
  if (["code", "discountType", "discountValue", "minimumSubtotal", "maximumDiscount", "maxUsesPerUser", "expiresAt"].some((key) => req.body[key] !== undefined)) {
    Object.assign(coupon, readCoupon(req.body, coupon));
  }

  await coupon.save();
  res.json({ success: true, coupon });
});
