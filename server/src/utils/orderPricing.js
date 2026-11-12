import AppError from "./AppError.js";
import Coupon from "../models/Coupon.js";
import Order from "../models/Order.js";

const roundMoney = (amount) => Math.round((amount + Number.EPSILON) * 100) / 100;

export async function priceOrder(items, couponCode = "", userId, { excludeOrderId } = {}) {
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.product.price * item.quantity, 0));
  const shipping = subtotal >= 500 ? 0 : 40;
  const tax = roundMoney(subtotal * 0.05);
  let discount = 0;
  const normalizedCode = String(couponCode || "").trim().toUpperCase();

  if (normalizedCode) {
    const coupon = await Coupon.findOne({ code: normalizedCode });
    const resolvedCoupon = coupon || (normalizedCode === "BITE10"
      ? { discountType: "percent", discountValue: 10, minimumSubtotal: 500, maximumDiscount: 100, expiresAt: null }
      : null);
    if (!resolvedCoupon || resolvedCoupon.isActive === false || (resolvedCoupon.expiresAt && resolvedCoupon.expiresAt <= new Date())) {
      throw new AppError("That coupon code is not valid or has expired.", 400);
    }
    if (subtotal < resolvedCoupon.minimumSubtotal) {
      throw new AppError(`This coupon applies to orders of ₹${resolvedCoupon.minimumSubtotal} or more.`, 400);
    }
    if (resolvedCoupon.maxUsesPerUser != null && userId) {
      const usageFilter = {
        user: userId,
        "pricing.couponCode": normalizedCode,
        status: { $ne: "cancelled" },
        paymentStatus: { $in: ["paid", "not_required"] },
        ...(excludeOrderId ? { _id: { $ne: excludeOrderId } } : {}),
      };
      const uses = await Order.countDocuments(usageFilter);
      if (uses >= resolvedCoupon.maxUsesPerUser) {
        throw new AppError("You have reached the usage limit for this coupon.", 400);
      }
    }
    discount = resolvedCoupon.discountType === "percent"
      ? roundMoney(subtotal * resolvedCoupon.discountValue / 100)
      : resolvedCoupon.discountValue;
    if (resolvedCoupon.maximumDiscount) discount = Math.min(discount, resolvedCoupon.maximumDiscount);
    discount = Math.min(discount, subtotal);
  }

  return {
    subtotal,
    shipping,
    tax,
    discount,
    couponCode: normalizedCode,
    total: roundMoney(subtotal + shipping + tax - discount),
  };
}
