import fs from "node:fs/promises";
import path from "node:path";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/User.js";
import { issueOtp, checkOtp } from "../utils/otp.js";
import {
  deleteCloudinaryImages,
  uploadProfilePhoto,
} from "../config/cloudinary.js";
import validator from "validator";
import { isValidIndianPhone, isValidPersonName } from "../utils/inputValidation.js";

const deleteOldProfilePhoto = async (photoPath) => {
  if (photoPath?.publicId) {
    await deleteCloudinaryImages([{ publicId: photoPath.publicId }]);
    return;
  }

  if (!photoPath?.url?.startsWith("/uploads/profile/")) return;

  const filename = path.basename(photoPath.url);
  const filePath = path.join(process.cwd(), "uploads", "profile", filename);

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Could not delete old profile photo:", error);
    }
  }
};

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;

  if (name === undefined && phone === undefined) {
    throw new AppError("Please provide a name or phone number.", 400);
  }

  if (name !== undefined) {
    if (!isValidPersonName(name, { max: 50 })) {
      throw new AppError("Name must be between 2 and 50 characters.", 400);
    }

    req.user.name = name.trim();
  }

  if (phone !== undefined) {
    if (!isValidIndianPhone(phone)) {
      throw new AppError("Enter a valid 10-digit Indian mobile number.", 400);
    }
    req.user.phone = phone.trim();
  }

  await req.user.save();

  res.status(200).json({
    success: true,
    message: "Profile updated successfully.",
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      profileImage: req.user.profileImage,
      isVerified: req.user.isVerified,
    },
  });
});

export const uploadPhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("Please choose a profile photo.", 400);
  }

  const oldPhoto = {
    url: req.user.profileImage,
    publicId: req.user.profileImagePublicId,
  };
  const uploadedPhoto = await uploadProfilePhoto(req.file);
  req.user.profileImage = uploadedPhoto.url;
  req.user.profileImagePublicId = uploadedPhoto.publicId;
  try {
    await req.user.save();
  } catch (error) {
    await deleteCloudinaryImages([uploadedPhoto]);
    throw error;
  }

  await deleteOldProfilePhoto(oldPhoto);

  res.status(200).json({
    success: true,
    message: "Profile photo updated successfully.",
    profileImage: req.user.profileImage,
  });
});

export const removePhoto = asyncHandler(async (req, res) => {
  const oldPhoto = {
    url: req.user.profileImage,
    publicId: req.user.profileImagePublicId,
  };

  if (!oldPhoto.url) {
    return res.status(200).json({
      success: true,
      message: "No profile photo to remove.",
      profileImage: "",
    });
  }

  req.user.profileImage = "";
  req.user.profileImagePublicId = "";
  await req.user.save();

  await deleteOldProfilePhoto(oldPhoto);

  res.status(200).json({
    success: true,
    message: "Profile photo removed successfully.",
    profileImage: "",
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (
    typeof currentPassword !== "string" ||
    typeof newPassword !== "string" ||
    typeof confirmPassword !== "string"
  ) {
    throw new AppError("Please provide all password fields.", 400);
  }

  if (newPassword.length < 8) {
    throw new AppError("New password must contain at least 8 characters.", 400);
  }

  if (newPassword !== confirmPassword) {
    throw new AppError("New passwords do not match.", 400);
  }

  if (currentPassword === newPassword) {
    throw new AppError(
      "New password must differ from the current password.",
      400,
    );
  }

  const user = await User.findById(req.user._id).select("+password");

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  const isMatch = await user.comparePassword(currentPassword);

  if (!isMatch) {
    throw new AppError("Current password is incorrect.", 401);
  }

  user.password = newPassword;
  user.passwordChangedAt = new Date();

  await user.save();

  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  res.status(200).json({
    success: true,
    message: "Password changed successfully. Please log in again.",
  });
});

export const requestEmailChange = asyncHandler(async (req, res) => {
  const { newEmail } = req.body;

  if (typeof newEmail !== "string" || !validator.isEmail(newEmail.trim())) {
    throw new AppError("Please provide a valid new email address.", 400);
  }

  const normalizedEmail = newEmail.trim().toLowerCase();

  if (normalizedEmail === req.user.email.toLowerCase()) {
    throw new AppError(
      "Your new email must differ from your current email.",
      400,
    );
  }

  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new AppError("This email address is already registered.", 409);
  }

  const otpInfo = await issueOtp({
    email: normalizedEmail,
    purpose: "change-email",
  });

  res.status(200).json({
    success: true,
    message: "Verification code sent to your new email address.",
    expiresAt: otpInfo.expiresAt,
    resendAfterSeconds: otpInfo.resendAfterSeconds,
  });
});

export const verifyEmailChange = asyncHandler(async (req, res) => {
  const { newEmail, otp } = req.body;

  if (
    typeof newEmail !== "string" ||
    !validator.isEmail(newEmail.trim()) ||
    typeof otp !== "string" ||
    !/^\d{6}$/.test(otp)
  ) {
    throw new AppError("Provide a valid email address and six-digit OTP.", 400);
  }

  const normalizedEmail = newEmail.trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new AppError("This email address is already registered.", 409);
  }

  await checkOtp({
    email: normalizedEmail,
    purpose: "change-email",
    otp,
  });

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  user.email = normalizedEmail;
  user.isVerified = true;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Email address updated successfully.",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isVerified: user.isVerified,
      profileImage: user.profileImage,
    },
  });
});
