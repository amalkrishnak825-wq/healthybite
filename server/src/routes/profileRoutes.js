import express from "express";
import protect from "../middleware/authMiddleware.js";
import { getMe } from "../controllers/authController.js";
import {
  updateProfile,
  uploadPhoto,
  removePhoto,
  changePassword,
  requestEmailChange,
  verifyEmailChange,
} from "../controllers/profileController.js";
import { uploadProfileImage } from "../middleware/upload.js";
import { otpLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

router.get("/me", protect, getMe);

router.patch("/me", protect, updateProfile);

router.post("/photo", protect, uploadProfileImage, uploadPhoto);

router.delete("/photo", protect, removePhoto);

router.patch("/change-password", protect, changePassword);

router.post("/change-email/request", protect, otpLimiter, requestEmailChange);

router.post("/change-email/verify", protect, otpLimiter, verifyEmailChange);

export default router;
