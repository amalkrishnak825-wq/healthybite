import mongoose from "mongoose";

const refreshSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["customer", "admin"],
      required: true,
    },
    activeTokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    usedTokenHashes: {
      type: [String],
      default: [],
    },
    idleExpiresAt: {
      type: Date,
      required: true,
    },
    absoluteExpiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

refreshSessionSchema.index({ usedTokenHashes: 1 });
refreshSessionSchema.index({ absoluteExpiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("RefreshSession", refreshSessionSchema);
