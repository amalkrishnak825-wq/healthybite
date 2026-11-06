import express from "express";
import protect, { protectAdmin } from "../middleware/authMiddleware.js";
import { uploadProductImages } from "../middleware/productUpload.js";
import {
  addCartItem,
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  getAdminCatalogStats,
  getAdminProduct,
  getCart,
  getProduct,
  getWishlist,
  listAdminCategories,
  listAdminProducts,
  listCategories,
  listProducts,
  removeCartItem,
  removeWishlistItem,
  toggleWishlist,
  updateCartItem,
  updateCategory,
  updateProduct,
  validateCheckout,
} from "../controllers/catalogController.js";

const router = express.Router();

router.get("/categories", listCategories);
router.get("/products", listProducts);
router.get("/products/admin", protectAdmin, listAdminProducts);
router.get("/products/admin/stats", protectAdmin, getAdminCatalogStats);
router.get("/products/admin/:id", protectAdmin, getAdminProduct);
router.post("/products", protectAdmin, uploadProductImages, createProduct);
router.patch("/products/:id", protectAdmin, uploadProductImages, updateProduct);
router.delete("/products/:id", protectAdmin, deleteProduct);
router.get("/products/:slug", getProduct);

router.get("/admin/categories", protectAdmin, listAdminCategories);
router.post("/admin/categories", protectAdmin, createCategory);
router.patch("/admin/categories/:id", protectAdmin, updateCategory);
router.delete("/admin/categories/:id", protectAdmin, deleteCategory);

router.get("/cart", protect, getCart);
router.post("/cart/items", protect, addCartItem);
router.patch("/cart/items/:productId", protect, updateCartItem);
router.delete("/cart/items/:productId", protect, removeCartItem);
router.post("/cart/validate-checkout", protect, validateCheckout);

router.get("/wishlist", protect, getWishlist);
router.post("/wishlist/:productId", protect, toggleWishlist);
router.delete("/wishlist/:productId", protect, removeWishlistItem);

export default router;
