import { Router } from "express";
import protect from "../middleware/authMiddleware.js";
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getPincodeDetails,
} from "../controllers/addressController.js";
import { postalLookupLimiter } from "../middleware/rateLimiters.js";

const router = Router();

router.use(protect);

router.get("/pincode/:pincode", postalLookupLimiter, getPincodeDetails);

router.route("/").get(getAddresses).post(createAddress);

router.patch("/:id/default", setDefaultAddress);
router.route("/:id").patch(updateAddress).delete(deleteAddress);

export default router;
