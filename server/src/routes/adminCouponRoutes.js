import express from "express";
import { protectAdmin } from "../middleware/authMiddleware.js";
import {
  createAdminCoupon,
  listAdminCoupons,
  updateAdminCoupon,
} from "../controllers/adminCouponController.js";

const router = express.Router();

router.use(protectAdmin);
router.get("/", listAdminCoupons);
router.post("/", createAdminCoupon);
router.patch("/:id", updateAdminCoupon);

export default router;
