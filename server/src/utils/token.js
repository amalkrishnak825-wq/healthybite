import jwt from "jsonwebtoken";

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "15m" });

export const authCookieOptions = (maxAge) => ({
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  ...(maxAge ? { maxAge } : {}),
});

export const sendAuthCookies = (
  res,
  accessToken,
  refreshToken,
  role = "customer",
) => {
  const isAdmin = role === "admin";
  res.cookie(isAdmin ? "adminToken" : "token", accessToken, {
    ...authCookieOptions(ACCESS_TOKEN_MAX_AGE),
  });
  res.cookie(isAdmin ? "adminRefreshToken" : "refreshToken", refreshToken, {
    ...authCookieOptions(REFRESH_TOKEN_MAX_AGE),
  });
};

export const clearAuthCookies = (res, role = "customer") => {
  const names =
    role === "admin"
      ? ["adminToken", "adminRefreshToken"]
      : ["token", "refreshToken"];
  names.forEach((name) => res.clearCookie(name, authCookieOptions()));
};

