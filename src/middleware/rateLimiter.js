const rateLimit = require("express-rate-limit");

/**
 * General API rate limiter — 100 requests per 15 min window.
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

/**
 * Stricter limiter for auth endpoints — 20 requests per 15 min.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts, please try again later." },
});

/**
 * Upload limiter — 30 uploads per 15 min.
 */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Upload rate limit exceeded." },
});

module.exports = { globalLimiter, authLimiter, uploadLimiter };
