import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import GuestRoute from "./components/GuestRoute";
import AccountPage from "./pages/AccountPage";
import AddressFormPage from "./pages/AddressFormPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import OtpPage from "./pages/OtpPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ResetSuccessPage from "./pages/ResetSuccessPage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminCustomerPage from "./pages/AdminCustomerPage";
import AdminCatalogPage from "./pages/AdminCatalogPage";
import AdminMealEditorPage from "./pages/AdminMealEditorPage";
import CatalogPage from "./pages/CatalogPage";
import ProductPage from "./pages/ProductPage";
import CartPage from "./pages/CartPage";
import WishlistPage from "./pages/WishlistPage";
import OrdersPage from "./pages/OrdersPage";
import "./styles/Admin.css";
import "./styles/NativeValidation.css";

function AdminRoute({ detail = false, catalog = false, mealEditor = false }) {
  const admin = sessionStorage.getItem("healthyBiteAdmin") === "true";
  return admin ? (mealEditor ? <AdminMealEditorPage /> : catalog ? <AdminCatalogPage /> : detail ? <AdminCustomerPage /> : <AdminUsersPage />) : <Navigate to="/admin/login" replace />;
}

export default function App() {
  useEffect(() => {
    function showInlineValidation(event) {
      const field = event.target;
      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) return;
      event.preventDefault();
      const message = field.validity.valueMissing ? "Please fill in this field." : (field.validationMessage || "Please check this field.");
      if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
        if (!field.classList.contains("field-validation-hint")) {
          field.dataset.originalPlaceholder = field.getAttribute("placeholder") || "";
        }
        field.placeholder = message;
        field.classList.add("field-validation-hint");
      } else {
        field.classList.add("field-validation-hint");
        field.dataset.validationMessage = message;
        let helper = field.nextElementSibling;
        if (!helper?.classList.contains("native-validation-message")) {
          helper = document.createElement("span");
          helper.className = "native-validation-message";
          field.insertAdjacentElement("afterend", helper);
        }
        helper.textContent = message;
      }
    }

    function clearInlineValidation(event) {
      const field = event.target;
      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) return;
      field.classList.remove("field-validation-hint");
      if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
        field.setAttribute("placeholder", field.dataset.originalPlaceholder || "");
        delete field.dataset.originalPlaceholder;
      } else if (field.nextElementSibling?.classList.contains("native-validation-message")) {
        field.nextElementSibling.remove();
      }
      delete field.dataset.validationMessage;
    }

    document.addEventListener("invalid", showInlineValidation, true);
    document.addEventListener("input", clearInlineValidation, true);
    document.addEventListener("change", clearInlineValidation, true);
    return () => {
      document.removeEventListener("invalid", showInlineValidation, true);
      document.removeEventListener("input", clearInlineValidation, true);
      document.removeEventListener("change", clearInlineValidation, true);
    };
  }, []);

  return <BrowserRouter><AuthProvider><Toaster position="top-center" toastOptions={{ style: { fontSize: 14 } }} /><Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/products" element={<CatalogPage />} />
    <Route path="/products/:slug" element={<ProductPage />} />
    <Route element={<GuestRoute />}><Route path="/login" element={<LoginPage />} /><Route path="/register" element={<RegisterPage />} /><Route path="/verify-email" element={<OtpPage mode="register" />} /></Route>
    <Route path="/forgot-password" element={<ForgotPasswordPage />} /><Route path="/forgot-password/verify" element={<OtpPage mode="reset" />} /><Route path="/reset-password" element={<ResetPasswordPage />} /><Route path="/password-reset-success" element={<ResetSuccessPage />} />
    <Route path="/account" element={<AccountPage />} />
    <Route element={<ProtectedRoute />}><Route path="/account/profile" element={<ProfilePage />} /><Route path="/account/addresses/new" element={<AddressFormPage />} /><Route path="/account/addresses/:id/edit" element={<AddressFormPage />} /></Route>
    <Route element={<ProtectedRoute />}><Route path="/cart" element={<CartPage />} /><Route path="/wishlist" element={<WishlistPage />} /><Route path="/orders" element={<OrdersPage />} /></Route>
    <Route path="/admin/login" element={<AdminLoginPage />} /><Route path="/admin/catalog" element={<AdminRoute catalog />} /><Route path="/admin/catalog/new" element={<AdminRoute mealEditor />} /><Route path="/admin/catalog/:productId/edit" element={<AdminRoute mealEditor />} /><Route path="/admin/users" element={<AdminRoute />} /><Route path="/admin/users/:id" element={<AdminRoute detail />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AuthProvider></BrowserRouter>;
}
