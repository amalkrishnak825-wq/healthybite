import Wallet from "../models/Wallet.js";

const roundMoney = (amount) => Math.round((amount + Number.EPSILON) * 100) / 100;

export async function getOrCreateWallet(userId) {
  return Wallet.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, balance: 0, transactions: [] } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

export async function creditWallet(userId, amount, reference, description) {
  const roundedAmount = roundMoney(amount);
  if (roundedAmount <= 0) return getOrCreateWallet(userId);

  try {
    const wallet = await Wallet.findOneAndUpdate(
      { user: userId, "transactions.reference": { $ne: reference } },
      {
        $inc: { balance: roundedAmount },
        $push: { transactions: { type: "credit", amount: roundedAmount, reference, description } },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
    );
    if (wallet) return wallet;
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
  return Wallet.findOne({ user: userId });
}

export async function debitWallet(userId, amount, reference, description) {
  const roundedAmount = roundMoney(amount);
  const wallet = await getOrCreateWallet(userId);
  const alreadyDebited = wallet.transactions.some((entry) => entry.reference === reference && entry.type === "debit");
  if (alreadyDebited) return { success: true, wallet };

  const updated = await Wallet.findOneAndUpdate(
    { user: userId, balance: { $gte: roundedAmount }, "transactions.reference": { $ne: reference } },
    {
      $inc: { balance: -roundedAmount },
      $push: { transactions: { type: "debit", amount: roundedAmount, reference, description } },
    },
    { new: true, runValidators: true },
  );
  if (updated) return { success: true, wallet: updated };

  const current = await Wallet.findOne({ user: userId });
  if (current?.transactions.some((entry) => entry.reference === reference && entry.type === "debit")) {
    return { success: true, wallet: current };
  }
  return { success: false, wallet: current };
}
