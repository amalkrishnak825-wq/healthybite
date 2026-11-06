import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import connectDB from "../src/config/db.js";
import User from "../src/models/User.js";
import {
  deleteCloudinaryImages,
  uploadProfilePhoto,
} from "../src/config/cloudinary.js";

const uploadsDirectory = path.resolve(process.cwd(), "uploads", "profile");
const mimeByExtension = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

async function migrate() {
  await connectDB();
  const users = await User.find({ profileImage: /^\/uploads\/profile\// });
  let migratedCount = 0;

  for (const user of users) {
    const localPath = path.resolve(
      uploadsDirectory,
      path.basename(user.profileImage),
    );
    if (!localPath.startsWith(`${uploadsDirectory}${path.sep}`))
      throw new Error(`Unsafe profile photo path for user ${user._id}.`);

    let uploaded;
    try {
      const buffer = await fs.readFile(localPath);
      const extension = path.extname(localPath).toLowerCase();
      uploaded = await uploadProfilePhoto({
        buffer,
        originalname: path.basename(localPath),
        mimetype: mimeByExtension[extension] || "image/webp",
      });
      const oldUrl = user.profileImage;
      user.profileImage = uploaded.url;
      user.profileImagePublicId = uploaded.publicId;
      try {
        await user.save();
      } catch (error) {
        await deleteCloudinaryImages([uploaded]);
        throw error;
      }

      await fs.unlink(localPath).catch(() => {});
      migratedCount += 1;
      console.log(`Migrated profile photo for ${user.email}.`);
    } catch (error) {
      throw new Error(
        `Could not migrate profile photo for user ${user._id}: ${error.message}`,
        { cause: error },
      );
    }
  }

  console.log(
    `Migration complete. Moved ${migratedCount} profile photo(s) to Cloudinary.`,
  );
}

migrate()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
