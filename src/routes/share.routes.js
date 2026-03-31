const { Router } = require("express");
const shareController = require("../controllers/share.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const {
  shareCreateSchema,
  linkShareCreateSchema,
} = require("../validators/file.validator");

const router = Router();

// ═══════════════════════════════════════════════
// User-to-User Shares  (all require auth)
// ═══════════════════════════════════════════════

// GET    /api/shares/shared-with-me
router.get("/shares/shared-with-me", authenticate, shareController.getSharedWithMe);

// POST   /api/shares
router.post("/shares", authenticate, validate(shareCreateSchema), shareController.createShare);

// GET    /api/shares/:resourceType/:resourceId
router.get("/shares/:resourceType/:resourceId", authenticate, shareController.getShares);

// DELETE /api/shares/:id
router.delete("/shares/:id", authenticate, shareController.deleteShare);

// ═══════════════════════════════════════════════
// Public Link Shares
// ═══════════════════════════════════════════════

// POST   /api/link-shares   (auth)
router.post(
  "/link-shares",
  authenticate,
  validate(linkShareCreateSchema),
  shareController.createLinkShare
);

// DELETE /api/link-shares/:id   (auth)
router.delete("/link-shares/:id", authenticate, shareController.deleteLinkShare);

// GET    /api/link/:token   (public — no auth required)
router.get("/link/:token", shareController.accessLinkShare);

module.exports = router;
