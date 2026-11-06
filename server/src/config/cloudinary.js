import { v2 as cloudinary } from "cloudinary";
import crypto from "node:crypto";
import AppError from "../utils/AppError.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const configured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );

function uploadBuffer(buffer, publicId, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, resource_type: "image", format: "webp" },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
    stream.end(buffer);
  });
}

export async function uploadProductImages(files = []) {
  if (!files.length) return [];
  if (!configured()) {
    throw new AppError(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the server environment.",
      503,
    );
  }

  const uploaded = [];
  try {
    for (const file of files) {
      const publicId = crypto.randomUUID();
      const result = await uploadBuffer(
        file.buffer,
        publicId,
        "healthybite/products",
      );
      uploaded.push({ url: result.secure_url, publicId: result.public_id });
    }
    return uploaded;
  } catch (error) {
    await deleteCloudinaryImages(uploaded);
    throw new AppError(
      "Could not upload meal images to Cloudinary. Please try again.",
      502,
    );
  }
}

export async function uploadProfilePhoto(file) {
  if (!file?.buffer) throw new AppError("Please choose a profile photo.", 400);
  if (!configured()) {
    throw new AppError(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the server environment.",
      503,
    );
  }

  const publicId = crypto.randomUUID();
  try {
    const result = await uploadBuffer(
      file.buffer,
      publicId,
      "healthybite/profiles",
    );
    return { url: result.secure_url, publicId: result.public_id };
  } catch {
    throw new AppError(
      "Could not upload your profile photo to Cloudinary. Please try again.",
      502,
    );
  }
}

export async function deleteCloudinaryImages(images = []) {
  const publicIds = images.map((image) => image?.publicId).filter(Boolean);
  if (!publicIds.length || !configured()) return;
  await Promise.allSettled(
    publicIds.map((publicId) =>
      cloudinary.uploader.destroy(publicId, { resource_type: "image" }),
    ),
  );
}
