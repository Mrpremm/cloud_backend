const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "refreshsecret";

/**
 * Generate a short-lived access token (15 min).
 */
const generateAccessToken = (userId) =>
  jwt.sign({ userId }, JWT_SECRET, { expiresIn: "15m" });

/**
 * Generate a long-lived refresh token (7 days).
 */
const generateRefreshToken = (userId) =>
  jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: "7d" });

/**
 * Verify an access token and return the payload.
 */
const verifyAccessToken = (token) => jwt.verify(token, JWT_SECRET);

/**
 * Verify a refresh token and return the payload.
 */
const verifyRefreshToken = (token) => jwt.verify(token, REFRESH_SECRET);

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
