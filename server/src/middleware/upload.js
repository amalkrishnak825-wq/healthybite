
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import AppError from "../utils/AppError.js";

const uploadDir = path.join(process.cwd(), "uploads", "profile");

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `${req.user._id}-${crypto.randomBytes(6).toString("hex")}${extension}`;

    cb(null, filename);
  },
});

export const uploadProfileImage = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (allowedTypes.includes(file.mimetype)) {
      return cb(null, true);
    }

    cb(new AppError("Only JPG, PNG, or WEBP images are allowed.", 400));
  },
}).single("photo");

