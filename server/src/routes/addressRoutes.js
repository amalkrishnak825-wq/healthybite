
import { Router } from "express";
import protect from "../middleware/authMiddleware.js";
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../controllers/addressController.js";

const router = Router();

router.use(protect);

router.route("/")
  .get(getAddresses)
  .post(createAddress);

router.patch("/:id/default", setDefaultAddress);
router.route("/:id")
  .patch(updateAddress)
  .delete(deleteAddress);

export default router;
