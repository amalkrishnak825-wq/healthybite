import jwt from "jsonwebtoken";

export const signToken = (id, expiresIn = process.env.JWT_EXPIRES_IN) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn });

export const sendTokenCookie = (
  res,
  token,
  { name = "token", maxAge = 7 * 24 * 60 * 60 * 1000 } = {},
) => {
  res.cookie(name, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge,
  });
};
