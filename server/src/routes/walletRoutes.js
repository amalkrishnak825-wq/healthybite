import express from "express";
import protect from "../middleware/authMiddleware.js";
import { getMyWallet } from "../controllers/walletController.js";

const router = express.Router();
router.use(protect);
router.get("/", getMyWallet);
export default router;
