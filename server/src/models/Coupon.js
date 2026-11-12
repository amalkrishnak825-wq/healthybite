import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 24,
    },
    discountType: {
      type: String,
      enum: ["percent", "fixed"],
      default: "percent",
    },
    discountValue: { type: Number, required: true, min: 0.01 },
    minimumSubtotal: { type: Number, default: 0, min: 0 },
    maximumDiscount: { type: Number, default: null, min: 0 },
    maxUsesPerUser: { type: Number, default: null, min: 1 },
    expiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model("Coupon", couponSchema);
