
import multer from "multer";

export const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};

export const errorHandler = (err, req, res, next) => {
  console.error("ERROR DETAILS:", err);

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Server error";

  if (err instanceof multer.MulterError) {
    statusCode = 400;
    const productImages = req.originalUrl.includes("/products");
    const uploadType = productImages ? "Product images" : "Profile photo";

    if (err.code === "LIMIT_FILE_SIZE") {
      message = `${uploadType} must be 5 MB or smaller.`;
    } else if (err.code === "LIMIT_FILE_COUNT") {
      message = productImages ? "A product can have at most 8 images." : "Only one profile photo can be uploaded at a time.";
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      message = productImages ? "Unexpected image field. Use the field name 'images'." : "Unexpected file field. Use the field name 'photo'.";
    } else {
      message = `${uploadType} upload failed.`;
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};
