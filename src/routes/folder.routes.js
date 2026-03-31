const { Router } = require("express");
const folderController = require("../controllers/folder.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const {
  folderCreateSchema,
  folderUpdateSchema,
} = require("../validators/file.validator");

const router = Router();

// All folder routes require authentication
router.use(authenticate);

// POST   /api/folders
router.post("/", validate(folderCreateSchema), folderController.createFolder);

// GET    /api/folders/:id   (use "root" for root folder)
router.get("/:id", folderController.getFolder);

// PATCH  /api/folders/:id
router.patch("/:id", validate(folderUpdateSchema), folderController.updateFolder);

// DELETE /api/folders/:id
router.delete("/:id", folderController.deleteFolder);

module.exports = router;
