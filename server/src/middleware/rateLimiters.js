import rateLimit from "express-rate-limit";

const make = ({ windowMs, limit, message }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({
        success: false,
        message,
      }),
  });

const MIN = 60 * 1000;

export const apiLimiter = make({
  windowMs: 15 * MIN,
  limit: 300,
  message: "Too many requests. Please slow down.",
});

export const loginLimiter = make({
  windowMs: 15 * MIN,
  limit: 10,
  message: "Too many login attempts. Try again in 15 minutes.",
});

export const adminLoginLimiter = make({
  windowMs: 15 * MIN,
  limit: 5,
  message: "Too many admin login attempts. Try again in 15 minutes.",
});

export const refreshLimiter = make({
  windowMs: 15 * MIN,
  limit: 60,
  message: "Too many session refreshes. Please try again later.",
});

export const registerLimiter = make({
  windowMs: 60 * MIN,
  limit: 10,
  message: "Too many sign-up attempts. Try again later.",
});

export const otpLimiter = make({
  windowMs: 15 * MIN,
  limit: 10,
  message: "Too many OTP requests. Try again in 15 minutes.",
});
