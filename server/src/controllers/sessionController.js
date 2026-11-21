import User from "../models/User.js";
import Otp from "../models/Otp.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import sendEmail from "../utils/sendEmail.js";
import { generateOtp, hashOtp, otpMeta, verifyOtp } from "../utils/otp.js";
import {
  signToken,
  sendAuthCookies,
  clearAuthCookies,
} from "../utils/token.js";
import {
  createRefreshSession,
  rotateRefreshSession,
  revokeRefreshSession,
  revokeRefreshSessionById,
  revokeUserRefreshSessions,
} from "../services/refreshSessionService.js";
import { isValidPersonName } from "../utils/inputValidation.js";
const registrationEmailPattern =
  /^[^\s@]{2,}@[a-z\d](?:[a-z\d-]*[a-z\d])?(?:\.[a-z\d](?:[a-z\d-]*[a-z\d])?)+$/i;

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    !name.trim() ||
    !email.trim() ||
    !password
  ) {
    throw new AppError("Name, email, and password are required.", 400);
  }

  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (
    !isValidPersonName(normalizedName, { max: 80 })
  ) {
    throw new AppError(
      "Name must be 2–80 characters and contain letters only, with spaces, hyphens, apostrophes, or periods allowed.",
      400,
    );
  }
  if (!registrationEmailPattern.test(normalizedEmail)) {
    throw new AppError(
      "Enter a valid email with at least 2 characters before @.",
      400,
    );
  }

  const existingUser = await User.findOne({
    email: normalizedEmail,
  });

  if (existingUser?.isVerified) {
    throw new AppError("An account with this email already exists.", 409);
  }

  if (password.length < 8) {
    throw new AppError("Password must be at least 8 characters.", 400);
  }

  const otp = generateOtp();
  const otpHash = hashOtp(otp);

  await Otp.deleteMany({
    email: normalizedEmail,
    purpose: "register",
  });

  await Otp.create({
    email: normalizedEmail,
    otpHash,
    purpose: "register",
    expiresAt: new Date(
      Date.now() + Number(process.env.OTP_EXPIRY_MINUTES || 5) * 60 * 1000,
    ),
  });

  try {
    await sendEmail({
      to: normalizedEmail,
      subject: "HealthyBite email verification",
      html: `<p>Your HealthyBite verification code is <strong>${otp}</strong>.</p>
             <p>This code expires in ${Number(process.env.OTP_EXPIRY_MINUTES || 5)} minutes.</p>`,
    });
  } catch (error) {
    await Otp.deleteMany({
      email: normalizedEmail,
      purpose: "register",
    });
    throw error;
  }

  res.status(200).json({
    success: true,
    message: "Verification code sent to your email.",
  });
});

export const resendRegistrationOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError("Email is required.", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({
    email: normalizedEmail,
    isVerified: true,
  });

  if (existingUser) {
    throw new AppError("An account with this email already exists.", 409);
  }

  const previousOtp = await Otp.findOne({
    email: normalizedEmail,
    purpose: "register",
  }).sort({ createdAt: -1 });

  if (!previousOtp) {
    throw new AppError(
      "No registration OTP found. Please register first.",
      400,
    );
  }

  const resendCooldown = Number(process.env.OTP_RESEND_SECONDS || 30);

  const secondsSinceLastOtp =
    (Date.now() - previousOtp.createdAt.getTime()) / 1000;

  if (secondsSinceLastOtp < resendCooldown) {
    const waitSeconds = Math.ceil(resendCooldown - secondsSinceLastOtp);

    throw new AppError(
      `Please wait ${waitSeconds} seconds before requesting another OTP.`,
      429,
    );
  }

  const otp = generateOtp();
  const otpHash = hashOtp(otp);

  await Otp.deleteMany({
    email: normalizedEmail,
    purpose: "register",
  });

  const newOtp = await Otp.create({
    email: normalizedEmail,
    otpHash,
    purpose: "register",
    expiresAt: new Date(
      Date.now() + Number(process.env.OTP_EXPIRY_MINUTES || 5) * 60 * 1000,
    ),
  });

  try {
    await sendEmail({
      to: normalizedEmail,
      subject: "Your new HealthyBite verification code",
      html: `<p>Your new HealthyBite verification code is <strong>${otp}</strong>.</p>
             <p>This code expires in ${Number(process.env.OTP_EXPIRY_MINUTES || 5)} minutes.</p>`,
    });
  } catch (error) {
    await Otp.deleteOne({ _id: newOtp._id });
    throw error;
  }

  res.status(200).json({
    success: true,
    message: "A new verification code has been sent to your email.",
  });
});

export const verifyRegistrationOtp = asyncHandler(async (req, res) => {
  const { email, otp, name, password, phone } = req.body;

  if (!email || !otp || !name || !password) {
    throw new AppError("Email, OTP, name, and password are required.", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  const otpRecord = await Otp.findOne({
    email: normalizedEmail,
    purpose: "register",
  }).sort({ createdAt: -1 });

  if (!otpRecord || otpRecord.expiresAt <= new Date()) {
    throw new AppError(
      "OTP is invalid or expired. Please request a new one.",
      400,
    );
  }

  if (otpRecord.attempts >= 5) {
    await Otp.deleteOne({ _id: otpRecord._id });

    throw new AppError("Too many attempts. Please request a new OTP.", 429);
  }

  if (hashOtp(otp) !== otpRecord.otpHash) {
    otpRecord.attempts += 1;

    if (otpRecord.attempts >= 5) {
      await Otp.deleteOne({ _id: otpRecord._id });

      throw new AppError("Too many attempts. Please request a new OTP.", 429);
    }

    await otpRecord.save();

    throw new AppError("Incorrect OTP.", 400);
  }

  const existingUser = await User.findOne({
    email: normalizedEmail,
  });

  if (existingUser?.isVerified) {
    await Otp.deleteOne({ _id: otpRecord._id });
    throw new AppError("An account with this email already exists.", 409);
  }

  const user =
    existingUser ||
    new User({
      name: name.trim(),
      email: normalizedEmail,
      phone,
      password,
    });

  user.name = name.trim();
  if (phone !== undefined) user.phone = phone.trim();
  user.password = password;
  user.isVerified = true;

  await user.save();
  await Otp.deleteOne({ _id: otpRecord._id });

  const token = signToken(user._id.toString());
  const refreshToken = await createRefreshSession(user._id, "customer");
  sendAuthCookies(res, token, refreshToken, "customer");

  res.status(201).json({
    success: true,
    message: "Your HealthyBite account has been created.",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError("Email and password are required.", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({
    email: normalizedEmail,
  }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Invalid email or password.", 401);
  }

  if (!user.isVerified) {
    throw new AppError("Please verify your email first.", 403);
  }

  if (user.isBlocked) {
    throw new AppError(
      "Your account has been blocked by an administrator. Please contact HealthyBite support.",
      403,
    );
  }

  const token = signToken(user._id.toString());
  const refreshToken = await createRefreshSession(user._id, "customer");
  sendAuthCookies(res, token, refreshToken, "customer");

  res.status(200).json({
    success: true,
    message: "Login successful.",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

export const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    throw new AppError("Email and password are required.", 400);
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select(
    "+password",
  );
  if (!user || !(await user.comparePassword(password)))
    throw new AppError("Invalid email or password.", 401);
  if (user.role !== "admin") throw new AppError("Admin access required.", 403);
  const refreshToken = await createRefreshSession(user._id, "admin");
  sendAuthCookies(
    res,
    signToken(user._id.toString()),
    refreshToken,
    "admin",
  );
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

export const logout = asyncHandler(async (req, res) => {
  const role = req.originalUrl.includes("/admin/") ? "admin" : "customer";
  const refreshCookieName =
    role === "admin" ? "adminRefreshToken" : "refreshToken";
  await revokeRefreshSession(req.cookies?.[refreshCookieName]);
  clearAuthCookies(res, role);

  res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
});

const refreshSessionForRole = (role) =>
  asyncHandler(async (req, res) => {
    const cookieName =
      role === "admin" ? "adminRefreshToken" : "refreshToken";
    let rotated;

    try {
      rotated = await rotateRefreshSession(req.cookies?.[cookieName], role);
    } catch (error) {
      clearAuthCookies(res, role);
      throw error;
    }

    const { session, refreshToken } = rotated;
    const user = await User.findById(session.userId);
    const passwordChangedAfterSession =
      user?.passwordChangedAt &&
      session.createdAt.getTime() <= user.passwordChangedAt.getTime();

    if (
      !user ||
      user.isBlocked ||
      (role === "admin" && user.role !== "admin") ||
      passwordChangedAfterSession
    ) {
      if (user) await revokeUserRefreshSessions(user._id, role);
      else await revokeRefreshSessionById(session._id);
      clearAuthCookies(res, role);
      throw new AppError(
        user?.isBlocked
          ? "Your account has been blocked. Please contact HealthyBite support."
          : "Your session expired. Please sign in again.",
        user?.isBlocked ? 403 : 401,
      );
    }

    sendAuthCookies(
      res,
      signToken(user._id.toString()),
      refreshToken,
      role,
    );
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

export const refreshSession = refreshSessionForRole("customer");
export const refreshAdminSession = refreshSessionForRole("admin");

export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      isVerified: req.user.isVerified,
      profileImage: req.user.profileImage,
    },
  });
});
