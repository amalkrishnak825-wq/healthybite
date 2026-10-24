
import fs from "node:fs/promises";
import path from "node:path";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";

const deleteOldProfilePhoto = async (photoPath) => {
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

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;

  if (name === undefined && phone === undefined) {
    throw new AppError("Please provide a name or phone number.", 400);
  }

  if (name !== undefined) {
    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      name.trim().length > 50
    ) {
      throw new AppError("Name must be between 2 and 50 characters.", 400);
    }

    req.user.name = name.trim();
  }

  if (phone !== undefined) {
    if (
      typeof phone !== "string" ||
      !/^[6-9]\d{9}$/.test(phone.trim())
    ) {
      throw new AppError(
        "Enter a valid 10-digit Indian mobile number.",
        400
      );
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
