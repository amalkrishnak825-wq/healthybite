import mongoose from "mongoose";
import Order from "../models/Order.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { escapeRegex, paginationMetadata, parsePagination } from "../utils/query.js";
import { requireId } from "../utils/catalog.js";
import { creditWallet } from "../utils/wallet.js";

const deliveredOrderStatuses = ["delivered", "return_requested", "return_accepted"];
const revenueFilter = {
  $or: [
    { paymentMethod: { $in: ["razorpay", "wallet"] }, paymentStatus: "paid", status: { $ne: "cancelled" } },
    { paymentMethod: "cod", paymentStatus: "not_required", status: { $in: deliveredOrderStatuses } },
  ],
};
const collectedRevenueExpression = {
  $or: [
    { $and: [
      { $in: ["$paymentMethod", ["razorpay", "wallet"]] },
      { $eq: ["$paymentStatus", "paid"] },
      { $ne: ["$status", "cancelled"] },
    ] },
    { $and: [
      { $eq: ["$paymentMethod", "cod"] },
      { $eq: ["$paymentStatus", "not_required"] },
      { $in: ["$status", deliveredOrderStatuses] },
    ] },
  ],
};

export const listAdminOrders = asyncHandler(async (req, res) => {
  const { page, limit } = parsePagination(req.query, { defaultLimit: 8, maxLimit: 8 });
  const search = String(req.query.search || "").trim().slice(0, 100);
  const status = String(req.query.status || "");
  const paymentStatus = String(req.query.paymentStatus || "");
  const filter = {};

  if (["placed", "out_for_delivery", "awaiting_payment", "payment_failed", "delivered", "return_requested", "return_accepted", "cancelled"].includes(status)) filter.status = status;
  if (["pending", "paid", "failed", "not_required"].includes(paymentStatus)) filter.paymentStatus = paymentStatus;
  if (search) {
    const matchingUsers = await User.find({
      $or: [
        { name: { $regex: escapeRegex(search), $options: "i" } },
        { email: { $regex: escapeRegex(search), $options: "i" } },
      ],
    }).select("_id").limit(100);
    const searchOptions = [{ "address.fullName": { $regex: escapeRegex(search), $options: "i" } }];
    if (matchingUsers.length) searchOptions.push({ user: { $in: matchingUsers.map(({ _id }) => _id) } });
    if (mongoose.isValidObjectId(search)) searchOptions.push({ _id: search });
    filter.$or = searchOptions;
  }

  const [orders, total, revenue, count] = await Promise.all([
    Order.find(filter)
      .populate("user", "name email phone")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments(filter),
    Order.aggregate([{ $match: revenueFilter }, { $group: { _id: null, total: { $sum: "$pricing.total" } } }]),
    Order.countDocuments(),
  ]);

  res.json({
    success: true,
    orders,
    pagination: paginationMetadata(page, limit, total),
    summary: { totalOrders: count, revenue: revenue[0]?.total || 0 },
  });
});

export const getAdminOrder = asyncHandler(async (req, res) => {
  requireId(req.params.id, "Order");
  const order = await Order.findById(req.params.id).populate("user", "name email phone");
  if (!order) throw new AppError("Order not found.", 404);
  res.json({ success: true, order });
});

export const acceptReturnRequest = asyncHandler(async (req, res) => {
  requireId(req.params.id, "Order");
  let order = await Order.findById(req.params.id);
  if (!order) throw new AppError("Order not found.", 404);
  if (order.status === "return_requested") {
    const returnedSubtotal = order.returnRequest.items.reduce((sum, returned) => {
      const line = order.items[returned.orderItemIndex];
      return sum + (line ? (line.unitPrice * returned.quantity) : 0);
    }, 0);
    const subtotal = Number(order.pricing.subtotal) || 0;
    const ratio = subtotal > 0 ? Math.min(1, returnedSubtotal / subtotal) : 0;
    const refundAmount = Math.max(0, Math.round((returnedSubtotal + (order.pricing.tax * ratio) - (order.pricing.discount * ratio) + Number.EPSILON) * 100) / 100);
    order = await Order.findOneAndUpdate(
      { _id: req.params.id, status: "return_requested" },
      { $set: { status: "return_accepted", "returnRequest.status": "accepted", "returnRequest.acceptedAt": new Date(), "returnRequest.refundAmount": refundAmount } },
      { new: true, runValidators: true },
    );
    if (!order) {
      order = await Order.findById(req.params.id);
      if (order?.status !== "return_accepted") throw new AppError("This order does not have a pending return request.", 409);
    }
  } else if (order.status !== "return_accepted") {
    throw new AppError("This order does not have a pending return request.", 409);
  }

  const refundAmount = order.returnRequest.refundAmount || 0;
  await creditWallet(order.user, refundAmount, `return:${order._id}`, `Return refund for order #${String(order._id).slice(-8).toUpperCase()}`);
  order = await order.populate("user", "name email phone");

  res.json({ success: true, order, refundAmount });
});

export const markOrderDelivered = asyncHandler(async (req, res) => {
  requireId(req.params.id, "Order");
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, status: "out_for_delivery", paymentStatus: { $in: ["paid", "not_required"] } },
    { $set: { status: "delivered", deliveredAt: new Date() } },
    { new: true, runValidators: true },
  ).populate("user", "name email phone");

  if (!order) {
    const current = await Order.findById(req.params.id);
    if (!current) throw new AppError("Order not found.", 404);
    throw new AppError("Only orders that are out for delivery can be marked delivered.", 409);
  }

  res.json({ success: true, order });
});

export const markOrderOutForDelivery = asyncHandler(async (req, res) => {
  requireId(req.params.id, "Order");
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, status: "placed", paymentStatus: { $in: ["paid", "not_required"] } },
    { $set: { status: "out_for_delivery", outForDeliveryAt: new Date() } },
    { new: true, runValidators: true },
  ).populate("user", "name email phone");

  if (!order) {
    const current = await Order.findById(req.params.id);
    if (!current) throw new AppError("Order not found.", 404);
    throw new AppError("Only placed, paid orders can be marked out for delivery.", 409);
  }

  res.json({ success: true, order });
});

export const getAdminOrderReports = asyncHandler(async (req, res) => {
  const fromInput = String(req.query.from || "");
  const toInput = String(req.query.to || "");
  let from;
  let to;
  let days;
  if (fromInput || toInput) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromInput) || !/^\d{4}-\d{2}-\d{2}$/.test(toInput)) {
      throw new AppError("Choose a valid start and end date.", 400);
    }
    from = new Date(`${fromInput}T00:00:00.000Z`);
    to = new Date(`${toInput}T23:59:59.999Z`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      throw new AppError("The start date must be before the end date.", 400);
    }
    days = Math.floor((to - from) / 86_400_000) + 1;
    if (days > 366) throw new AppError("Choose a date range of one year or less.", 400);
  } else {
    const requestedDays = Number.parseInt(req.query.days, 10);
    days = [7, 30, 90].includes(requestedDays) ? requestedDays : 30;
    from = new Date();
    from.setUTCHours(0, 0, 0, 0);
    from.setUTCDate(from.getUTCDate() - (days - 1));
    to = new Date();
  }
  const match = { createdAt: { $gte: from, $lte: to } };
  const completedRevenue = collectedRevenueExpression;

  const [summaryRows, daily, statusBreakdown, topMeals, categorySales, couponPerformance, newCustomers, dailyUnits] = await Promise.all([
    Order.aggregate([
      { $match: match },
      { $group: {
        _id: null,
        orders: { $sum: 1 },
        revenue: { $sum: { $cond: [completedRevenue, "$pricing.total", 0] } },
        completedOrders: { $sum: { $cond: [completedRevenue, 1, 0] } },
        onlinePayments: { $sum: { $cond: [{ $and: [{ $eq: ["$paymentMethod", "razorpay"] }, { $eq: ["$paymentStatus", "paid"] }] }, "$pricing.total", 0] } },
        codOrders: { $sum: { $cond: [{ $and: [{ $eq: ["$paymentMethod", "cod"] }, { $eq: ["$paymentStatus", "not_required"] }, { $ne: ["$status", "cancelled"] }] }, 1, 0] } },
      } },
    ]),
    Order.aggregate([
      { $match: match },
      { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        orders: { $sum: 1 },
        revenue: { $sum: { $cond: [completedRevenue, "$pricing.total", 0] } },
      } },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([{ $match: match }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { ...match, ...revenueFilter } },
      { $unwind: "$items" },
      { $group: {
        _id: "$items.name",
        image: { $first: "$items.image" },
        units: { $sum: "$items.quantity" },
        revenue: { $sum: "$items.lineTotal" },
      } },
      { $sort: { units: -1, revenue: -1 } },
      { $limit: 5 },
    ]),
    Order.aggregate([
      { $match: { ...match, ...revenueFilter } },
      { $unwind: "$items" },
      { $lookup: { from: "products", localField: "items.product", foreignField: "_id", as: "product" } },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "categories", localField: "product.category", foreignField: "_id", as: "category" } },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      { $group: {
        _id: { $ifNull: ["$category.name", "Other"] },
        units: { $sum: "$items.quantity" },
        revenue: { $sum: "$items.lineTotal" },
      } },
      { $sort: { revenue: -1 } },
      { $limit: 6 },
    ]),
    Order.aggregate([
      { $match: { ...match, ...revenueFilter, "pricing.couponCode": { $exists: true, $ne: "" } } },
      { $group: {
        _id: "$pricing.couponCode",
        uses: { $sum: 1 },
        discount: { $sum: "$pricing.discount" },
        orderRevenue: { $sum: "$pricing.total" },
      } },
      { $sort: { uses: -1, discount: -1 } },
    ]),
    User.countDocuments({ createdAt: { $gte: from, $lte: to } }),
    Order.aggregate([
      { $match: { ...match, ...revenueFilter } },
      { $unwind: "$items" },
      { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        units: { $sum: "$items.quantity" },
      } },
    ]),
  ]);

  const summary = summaryRows[0] || { orders: 0, revenue: 0, completedOrders: 0, onlinePayments: 0, codOrders: 0 };
  const unitsByDay = new Map(dailyUnits.map(({ _id, units }) => [_id, units]));
  const dailyWithUnits = daily.map((day) => ({ ...day, units: unitsByDay.get(day._id) || 0 }));
  const couponSummary = couponPerformance.reduce((result, coupon) => ({
    uses: result.uses + coupon.uses,
    discount: result.discount + coupon.discount,
    orderRevenue: result.orderRevenue + coupon.orderRevenue,
  }), { uses: 0, discount: 0, orderRevenue: 0 });
  res.json({
    success: true,
    days,
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    summary: {
      orders: summary.orders,
      revenue: summary.revenue,
      averageOrderValue: summary.completedOrders ? summary.revenue / summary.completedOrders : 0,
      onlinePayments: summary.onlinePayments,
      codOrders: summary.codOrders,
      newCustomers,
    },
    daily: dailyWithUnits,
    statuses: statusBreakdown,
    topMeals,
    categorySales,
    couponPerformance,
    couponSummary,
  });
});
