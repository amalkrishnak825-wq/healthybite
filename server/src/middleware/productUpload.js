import multer from "multer";
import AppError from "../utils/AppError.js";

export const uploadProductImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, done) => {
    if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype))
      return done(null, true);
    done(new AppError("Product images must be JPG, PNG, or WEBP.", 400));
  },
}).array("images", 5);
