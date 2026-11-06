import express from "express";
import { protectAdmin } from "../middleware/authMiddleware.js";
import {
  registerLimiter,
  loginLimiter,
  adminLoginLimiter,
  otpLimiter,
} from "../middleware/rateLimiters.js";
import {
  register,
  verifyRegistrationOtp,
  resendRegistrationOtp,
  login,
  logout,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  adminLogin,
  listUsers,
  customerSummary,
  getCustomer,
  updateCustomer,
  setUserBlocked,
} from "../controllers/authController.js";
import { googleLogin } from "../controllers/googleAuthController.js";

const router = express.Router();

router.post("/register", registerLimiter, register);
router.post("/verify-otp", otpLimiter, verifyRegistrationOtp);
router.post("/resend-otp", otpLimiter, resendRegistrationOtp);
router.post("/login", loginLimiter, login);
router.post("/admin/login", adminLoginLimiter, adminLogin);
router.post("/admin/logout", logout);
router.get("/admin/customers/summary", protectAdmin, customerSummary);
router.get("/admin/users/:id", protectAdmin, getCustomer);
router.patch("/admin/users/:id", protectAdmin, updateCustomer);
router.get("/admin/users", protectAdmin, listUsers);
router.patch("/admin/users/:id/block", protectAdmin, setUserBlocked);
router.post("/logout", logout);
router.post("/forgot-password", otpLimiter, forgotPassword);
router.post("/verify-reset-otp", otpLimiter, verifyResetOtp);
router.post("/reset-password", otpLimiter, resetPassword);
router.post("/google", googleLogin);

export default router;
