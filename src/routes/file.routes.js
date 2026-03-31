const { Router } = require("express");
const fileController = require("../controllers/file.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const { uploadLimiter } = require("../middleware/rateLimiter");
const { upload } = require("../middleware/upload.middleware");
const {
  fileInitSchema,
  fileCompleteSchema,
  fileUpdateSchema,
  starSchema,
  searchQuerySchema,
  trashRestoreSchema,
} = require("../validators/file.validator");

const router = Router();

// All routes require authentication
router.use(authenticate);

// ─── File Upload (backend-proxied via multer) ─
// POST /api/files/upload  ← new primary upload endpoint
router.post(
  "/upload",
  uploadLimiter,
  upload.single("file"),
  fileController.uploadFileFull
);

// ─── Legacy two-step upload (kept for backward compat) ─
// POST /api/files/init
router.post(
  "/init",
  uploadLimiter,
  validate(fileInitSchema),
  fileController.initUpload
);

// POST /api/files/complete
router.post(
  "/complete",
  validate(fileCompleteSchema),
  fileController.completeUpload
);

// ─── File CRUD ───────────────────────────────
// GET    /api/files/:id
router.get("/:id", fileController.getFile);

// GET    /api/files/:id/download  ← dedicated signed-URL endpoint
router.get("/:id/download", fileController.getDownloadUrl);

// PATCH  /api/files/:id
router.patch("/:id", validate(fileUpdateSchema), fileController.updateFile);

// DELETE /api/files/:id
router.delete("/:id", fileController.deleteFile);

module.exports = router;
