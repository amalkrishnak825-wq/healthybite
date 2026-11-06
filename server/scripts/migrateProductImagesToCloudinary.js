import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import connectDB from "../src/config/db.js";
import Product from "../src/models/Product.js";
import {
  deleteCloudinaryImages,
  uploadProductImages,
} from "../src/config/cloudinary.js";

const uploadsDirectory = path.resolve(process.cwd(), "uploads", "products");
const mimeByExtension = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

async function migrate() {
  await connectDB();
  const products = await Product.find({
    "images.url": /^\/uploads\/products\//,
  });
  let migratedCount = 0;

  for (const product of products) {
    const replacements = new Map();
    const newCloudImages = [];
    try {
      for (const image of product.images) {
        if (!image.url.startsWith("/uploads/products/")) continue;
        const localPath = path.resolve(
          uploadsDirectory,
          path.basename(image.url),
        );
        if (!localPath.startsWith(`${uploadsDirectory}${path.sep}`))
          throw new Error(`Unsafe product image path: ${image.url}`);
        const buffer = await fs.readFile(localPath);
        const extension = path.extname(localPath).toLowerCase();
        const [uploaded] = await uploadProductImages([
          {
            buffer,
            originalname: path.basename(localPath),
            mimetype: mimeByExtension[extension] || "image/webp",
          },
        ]);
        replacements.set(image.url, uploaded);
        newCloudImages.push(uploaded);
      }

      product.images = product.images.map((image) => {
        const replacement = replacements.get(image.url);
        return replacement
          ? {
              url: replacement.url,
              publicId: replacement.publicId,
              alt: image.alt,
            }
          : image;
      });
      await product.save();

      for (const oldUrl of replacements.keys()) {
        await fs
          .unlink(path.resolve(uploadsDirectory, path.basename(oldUrl)))
          .catch(() => {});
      }
      migratedCount += replacements.size;
      console.log(
        `Migrated ${replacements.size} image(s) for ${product.name}.`,
      );
    } catch (error) {
      await deleteCloudinaryImages(newCloudImages);
      throw new Error(
        `Could not migrate images for ${product.name}: ${error.message}`,
        { cause: error },
      );
    }
  }

  console.log(
    `Migration complete. Moved ${migratedCount} product image(s) to Cloudinary.`,
  );
}

migrate()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
