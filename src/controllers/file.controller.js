const fileService = require("../services/file.service");

// ─── Upload File (backend-proxied, multer) ────
const uploadFileFull = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }
    const { originalname, mimetype, size, buffer } = req.file;
    const folderId = req.body.folderId || null;

    const result = await fileService.uploadFileFull(req.user.userId, {
      buffer,
      originalName: originalname,
      mimeType: mimetype,
      size,
      folderId,
    });
    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

// ─── Init Upload ─────────────────────────────
const initUpload = async (req, res, next) => {
  try {
    const result = await fileService.initUpload(req.user.userId, req.body);
    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

// ─── Complete Upload ─────────────────────────
const completeUpload = async (req, res, next) => {
  try {
    const result = await fileService.completeUpload(req.user.userId, req.body);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ─── Get File ────────────────────────────────
const getFile = async (req, res, next) => {
  try {
    const file = await fileService.getFile(req.user.userId, req.params.id);
    return res.status(200).json({ file });
  } catch (err) {
    next(err);
  }
};

// ─── Download File (proxy stream) ────────────
const getDownloadUrl = async (req, res, next) => {
  try {
    const { buffer, fileName, mimeType, size } = await fileService.getDownloadUrl(
      req.user.userId,
      req.params.id
    );

    // Encode filename for Content-Disposition (handles spaces and special chars)
    const encodedName = encodeURIComponent(fileName).replace(/'/g, "%27");

    res.setHeader("Content-Type", mimeType || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`
    );
    res.setHeader("Content-Length", size || buffer.length);
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).send(buffer);
  } catch (err) {
    next(err);
  }
};

// ─── Update File ─────────────────────────────
const updateFile = async (req, res, next) => {
  try {
    const file = await fileService.updateFile(
      req.user.userId,
      req.params.id,
      req.body
    );
    return res.status(200).json({ file });
  } catch (err) {
    next(err);
  }
};

// ─── Delete File (soft) ──────────────────────
const deleteFile = async (req, res, next) => {
  try {
    const result = await fileService.softDeleteFile(
      req.user.userId,
      req.params.id
    );
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ─── Search ──────────────────────────────────
const searchFiles = async (req, res, next) => {
  try {
    const results = await fileService.search(req.user.userId, req.query);
    return res.status(200).json(results);
  } catch (err) {
    next(err);
  }
};

// ─── Star File ───────────────────────────────
const starFile = async (req, res, next) => {
  try {
    const star = await fileService.starFile(req.user.userId, req.body.fileId);
    return res.status(201).json({ star });
  } catch (err) {
    next(err);
  }
};

// ─── Unstar File ─────────────────────────────
const unstarFile = async (req, res, next) => {
  try {
    const result = await fileService.unstarFile(
      req.user.userId,
      req.body.fileId
    );
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ─── Get Starred ─────────────────────────────
const getStarred = async (req, res, next) => {
  try {
    const files = await fileService.getStarredFiles(req.user.userId);
    return res.status(200).json({ files });
  } catch (err) {
    next(err);
  }
};

// ─── Get Trash ───────────────────────────────
const getTrash = async (req, res, next) => {
  try {
    const trash = await fileService.getTrash(req.user.userId);
    return res.status(200).json(trash);
  } catch (err) {
    next(err);
  }
};

// ─── Restore from Trash ─────────────────────
const restoreFromTrash = async (req, res, next) => {
  try {
    const result = await fileService.restoreFromTrash(
      req.user.userId,
      req.body
    );
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ─── Permanent Delete ─────────────────────────
const permanentDeleteFile = async (req, res, next) => {
  try {
    const result = await fileService.permanentDelete(
      req.user.userId,
      req.body  // { resourceType, resourceId }
    );
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadFileFull,
  initUpload,
  completeUpload,
  getFile,
  getDownloadUrl,
  updateFile,
  deleteFile,
  searchFiles,
  starFile,
  unstarFile,
  getStarred,
  getTrash,
  restoreFromTrash,
  permanentDeleteFile,
};
