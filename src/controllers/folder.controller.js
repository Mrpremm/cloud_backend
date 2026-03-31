const folderService = require("../services/folder.service");

// ─── Create Folder ───────────────────────────
const createFolder = async (req, res, next) => {
  try {
    const folder = await folderService.createFolder(req.user.userId, req.body);
    return res.status(201).json({ folder });
  } catch (err) {
    next(err);
  }
};

// ─── Get Folder ──────────────────────────────
const getFolder = async (req, res, next) => {
  try {
    const { id } = req.params;
    let folder;

    if (id === "root") {
      folder = await folderService.getRootFolder(req.user.userId);
    } else {
      folder = await folderService.getFolder(req.user.userId, id);
    }

    return res.status(200).json({ folder });
  } catch (err) {
    next(err);
  }
};

// ─── Update Folder ───────────────────────────
const updateFolder = async (req, res, next) => {
  try {
    const folder = await folderService.updateFolder(
      req.user.userId,
      req.params.id,
      req.body
    );
    return res.status(200).json({ folder });
  } catch (err) {
    next(err);
  }
};

// ─── Delete Folder (soft) ────────────────────
const deleteFolder = async (req, res, next) => {
  try {
    const result = await folderService.deleteFolder(
      req.user.userId,
      req.params.id
    );
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = { createFolder, getFolder, updateFolder, deleteFolder };
