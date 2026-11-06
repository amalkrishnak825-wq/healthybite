import { useEffect } from "react";
import toast from "react-hot-toast";

export default function useAdminErrorToast(error, clearError) {
  useEffect(() => {
    if (!error) return;
    toast.error(error, { id: "healthy-bite-admin-error", duration: 5000 });
    clearError("");
  }, [error, clearError]);
}
