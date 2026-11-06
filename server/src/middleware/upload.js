import multer from "multer";
import AppError from "../utils/AppError.js";

export const uploadProfileImage = multer({
  storage: multer.memoryStorage(),
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
