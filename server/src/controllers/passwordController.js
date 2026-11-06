import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Otp from "../models/Otp.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { issueOtp, checkOtp } from "../utils/otp.js";

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
    { expiresIn: "10m" },
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
      400,
    );
  }

  if (password.length < 8) {
    throw new AppError("Password must contain at least 8 characters.", 400);
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
      401,
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
