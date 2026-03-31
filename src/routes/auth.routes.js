const { Router } = require("express");
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const { authLimiter } = require("../middleware/rateLimiter");
const { registerSchema, loginSchema } = require("../validators/auth.validator");

const router = Router();

// POST /api/auth/register
router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  authController.register
);

// POST /api/auth/login
router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  authController.login
);

// POST /api/auth/refresh
router.post("/refresh", authController.refreshToken);

// POST /api/auth/logout  (requires auth)
router.post("/logout", authenticate, authController.logout);

// GET /api/auth/me  (requires auth)
router.get("/me", authenticate, authController.getMe);

module.exports = router;
