
import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    attempts: {
      type: Number,
      default: 0,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    otpHash: {
      type: String,
      required: true,
    },

    purpose: {
      type: String,
      enum: ["register", "reset-password", "change-email"],
      required: true,
    },

    newEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

otpSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

export default mongoose.model("Otp", otpSchema);
