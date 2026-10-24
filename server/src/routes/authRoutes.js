
import express from "express";
import {
  register,
  verifyRegistrationOtp,
  resendRegistrationOtp,
  login,
  logout,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/verify-otp", verifyRegistrationOtp);
router.post("/resend-otp", resendRegistrationOtp);
router.post("/login", login);
router.post("/logout", logout);

export default router;
