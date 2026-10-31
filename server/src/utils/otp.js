
import crypto from "node:crypto";
import Otp from "../models/Otp.js";
import AppError from "./AppError.js";
import sendEmail from "./sendEmail.js";

const EXPIRY_MS =
  Number(process.env.OTP_EXPIRY_MINUTES || 5) * 60 * 1000;

const COOLDOWN_MS =
  Number(process.env.OTP_RESEND_SECONDS || 30) * 1000;

export const generateOtp = () =>
  crypto.randomInt(0, 1000000).toString().padStart(6, "0");

export const hashOtp = (otp) =>
  crypto.createHash("sha256").update(otp).digest("hex");

export const verifyOtp = (otp, otpHash) =>
  hashOtp(otp) === otpHash;

export const otpMeta = () => ({
  expiresAt: new Date(Date.now() + EXPIRY_MS),
  resendAfterSeconds: COOLDOWN_MS / 1000,
});

export const issueOtp = async ({ email, purpose }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const previousOtp = await Otp.findOne({
    email: normalizedEmail,
    purpose,
  }).sort({ createdAt: -1 });

  const cooldownSeconds = Number(
    process.env.OTP_RESEND_SECONDS || 30
  );

  if (previousOtp) {
    const secondsSinceLastOtp =
      (Date.now() - previousOtp.createdAt.getTime()) / 1000;

    if (secondsSinceLastOtp < cooldownSeconds) {
      throw new AppError(
        "Please wait before requesting another OTP.",
        429
      );
    }
  }

  const otp = generateOtp();

  const otpRecord = await Otp.create({
    email: normalizedEmail,
    otpHash: hashOtp(otp),
    purpose,
    expiresAt: otpMeta().expiresAt,
  });

  
  try {
    const subject =
      purpose === "change-email"
        ? "Your HealthyBite email verification code"
        : purpose === "register"
          ? "Your HealthyBite registration code"
          : "Your HealthyBite password reset code";

    await sendEmail({
      to: normalizedEmail,
      subject,
      html: `<p>Your verification code is <strong>${otp}</strong>.</p>
        <p>This code expires in ${
          Number(process.env.OTP_EXPIRY_MINUTES || 5)
        } minutes.</p>
        <p>If you did not request this code, you can ignore this email.</p>`,
    });
  } catch (error) {
    await Otp.deleteOne({ _id: otpRecord._id });
    throw error;
  }


  return otpMeta();
};

export const checkOtp = async ({ email, purpose, otp }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const otpRecord = await Otp.findOne({
    email: normalizedEmail,
    purpose,
  }).sort({ createdAt: -1 });

  if (!otpRecord || otpRecord.expiresAt <= new Date()) {
    throw new AppError("Invalid or expired OTP.", 400);
  }

  if (otpRecord.attempts >= 5) {
    await Otp.deleteOne({ _id: otpRecord._id });

    throw new AppError(
      "Too many attempts. Please request a new OTP.",
      429
    );
  }

  if (!verifyOtp(otp, otpRecord.otpHash)) {
    otpRecord.attempts += 1;

    if (otpRecord.attempts >= 5) {
      await Otp.deleteOne({ _id: otpRecord._id });

      throw new AppError(
        "Too many attempts. Please request a new OTP.",
        429
      );
    }

    await otpRecord.save();
    throw new AppError("Invalid or expired OTP.", 400);
  }

  await Otp.deleteOne({ _id: otpRecord._id });
};
