require("dotenv").config();

// Fix BigInt serialization for JSON responses (Prisma returns sizes as BigInt)
BigInt.prototype.toJSON = function () {
  return this.toString();
};

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const { globalLimiter } = require("./middleware/rateLimiter");
const { errorHandler } = require("./middleware/error.middleware");

// ─── Route imports ───────────────────────────
const authRoutes = require("./routes/auth.routes");
const folderRoutes = require("./routes/folder.routes");
const fileRoutes = require("./routes/file.routes");
const shareRoutes = require("./routes/share.routes");

// ─── File controller (for search/stars/trash mounted separately) ──
const fileController = require("./controllers/file.controller");
const { authenticate } = require("./middleware/auth.middleware");
const { validate } = require("./middleware/validate.middleware");
const {
  searchQuerySchema,
  starSchema,
  trashRestoreSchema,
} = require("./validators/file.validator");

const app = express();

// ═══════════════════════════════════════════════
// Global Middleware
// ═══════════════════════════════════════════════

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);

// Request logging
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Cookie parser (for refresh token httpOnly cookies)
app.use(cookieParser());

// Global rate limiter
app.use(globalLimiter);

// ═══════════════════════════════════════════════
// Health check
// ═══════════════════════════════════════════════
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() })
);

// ═══════════════════════════════════════════════
// API Routes
// ═══════════════════════════════════════════════

// Auth
app.use("/api/auth", authRoutes);

// Folders
app.use("/api/folders", folderRoutes);

// Files
app.use("/api/files", fileRoutes);

// Shares & Link Shares (mounted at /api so sub-paths work)
app.use("/api", shareRoutes);

// ─── Search ──────────────────────────────────
app.get(
  "/api/search",
  authenticate,
  validate(searchQuerySchema, "query"),
  fileController.searchFiles
);

// ─── Stars ───────────────────────────────────
app.get("/api/stars", authenticate, fileController.getStarred);
app.post(
  "/api/stars",
  authenticate,
  validate(starSchema),
  fileController.starFile
);
app.delete("/api/stars", authenticate, validate(starSchema), fileController.unstarFile);

// ─── Trash ───────────────────────────────────
app.get("/api/trash", authenticate, fileController.getTrash);
app.post(
  "/api/trash/restore",
  authenticate,
  validate(trashRestoreSchema),
  fileController.restoreFromTrash
);
app.delete(
  "/api/trash/permanent",
  authenticate,
  validate(trashRestoreSchema),
  fileController.permanentDeleteFile
);

// ═══════════════════════════════════════════════
// 404 handler
// ═══════════════════════════════════════════════
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ═══════════════════════════════════════════════
// Error handler (must be last)
// ═══════════════════════════════════════════════
app.use(errorHandler);

module.exports = app;
