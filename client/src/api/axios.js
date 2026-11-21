import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? "http://localhost:5000/api" : "/api"),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

const refreshPromises = {
  customer: null,
  admin: null,
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const refreshable =
      error.response?.headers?.["x-auth-refreshable"] === "true";
    const requestUrl = originalRequest?.url || "";
    const isAuthEndpoint = /\/auth\/(login|register|google|refresh|logout|admin\/login|admin\/refresh|admin\/logout|forgot-password|verify-reset-otp|reset-password|verify-otp|resend-otp)(?:$|[/?])/.test(
      requestUrl,
    );

    if (
      error.response?.status !== 401 ||
      !refreshable ||
      !originalRequest ||
      originalRequest._refreshRetried ||
      isAuthEndpoint
    ) {
      return Promise.reject(error);
    }

    originalRequest._refreshRetried = true;
    const role = /(^|\/)admin\//.test(requestUrl) ? "admin" : "customer";
    const refreshUrl =
      role === "admin" ? "/auth/admin/refresh" : "/auth/refresh";

    try {
      if (!refreshPromises[role]) {
        refreshPromises[role] = api
          .post(refreshUrl)
          .finally(() => {
            refreshPromises[role] = null;
          });
      }

      await refreshPromises[role];
      return api(originalRequest);
    } catch {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("healthyBite:session-expired"));
      }
      return Promise.reject(error);
    }
  },
);

export function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    "Something went wrong. Please try again."
  );
}

export function getFieldErrors(error) {
  const errors = error.response?.data?.errors;

  if (!Array.isArray(errors)) {
    return {};
  }

  return errors.reduce((result, item) => {
    if (item.field && item.message) {
      result[item.field] = item.message;
    }

    return result;
  }, {});
}

export default api;
