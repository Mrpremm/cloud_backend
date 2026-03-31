const { ZodError } = require("zod");
const { Prisma } = require("@prisma/client");
const logger = require("../utils/logger");

/**
 * Global error-handling middleware.
 * Must have 4 params so Express recognises it as an error handler.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  // ── Zod validation errors ──────────────────
  if (err instanceof ZodError) {
    // Zod v4 uses `.issues`, Zod v3 used `.errors` — handle both
    const issues = err.issues ?? err.errors ?? [];
    const formatted = issues.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
    return res.status(400).json({ error: "Validation error", details: formatted });
  }

  // ── Prisma known-request errors ────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        return res.status(409).json({
          error: "Duplicate entry",
          field: err.meta?.target,
        });
      case "P2025":
        return res.status(404).json({ error: "Record not found" });
      default:
        logger.error("Prisma error:", err.code, err.message);
        return res.status(500).json({ error: "Database error" });
    }
  }

  // ── Explicit HTTP errors thrown by services ─
  if (err.status || err.statusCode) {
    const code = err.status || err.statusCode;
    return res.status(code).json({ error: err.message || "Error" });
  }

  // ── Fallback ───────────────────────────────
  logger.error("Unhandled error:", err);
  return res.status(500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
};

module.exports = { errorHandler };
