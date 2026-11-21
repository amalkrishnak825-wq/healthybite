import { createHash, randomBytes } from "node:crypto";
import RefreshSession from "../models/RefreshSession.js";
import AppError from "../utils/AppError.js";

const REFRESH_IDLE_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const hashToken = (token) =>
  createHash("sha256").update(token).digest("hex");

export const createRefreshSession = async (userId, role = "customer") => {
  const now = Date.now();
  const refreshToken = randomBytes(48).toString("base64url");
  const absoluteExpiresAt = new Date(now + SESSION_MAX_AGE_MS);

  await RefreshSession.create({
    userId,
    role,
    activeTokenHash: hashToken(refreshToken),
    idleExpiresAt: new Date(Math.min(now + REFRESH_IDLE_MS, absoluteExpiresAt)),
    absoluteExpiresAt,
  });

  return refreshToken;
};

export const rotateRefreshSession = async (refreshToken, role = "customer") => {
  if (typeof refreshToken !== "string" || refreshToken.length < 32) {
    throw new AppError("Your session expired. Please sign in again.", 401);
  }

  const presentedHash = hashToken(refreshToken);
  const nextRefreshToken = randomBytes(48).toString("base64url");
  const now = Date.now();
  const currentSession = await RefreshSession.findOne({
    activeTokenHash: presentedHash,
    role,
    revokedAt: null,
    idleExpiresAt: { $gt: new Date(now) },
    absoluteExpiresAt: { $gt: new Date(now) },
  });

  const session = currentSession
    ? await RefreshSession.findOneAndUpdate(
        {
          _id: currentSession._id,
          activeTokenHash: presentedHash,
          revokedAt: null,
          idleExpiresAt: { $gt: new Date(now) },
          absoluteExpiresAt: { $gt: new Date(now) },
        },
        {
          $set: {
            activeTokenHash: hashToken(nextRefreshToken),
            idleExpiresAt: new Date(
              Math.min(
                now + REFRESH_IDLE_MS,
                currentSession.absoluteExpiresAt.getTime(),
              ),
            ),
          },
          $push: { usedTokenHashes: presentedHash },
        },
        { new: true },
      )
    : null;

  if (!session) {
    const reusedSession = await RefreshSession.findOne({
      usedTokenHashes: presentedHash,
      role,
      revokedAt: null,
    });

    if (reusedSession) {
      await RefreshSession.updateOne(
        { _id: reusedSession._id, revokedAt: null },
        { $set: { revokedAt: new Date() } },
      );
    }

    throw new AppError("Your session expired. Please sign in again.", 401);
  }

  return { session, refreshToken: nextRefreshToken };
};

export const revokeRefreshSession = async (refreshToken) => {
  if (typeof refreshToken !== "string" || !refreshToken) return;

  await RefreshSession.updateOne(
    { activeTokenHash: hashToken(refreshToken), revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
};

export const revokeRefreshSessionById = async (sessionId) => {
  await RefreshSession.updateOne(
    { _id: sessionId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
};

export const revokeUserRefreshSessions = async (userId, role) => {
  await RefreshSession.updateMany(
    { userId, ...(role ? { role } : {}), revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
};
