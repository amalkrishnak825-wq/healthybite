import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Address from "../models/Address.js";
import Otp from "../models/Otp.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import fs from "node:fs/promises";
import path from "node:path";
import sendEmail from "../utils/sendEmail.js";
import {
  generateOtp,
  hashOtp,
  otpMeta,
  verifyOtp,
  issueOtp,
  checkOtp,
} from "../utils/otp.js";
import { signToken, sendTokenCookie } from "../utils/token.js";
 
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new AppError(
      "Name, email, and password are required.",
      400
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({
    email: normalizedEmail,
  });

  if (existingUser?.isVerified) {
    throw new AppError(
      "An account with this email already exists.",
      409
    );
  }

  if (password.length < 8) {
    throw new AppError(
      "Password must be at least 8 characters.",
      400
    );
  }

  const otp = generateOtp();
  const otpHash = hashOtp(otp);

  await Otp.deleteMany({
    email: normalizedEmail,
    purpose: "register",
  });

  await Otp.create({
    email: normalizedEmail,
    otpHash,
    purpose: "register",
    expiresAt: new Date(
      Date.now() +
        Number(process.env.OTP_EXPIRY_MINUTES || 5) * 60 * 1000
    ),
  });

  try {
    await sendEmail({
      to: normalizedEmail,
      subject: "HealthyBite email verification",
      html: `<p>Your HealthyBite verification code is <strong>${otp}</strong>.</p>
             <p>This code expires in ${Number(process.env.OTP_EXPIRY_MINUTES || 5)} minutes.</p>`,
    });
  } catch (error) {
    await Otp.deleteMany({
      email: normalizedEmail,
      purpose: "register",
    });
    throw error;
  }

  res.status(200).json({
    success: true,
    message: "Verification code sent to your email.",
  });
});


export const resendRegistrationOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError("Email is required.", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({
    email: normalizedEmail,
    isVerified: true,
  });

  if (existingUser) {
    throw new AppError(
      "An account with this email already exists.",
      409
    );
  }

  const previousOtp = await Otp.findOne({
    email: normalizedEmail,
    purpose: "register",
  }).sort({ createdAt: -1 });

  if (!previousOtp) {
    throw new AppError(
      "No registration OTP found. Please register first.",
      400
    );
  }

  const resendCooldown = Number(
    process.env.OTP_RESEND_SECONDS || 30
  );

  const secondsSinceLastOtp =
    (Date.now() - previousOtp.createdAt.getTime()) / 1000;

  if (secondsSinceLastOtp < resendCooldown) {
    const waitSeconds = Math.ceil(
      resendCooldown - secondsSinceLastOtp
    );

    throw new AppError(
      `Please wait ${waitSeconds} seconds before requesting another OTP.`,
      429
    );
  }

  const otp = generateOtp();
  const otpHash = hashOtp(otp);

  await Otp.deleteMany({
    email: normalizedEmail,
    purpose: "register",
  });

  const newOtp = await Otp.create({
    email: normalizedEmail,
    otpHash,
    purpose: "register",
    expiresAt: new Date(
      Date.now() +
        Number(process.env.OTP_EXPIRY_MINUTES || 5) * 60 * 1000
    ),
  });

  try {
    await sendEmail({
      to: normalizedEmail,
      subject: "Your new HealthyBite verification code",
      html: `<p>Your new HealthyBite verification code is <strong>${otp}</strong>.</p>
             <p>This code expires in ${Number(process.env.OTP_EXPIRY_MINUTES || 5)} minutes.</p>`,
    });
  } catch (error) {
    await Otp.deleteOne({ _id: newOtp._id });
    throw error;
  }

  res.status(200).json({
    success: true,
    message: "A new verification code has been sent to your email.",
  });
});


export const verifyRegistrationOtp = asyncHandler(
  async (req, res) => {
  const { email, otp, name, password, phone } = req.body;

    if (!email || !otp || !name || !password) {
      throw new AppError(
        "Email, OTP, name, and password are required.",
        400
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const otpRecord = await Otp.findOne({
      email: normalizedEmail,
      purpose: "register",
    }).sort({ createdAt: -1 });

    if (!otpRecord || otpRecord.expiresAt <= new Date()) {
      throw new AppError(
        "OTP is invalid or expired. Please request a new one.",
        400
      );
    }

    
if (otpRecord.attempts >= 5) {
  await Otp.deleteOne({ _id: otpRecord._id });

  throw new AppError(
    "Too many attempts. Please request a new OTP.",
    429
  );
}

if (hashOtp(otp) !== otpRecord.otpHash) {
  otpRecord.attempts += 1;

  if (otpRecord.attempts >= 5) {
    await Otp.deleteOne({ _id: otpRecord._id });

    throw new AppError(
      "Too many attempts. Please request a new OTP.",
      429
    );
  }

  await otpRecord.save();

  throw new AppError("Incorrect OTP.", 400);
}


    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser?.isVerified) {
      await Otp.deleteOne({ _id: otpRecord._id });
      throw new AppError(
        "An account with this email already exists.",
        409
      );
    }

    const user = existingUser || new User({
      name: name.trim(),
      email: normalizedEmail,
      phone,
      password,
    });

    user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    user.password = password;
    user.isVerified = true;

    await user.save();
    await Otp.deleteOne({ _id: otpRecord._id });

    const token = signToken(user._id.toString());
    sendTokenCookie(res, token);

    res.status(201).json({
      success: true,
      message: "Your HealthyBite account has been created.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  }
);

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError("Email and password are required.", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({
    email: normalizedEmail,
  }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Invalid email or password.", 401);
  }

  if (!user.isVerified) {
    throw new AppError("Please verify your email first.", 403);
  }

  if (user.isBlocked) {
    throw new AppError("Your account has been blocked.", 403);
  }

  const token = signToken(user._id.toString());
  sendTokenCookie(res, token);

  res.status(200).json({
    success: true,
    message: "Login successful.",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

export const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError("Email and password are required.", 400);
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
  if (!user || !(await user.comparePassword(password))) throw new AppError("Invalid email or password.", 401);
  if (user.role !== "admin") throw new AppError("Admin access required.", 403);
  sendTokenCookie(res, signToken(user._id.toString()), { name: "adminToken" });
  res.status(200).json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

export const listUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
  const search = String(req.query.search || "").trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const filter = { role: "customer", ...(req.query.status === "active" ? { isBlocked: false } : req.query.status === "deactivated" ? { isBlocked: true } : {}), ...(search ? { $or: [
    { name: { $regex: search, $options: "i" } },
    { email: { $regex: search, $options: "i" } },
    { phone: { $regex: search, $options: "i" } },
  ] } : {}) };
  const [users, total] = await Promise.all([
    User.find(filter).select("name email phone isVerified isBlocked createdAt profileImage").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ success: true, users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const customerSummary = asyncHandler(async (req, res) => {
  const [total, active, deactivated, verified] = await Promise.all([
    User.countDocuments({ role: "customer" }),
    User.countDocuments({ role: "customer", isBlocked: false }),
    User.countDocuments({ role: "customer", isBlocked: true }),
    User.countDocuments({ role: "customer", isVerified: true }),
  ]);
  res.json({ success: true, summary: { total, active, deactivated, verified } });
});

export const getCustomer = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: "customer" })
    .select("name email phone isVerified isBlocked createdAt profileImage");
  if (!user) throw new AppError("Customer not found.", 404);
  const address = await Address.findOne({ user: user._id }).sort({ isDefault: -1, createdAt: -1 });
  res.json({ success: true, customer: { ...user.toObject(), address } });
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  if (name === undefined && phone === undefined) throw new AppError("Provide a customer name or phone number.", 400);
  if (name !== undefined && (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 50)) throw new AppError("Name must be between 2 and 50 characters.", 400);
  if (phone !== undefined && phone !== "" && !/^[6-9]\d{9}$/.test(String(phone).trim())) throw new AppError("Enter a valid 10-digit Indian mobile number.", 400);
  const customer = await User.findOne({ _id: req.params.id, role: "customer" });
  if (!customer) throw new AppError("Customer not found.", 404);
  if (name !== undefined) customer.name = name.trim();
  if (phone !== undefined) customer.phone = phone.trim();
  await customer.save();
  res.json({ success: true, message: "Customer updated successfully.", customer: { id: customer._id, name: customer.name, email: customer.email, phone: customer.phone, isVerified: customer.isVerified, isBlocked: customer.isBlocked, profileImage: customer.profileImage, createdAt: customer.createdAt } });
});

export const setUserBlocked = asyncHandler(async (req, res) => {
  if (typeof req.body.isBlocked !== "boolean") throw new AppError("isBlocked must be a boolean.", 400);
  const user = await User.findOneAndUpdate({ _id: req.params.id, role: "customer" }, { isBlocked: req.body.isBlocked }, { new: true, runValidators: true }).select("name email isBlocked");
  if (!user) throw new AppError("Customer not found.", 404);
  res.json({ success: true, user, message: user.isBlocked ? "Customer blocked." : "Customer unblocked." });
});

export const logout = (req, res) => {
  const cookieName = req.originalUrl.includes("/admin/") ? "adminToken" : "token";
  res.cookie(cookieName, "", {
    httpOnly: true,
    expires: new Date(0),
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
};

export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      isVerified: req.user.isVerified,
      profileImage: req.user.profileImage,
    },
  });
});
const deleteOldProfilePhoto = async (photoPath) => {
  // Delete only files inside our profile uploads folder.
  if (!photoPath?.startsWith("/uploads/profile/")) return;

  const filename = path.basename(photoPath);
  const filePath = path.join(
    process.cwd(),
    "uploads",
    "profile",
    filename
  );

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Could not delete old profile photo:", error);
    }
  }
};

export const uploadPhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("Please choose a profile photo.", 400);
  }

  const oldPhoto = req.user.profileImage;

  req.user.profileImage = `/uploads/profile/${req.file.filename}`;
  await req.user.save();

  await deleteOldProfilePhoto(oldPhoto);

  res.status(200).json({
    success: true,
    message: "Profile photo updated successfully.",
    profileImage: req.user.profileImage,
  });
});

export const removePhoto = asyncHandler(async (req, res) => {
  const oldPhoto = req.user.profileImage;

  req.user.profileImage = "";
  await req.user.save();

  await deleteOldProfilePhoto(oldPhoto);

  res.status(200).json({
    success: true,
    message: "Profile photo removed successfully.",
    profileImage: "",
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== "string") {
    throw new AppError("Please provide your email address.", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({
    email: normalizedEmail,
    isVerified: true,
  });

  if (!user) {
    return res.status(200).json({
      success: true,
      message: "If an account exists, a reset code will be sent.",
    });
  }

  await issueOtp({
    email: normalizedEmail,
    purpose: "reset-password",
  });

  res.status(200).json({
    success: true,
    message: "If an account exists, a reset code will be sent.",
  });
});

export const verifyResetOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (
    typeof email !== "string" ||
    typeof otp !== "string" ||
    !email.trim() ||
    !otp.trim()
  ) {
    throw new AppError("Please provide your email and OTP.", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({
    email: normalizedEmail,
    isVerified: true,
  });

  if (!user) {
    throw new AppError("Invalid or expired OTP.", 400);
  }

  await checkOtp({
    email: normalizedEmail,
    purpose: "reset-password",
    otp: otp.trim(),
  });

  const resetToken = jwt.sign(
    { id: user._id.toString(), purpose: "password-reset" },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );

  res.status(200).json({
    success: true,
    message: "OTP verified. You can now reset your password.",
    resetToken,
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, password, confirmPassword } = req.body;

  if (
    typeof resetToken !== "string" ||
    typeof password !== "string" ||
    typeof confirmPassword !== "string"
  ) {
    throw new AppError(
      "Please provide the reset token and both password fields.",
      400
    );
  }

  if (password.length < 8) {
    throw new AppError(
      "Password must contain at least 8 characters.",
      400
    );
  }

  if (password !== confirmPassword) {
    throw new AppError("Passwords do not match.", 400);
  }

  let decoded;

  try {
    decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
  } catch {
    throw new AppError("Reset session expired. Verify your OTP again.", 401);
  }

  if (decoded.purpose !== "password-reset") {
    throw new AppError("Invalid password-reset token.", 401);
  }

  const user = await User.findById(decoded.id);

  if (!user || !user.isVerified) {
    throw new AppError("Unable to reset this account's password.", 400);
  }
  
  if (
  user.passwordChangedAt &&
  decoded.iat <= Math.floor(user.passwordChangedAt.getTime() / 1000)
) {
  throw new AppError(
    "This reset token has already been used. Verify your OTP again.",
    401
  );
  }

  user.password = password;
  user.passwordChangedAt = new Date();
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password reset successfully. Please log in again.",
  });
});
