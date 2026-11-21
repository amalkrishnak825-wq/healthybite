import jwt from "jsonwebtoken";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";

const authenticate = async (token, refreshToken, res) => {
  if (!token) {
    if (refreshToken) res.setHeader("X-Auth-Refreshable", "true");
    throw new AppError("Please log in to access this resource.", 401);
  }

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    if (refreshToken) res.setHeader("X-Auth-Refreshable", "true");
    throw new AppError("Session expired. Please log in again.", 401);
  }

  const user = await User.findById(decoded.id);

  if (!user) {
    throw new AppError("User no longer exists.", 401);
  }

  if (user.isBlocked) {
    throw new AppError(
      "Your account has been blocked by an administrator. Please contact HealthyBite support.",
      403,
    );
  }

  if (
    user.passwordChangedAt &&
    decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)
  ) {
    throw new AppError("Password was changed. Please log in again.", 401);
  }

  return user;
};

const protect = asyncHandler(async (req, res, next) => {
  let token = req.cookies?.token;
  const refreshToken = req.cookies?.refreshToken;

  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  req.user = await authenticate(token, refreshToken, res);
  next();
});

export const protectAdmin = asyncHandler(async (req, res, next) => {
  const user = await authenticate(
    req.cookies?.adminToken,
    req.cookies?.adminRefreshToken,
    res,
  );

  if (user.role !== "admin") {
    throw new AppError("Admin access required.", 403);
  }

  req.admin = user;
  next();
});

export default protect;
