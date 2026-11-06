import "dotenv/config";
import mongoose from "mongoose";
import User from "../src/models/User.js";

const currentEmail = (process.env.ADMIN_CURRENT_EMAIL || "")
  .trim()
  .toLowerCase();
const nextEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const nextPassword = process.env.ADMIN_PASSWORD || "";

if (!process.env.MONGO_URI || !currentEmail || !nextEmail || !nextPassword) {
  console.error(
    "Set MONGO_URI, ADMIN_CURRENT_EMAIL, ADMIN_EMAIL, and ADMIN_PASSWORD.",
  );
  process.exit(1);
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
  console.error("ADMIN_EMAIL must be a valid email address.");
  process.exit(1);
}
if (nextPassword.length < 8) {
  console.error("ADMIN_PASSWORD must be at least 8 characters.");
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGO_URI);
  const currentAdmin = await User.findOne({
    email: currentEmail,
    role: "admin",
  }).select("+password");
  if (!currentAdmin)
    throw new Error(`No admin account found for ${currentEmail}.`);

  const target = await User.findOne({ email: nextEmail }).select("+password");
  if (target && target._id.toString() !== currentAdmin._id.toString()) {
    if (target.isBlocked)
      throw new Error(`The account for ${nextEmail} is blocked.`);
    // Transfer the admin role to the requested existing account and demote the
    // temporary/current admin so the requested email replaces it.
    currentAdmin.role = "customer";
    await currentAdmin.save();
    target.role = "admin";
    target.isVerified = true;
    target.password = nextPassword;
    await target.save();
  } else {
    currentAdmin.email = nextEmail;
    currentAdmin.password = nextPassword;
    await currentAdmin.save();
  }
  console.log(`Updated admin credentials for ${nextEmail}.`);
} catch (error) {
  console.error(`Could not update admin credentials: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
