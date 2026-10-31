import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import AppError from "../utils/AppError.js";

const directory = path.join(process.cwd(), "uploads", "products");
fs.mkdirSync(directory, { recursive: true });

const storage = multer.diskStorage({
  destination: directory,
  filename: (_req, file, done) => done(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${path.extname(file.originalname).toLowerCase()}`),
});

export const uploadProductImages = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, done) => {
    if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) return done(null, true);
    done(new AppError("Product images must be JPG, PNG, or WEBP.", 400));
  },
}).array("images", 8);
