import crypto from "node:crypto";
import Address from "../models/Address.js";
import Cart from "../models/Cart.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { isOrderableProduct, requireId } from "../utils/catalog.js";
import { priceOrder } from "../utils/orderPricing.js";
import { paginationMetadata, parsePagination } from "../utils/query.js";
import { creditWallet, debitWallet, getOrCreateWallet } from "../utils/wallet.js";

async function getCheckoutData(userId, addressId, couponCode = "", options = {}) {
  const [cart, address] = await Promise.all([
    Cart.findOne({ user: userId }).populate({ path: "items.product", populate: { path: "category", select: "isDeleted isActive" } }),
    Address.findOne({ _id: addressId, user: userId }),
  ]);
  if (!address) throw new AppError("Choose a saved delivery address.", 400);
  if (!cart?.items.length) throw new AppError("Your cart is empty.", 400);
  const items = cart.items.filter((item) => item.product);
  if (items.some((item) => !isOrderableProduct(item.product, item.quantity))) {
    throw new AppError("A meal is unavailable or its stock changed. Review your cart.", 409);
  }
  const pricing = await priceOrder(items, couponCode, userId, options);
  return { items, address, pricing };
}

async function reserveStock(items) {
  const reserved = [];
  for (const item of items) {
    const result = await Product.updateOne(
      { _id: item.product._id, isPublished: true, isDeleted: false, isBlocked: false, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } },
    );
    if (!result.modifiedCount) {
      for (const previous of reserved) await Product.updateOne({ _id: previous.id }, { $inc: { stock: previous.quantity } });
      throw new AppError(`${item.product.name} no longer has enough stock.`, 409);
    }
    reserved.push({ id: item.product._id, quantity: item.quantity });
  }
}

async function releaseStock(order) {
  if (!order.stockReserved) return;
  for (const item of order.items) await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } });
  order.stockReserved = false;
}

const snapshotItems = (items) => items.map(({ product, quantity }) => ({
  product: product._id,
  name: product.name,
  image: product.images?.[0]?.url || "",
  unitPrice: product.price,
  quantity,
  lineTotal: Math.round(product.price * quantity * 100) / 100,
}));

const publicOrder = (order) => ({ success: true, order });

export const quoteCheckout = asyncHandler(async (req, res) => {
  const { items, address, pricing } = await getCheckoutData(req.user._id, req.body.addressId, req.body.couponCode);
  res.json({
    success: true,
    address: address._id,
    items: items.map(({ product, quantity }) => ({ productId: product._id, name: product.name, image: product.images?.[0]?.url || "", unitPrice: product.price, quantity, lineTotal: product.price * quantity })),
    pricing,
  });
});

export const placeOrder = asyncHandler(async (req, res) => {
  const { addressId, couponCode = "", paymentMethod, checkoutKey } = req.body;
  const walletRequested = paymentMethod === "cod" && req.body.useWallet === true;
  if (!checkoutKey || String(checkoutKey).length > 100) throw new AppError("Refresh checkout and try again.", 400);
  if (!["cod", "razorpay", "wallet"].includes(paymentMethod)) throw new AppError("Choose a supported payment method.", 400);
  const existing = await Order.findOne({ user: req.user._id, checkoutKey });
  if (existing) {
    const sameMethod = existing.paymentMethod === paymentMethod || (paymentMethod === "cod" && walletRequested && existing.paymentMethod === "wallet" && existing.walletRequested);
    if (!sameMethod || (paymentMethod === "cod" && Boolean(existing.walletRequested) !== walletRequested)) throw new AppError("This checkout attempt already uses another payment method.", 409);
    if (paymentMethod === "cod" || existing.paymentStatus === "paid") return res.status(200).json(publicOrder(existing));
    if (paymentMethod === "wallet" && existing.paymentStatus === "pending" && existing.status === "awaiting_payment") {
      const charge = await debitWallet(req.user._id, existing.pricing.total, `order:${existing._id}`, `Payment for order #${String(existing._id).slice(-8).toUpperCase()}`);
      if (!charge.success) throw new AppError("Your wallet balance is too low for this order.", 400);
      existing.paymentStatus = "paid";
      existing.status = "placed";
      existing.stockReserved = false;
      await existing.save();
      await Cart.updateOne({ user: req.user._id }, { $set: { items: [] } });
      return res.status(200).json(publicOrder(existing));
    }
    if (existing.paymentStatus === "pending" && existing.razorpayOrderId) return res.status(200).json({ success: true, order: existing, razorpayKeyId: process.env.RAZORPAY_KEY_ID });
    if (existing.paymentStatus === "failed") {
      const { items } = await getCheckoutData(req.user._id, addressId, couponCode, { excludeOrderId: existing._id });
      await reserveStock(items);
      existing.items = snapshotItems(items);
      existing.stockReserved = true;
      const receipt = `hb_${existing._id}`;
      const gateway = await createRazorpayOrder(existing.pricing.total, receipt).catch(async (error) => {
        await Product.bulkWrite(items.map((item) => ({ updateOne: { filter: { _id: item.product._id }, update: { $inc: { stock: item.quantity } } } })));
        existing.stockReserved = false;
        await existing.save();
        throw error;
      });
      existing.razorpayOrderId = gateway.id;
      existing.paymentStatus = "pending";
      existing.status = "awaiting_payment";
      await existing.save();
      return res.json({ success: true, order: existing, razorpayKeyId: process.env.RAZORPAY_KEY_ID });
    }
    throw new AppError("This order cannot be retried.", 409);
  }

  const { items, address, pricing } = await getCheckoutData(req.user._id, addressId, couponCode);
  if (paymentMethod === "razorpay" && (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)) {
    throw new AppError("Online payment is not configured yet. Use Cash on Delivery or configure Razorpay keys.", 503);
  }
  await reserveStock(items);
  let order;
  try {
    order = await Order.create({
      user: req.user._id,
      checkoutKey,
      items: snapshotItems(items),
      address: address.toObject(),
      pricing,
      paymentMethod,
      paymentStatus: paymentMethod === "cod" ? "not_required" : "pending",
      status: paymentMethod === "cod" ? "placed" : "awaiting_payment",
      walletRequested,
      walletAppliedAmount: 0,
      cashDueAmount: paymentMethod === "cod" ? pricing.total : null,
      stockReserved: true,
    });
  } catch (error) {
    for (const item of items) await Product.updateOne({ _id: item.product._id }, { $inc: { stock: item.quantity } });
    throw error;
  }
  if (paymentMethod === "cod") {
    if (walletRequested) {
      const wallet = await getOrCreateWallet(req.user._id);
      const walletAmount = Math.min(Number(wallet.balance) || 0, pricing.total);
      if (walletAmount > 0) {
        const charge = await debitWallet(req.user._id, walletAmount, `order:${order._id}`, `Payment for order #${String(order._id).slice(-8).toUpperCase()}`);
        if (!charge.success) {
          await releaseStock(order);
          await Order.deleteOne({ _id: order._id, paymentStatus: "not_required" });
          throw new AppError("Your wallet balance changed during checkout. Please try again.", 409);
        }
      }
      order.walletAppliedAmount = walletAmount;
      order.cashDueAmount = Math.max(0, Math.round((pricing.total - walletAmount + Number.EPSILON) * 100) / 100);
      if (order.cashDueAmount === 0) {
        order.paymentMethod = "wallet";
        order.paymentStatus = "paid";
      }
    }
    order.stockReserved = false;
    await order.save();
    await Cart.updateOne({ user: req.user._id }, { $set: { items: [] } });
    return res.status(201).json(publicOrder(order));
  }
  if (paymentMethod === "wallet") {
    const charge = await debitWallet(req.user._id, pricing.total, `order:${order._id}`, `Payment for order #${String(order._id).slice(-8).toUpperCase()}`);
    if (!charge.success) {
      await releaseStock(order);
      await Order.deleteOne({ _id: order._id, paymentStatus: "pending" });
      throw new AppError("Your wallet balance is too low for this order.", 400);
    }
    order.paymentStatus = "paid";
    order.status = "placed";
    order.stockReserved = false;
    await order.save();
    await Cart.updateOne({ user: req.user._id }, { $set: { items: [] } });
    return res.status(201).json(publicOrder(order));
  }
  try {
    const gateway = await createRazorpayOrder(pricing.total, `hb_${order._id}`);
    order.razorpayOrderId = gateway.id;
    await order.save();
  } catch (error) {
    order.paymentStatus = "failed";
    order.status = "payment_failed";
    await releaseStock(order);
    await order.save();
    throw error;
  }
  res.status(201).json({ success: true, order, razorpayKeyId: process.env.RAZORPAY_KEY_ID });
});

async function createRazorpayOrder(total, receipt) {
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount: Math.round(total * 100), currency: "INR", receipt }),
  });
  const result = await response.json();
  if (!response.ok) throw new AppError(result.error?.description || "Could not start Razorpay checkout.", 502);
  return result;
}

export const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const order = await Order.findOne({ _id: orderId, user: req.user._id, paymentMethod: "razorpay" });
  if (!order) throw new AppError("Order not found.", 404);
  if (order.paymentStatus === "paid") return res.json(publicOrder(order));
  if (!process.env.RAZORPAY_KEY_SECRET || order.razorpayOrderId !== razorpay_order_id) throw new AppError("Payment details could not be verified.", 400);
  const digest = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
  const supplied = Buffer.from(String(razorpay_signature || ""), "hex");
  const expected = Buffer.from(digest, "hex");
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) throw new AppError("Payment verification failed.", 400);
  order.razorpayPaymentId = razorpay_payment_id;
  order.paymentStatus = "paid";
  order.status = "placed";
  order.stockReserved = false;
  await order.save();
  await Cart.updateOne({ user: req.user._id }, { $set: { items: [] } });
  res.json(publicOrder(order));
});

export const failPayment = asyncHandler(async (req, res) => {
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id, paymentMethod: "razorpay", paymentStatus: "pending" },
    { $set: { paymentStatus: "failed", status: "payment_failed", stockReserved: false } },
    { new: false },
  );
  if (!order) {
    const current = await Order.findOne({ _id: req.params.id, user: req.user._id, paymentMethod: "razorpay" });
    if (!current) throw new AppError("Order not found.", 404);
    return res.json(publicOrder(current));
  }
  if (order.stockReserved) {
    for (const item of order.items) await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } });
  }
  const updated = await Order.findById(req.params.id);
  res.json(publicOrder(updated));
});

export const retryPayment = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id, paymentMethod: "razorpay" });
  if (!order) throw new AppError("Order not found.", 404);
  if (order.paymentStatus === "paid") throw new AppError("This order has already been paid.", 409);
  if (order.paymentStatus !== "failed") throw new AppError("This payment is not ready to retry yet.", 409);
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) throw new AppError("Online payment is not configured yet.", 503);

  const products = await Product.find({ _id: { $in: order.items.map((item) => item.product) } }).populate({ path: "category", select: "isDeleted isActive" });
  const byId = new Map(products.map((product) => [String(product._id), product]));
  const items = order.items.map((item) => ({ product: byId.get(String(item.product)), quantity: item.quantity }));
  if (items.some((item) => !isOrderableProduct(item.product, item.quantity))) throw new AppError("A meal from this order is no longer available in the required quantity.", 409);
  const pricing = await priceOrder(items, order.pricing.couponCode, req.user._id, { excludeOrderId: order._id });
  await reserveStock(items);

  order.items = snapshotItems(items);
  order.pricing = pricing;
  order.stockReserved = true;
  try {
    const gateway = await createRazorpayOrder(pricing.total, `hb_${order._id}`);
    order.razorpayOrderId = gateway.id;
    order.paymentStatus = "pending";
    order.status = "awaiting_payment";
    await order.save();
  } catch (error) {
    for (const item of items) await Product.updateOne({ _id: item.product._id }, { $inc: { stock: item.quantity } });
    order.stockReserved = false;
    await order.save();
    throw error;
  }
  res.json({ success: true, order, razorpayKeyId: process.env.RAZORPAY_KEY_ID });
});

export const getMyOrders = asyncHandler(async (req, res) => {
  const { page, limit } = parsePagination(req.query, {
    defaultLimit: 4,
    maxLimit: 4,
  });
  const filter = { user: req.user._id };
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  res.json({
    success: true,
    orders,
    pagination: paginationMetadata(page, limit, total),
  });
});

export const getMyOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw new AppError("Order not found.", 404);
  res.json(publicOrder(order));
});

export const cancelOrder = asyncHandler(async (req, res) => {
  requireId(req.params.id, "Order");
  const order = await Order.findOneAndUpdate(
    {
      _id: req.params.id,
      user: req.user._id,
      status: "placed",
      paymentStatus: { $in: ["paid", "not_required"] },
    },
    { $set: { status: "cancelled", stockReserved: false } },
    { new: true, runValidators: true },
  );

  if (!order) {
    const current = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!current) throw new AppError("Order not found.", 404);
    throw new AppError("An order can only be cancelled while its status is Order Placed.", 409);
  }

  await Product.bulkWrite(order.items.map((item) => ({
    updateOne: {
      filter: { _id: item.product },
      update: { $inc: { stock: item.quantity } },
    },
  })));

  const refundableWalletAmount = Number(order.walletAppliedAmount)
    || (order.paymentMethod === "wallet" || (order.paymentMethod === "razorpay" && order.paymentStatus === "paid") ? order.pricing.total : 0);
  if (refundableWalletAmount > 0) {
    await creditWallet(req.user._id, refundableWalletAmount, `cancel:${order._id}`, `Wallet refund for cancelled order #${String(order._id).slice(-8).toUpperCase()}`);
  }

  res.json({ ...publicOrder(order), walletRefundAmount: refundableWalletAmount });
});

export const requestReturn = asyncHandler(async (req, res) => {
  requireId(req.params.id, "Order");
  const { items, reason } = req.body;
  const cleanReason = String(reason || "").trim();
  if (!Array.isArray(items) || items.length < 1 || items.length > 20) {
    throw new AppError("Choose at least one item to return.", 400);
  }
  if (cleanReason.length < 5 || cleanReason.length > 500) {
    throw new AppError("Enter a return reason between 5 and 500 characters.", 400);
  }

  const current = await Order.findOne({
    _id: req.params.id,
    user: req.user._id,
    status: "delivered",
    paymentStatus: { $in: ["paid", "not_required"] },
  });
  if (!current) {
    const existing = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!existing) throw new AppError("Order not found.", 404);
    if (existing.status === "return_requested") throw new AppError("A return has already been requested for this order.", 409);
    throw new AppError("This order is not eligible for a return request.", 409);
  }

  const seen = new Set();
  const returnItems = items.map((requested) => {
    const index = Number(requested.orderItemIndex);
    const quantity = Number(requested.quantity);
    if (!Number.isInteger(index) || index < 0 || index >= current.items.length || seen.has(index)) {
      throw new AppError("Choose valid order items to return.", 400);
    }
    const orderedItem = current.items[index];
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > orderedItem.quantity) {
      throw new AppError(`Return quantity for ${orderedItem.name} must be between 1 and ${orderedItem.quantity}.`, 400);
    }
    seen.add(index);
    return {
      orderItemIndex: index,
      product: orderedItem.product,
      name: orderedItem.name,
      quantity,
    };
  });

  const order = await Order.findOneAndUpdate(
    {
      _id: req.params.id,
      user: req.user._id,
      status: "delivered",
      paymentStatus: { $in: ["paid", "not_required"] },
    },
    { $set: {
      status: "return_requested",
      returnRequest: { items: returnItems, reason: cleanReason, status: "pending", requestedAt: new Date() },
    } },
    { new: true, runValidators: true },
  );

  if (!order) {
    const updated = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!updated) throw new AppError("Order not found.", 404);
    if (updated.status === "return_requested") {
      throw new AppError("A return has already been requested for this order.", 409);
    }
    throw new AppError("This order is not eligible for a return request.", 409);
  }

  res.json(publicOrder(order));
});

export const cancelReturnRequest = asyncHandler(async (req, res) => {
  requireId(req.params.id, "Order");
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id, status: "return_requested" },
    { $set: { status: "delivered", returnRequest: null } },
    { new: true, runValidators: true },
  );

  if (!order) {
    const current = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!current) throw new AppError("Order not found.", 404);
    throw new AppError("This return request can no longer be cancelled.", 409);
  }

  res.json(publicOrder(order));
});
