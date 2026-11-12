import asyncHandler from "../utils/asyncHandler.js";
import { getOrCreateWallet } from "../utils/wallet.js";

export const getMyWallet = asyncHandler(async (req, res) => {
  const wallet = await getOrCreateWallet(req.user._id);
  res.json({ success: true, wallet: { balance: wallet.balance, transactions: wallet.transactions.slice(-100).reverse() } });
});
