import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    checkoutKey: { type: String, required: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        name: { type: String, required: true },
        image: { type: String, default: "" },
        unitPrice: { type: Number, required: true, min: 0 },
        quantity: { type: Number, required: true, min: 1 },
        lineTotal: { type: Number, required: true, min: 0 },
      },
    ],
    address: {
      type: { type: String, required: true }, fullName: { type: String, required: true },
      phone: { type: String, required: true }, houseNo: { type: String, required: true },
      street: { type: String, required: true }, landmark: { type: String, default: "" },
      city: { type: String, required: true }, state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    pricing: {
      subtotal: { type: Number, required: true }, shipping: { type: Number, required: true },
      tax: { type: Number, required: true }, discount: { type: Number, default: 0 },
      couponCode: { type: String, default: "" }, total: { type: Number, required: true },
    },
    paymentMethod: { type: String, enum: ["cod", "razorpay", "wallet"], required: true },
    walletRequested: { type: Boolean, default: false },
    walletAppliedAmount: { type: Number, default: 0, min: 0 },
    cashDueAmount: { type: Number, default: null, min: 0 },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed", "not_required"], default: "pending" },
    status: { type: String, enum: ["placed", "out_for_delivery", "awaiting_payment", "payment_failed", "delivered", "return_requested", "return_accepted", "cancelled"], default: "placed" },
    deliveredAt: { type: Date, default: null },
    outForDeliveryAt: { type: Date, default: null },
    returnRequest: {
      items: [{
        orderItemIndex: { type: Number, required: true, min: 0 },
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
      }],
      reason: { type: String, trim: true, maxlength: 500 },
      status: { type: String, enum: ["pending", "accepted"] },
      requestedAt: { type: Date },
      acceptedAt: { type: Date },
      refundAmount: { type: Number, min: 0 },
    },
    razorpayOrderId: { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" },
    stockReserved: { type: Boolean, default: false },
  },
  { timestamps: true },
);

orderSchema.index({ user: 1, checkoutKey: 1 }, { unique: true });
export default mongoose.model("Order", orderSchema);
