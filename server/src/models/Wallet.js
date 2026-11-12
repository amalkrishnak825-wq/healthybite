import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema({
  type: { type: String, enum: ["credit", "debit"], required: true },
  amount: { type: Number, required: true, min: 0.01 },
  reference: { type: String, required: true },
  description: { type: String, required: true, trim: true, maxlength: 180 },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const walletSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  balance: { type: Number, default: 0, min: 0 },
  transactions: { type: [walletTransactionSchema], default: [] },
}, { timestamps: true });

export default mongoose.model("Wallet", walletSchema);
