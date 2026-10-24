import express from "express";
import protect from "../middleware/authMiddleware.js";
import { getMe } from "../controllers/authController.js";
import {
  updateProfile,
  uploadPhoto,
  removePhoto,
} from "../controllers/profileController.js";
import { uploadProfileImage } from "../middleware/upload.js";

const router = express.Router();

router.get("/me", protect, getMe);

router.patch("/me", protect, updateProfile);

router.post("/photo", protect, uploadProfileImage, uploadPhoto);

router.delete("/photo", protect, removePhoto);

export default router;