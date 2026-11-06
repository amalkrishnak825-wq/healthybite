import "dotenv/config";
import crypto from "node:crypto";
import mongoose from "mongoose";
import User from "../src/models/User.js";

const email = (process.env.ADMIN_EMAIL || "admin@healthybite.local")
  .trim()
  .toLowerCase();
const password = crypto.randomBytes(24).toString("base64url");

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI is missing from server/.env.");
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGO_URI);
  const existing = await User.findOne({ email }).select("email role");
  if (existing) {
    console.error(
      `An account already exists for ${email}. No account was changed.`,
    );
    process.exitCode = 1;
  } else {
    await User.create({
      name: "HealthyBite Admin",
      email,
      password,
      role: "admin",
      isVerified: true,
    });
    console.log(
      "Admin account created. Save this password now; it is not stored in plaintext.",
    );
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  }
} catch (error) {
  console.error(`Could not create the admin account: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
