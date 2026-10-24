
import crypto from "crypto";

export const generateOtp = () =>
  crypto.randomInt(0, 1000000).toString().padStart(6, "0");

export const hashOtp = (otp) =>
  crypto.createHash("sha256").update(otp).digest("hex");

export const verifyOtp = (otp, otpHash) =>
  hashOtp(otp) === otpHash;
