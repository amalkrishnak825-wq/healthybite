import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { signToken, sendTokenCookie } from "../utils/token.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    throw new AppError("Google credential is required.", 400);
  }

  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload?.email || !payload.email_verified) {
    throw new AppError("Google email is not verified.", 401);
  }

  const email = payload.email.toLowerCase();
  const googleId = payload.sub;
  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name: payload.name || email.split("@")[0],
      email,
      googleId,
      profileImage: payload.picture || "",
      isVerified: true,
      role: "customer",
    });
  } else {
    if (user.isBlocked) {
      throw new AppError("Your account has been blocked.", 403);
    }

    if (user.googleId && user.googleId !== googleId) {
      throw new AppError(
        "This email is linked to a different Google account.",
        409,
      );
    }

    if (!user.googleId) {
      user.googleId = googleId;
      user.isVerified = true;
      if (!user.profileImage && payload.picture)
        user.profileImage = payload.picture;
      await user.save();
    }
  }

  const token = signToken(user._id);
  sendTokenCookie(res, token);

  res.status(200).json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});
