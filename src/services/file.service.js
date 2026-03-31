const prisma = require("../models/prisma");
const storageService = require("./storage.service");

// ─── Full Upload (backend-proxied) ───────────
// Receives the file buffer from multer, uploads to Supabase via service role,
// then creates the DB record. Single round-trip — no direct client↔Supabase needed.
const uploadFileFull = async (userId, { buffer, originalName, mimeType, size, folderId }) => {
  // Resolve folder
  if (!folderId) {
    const root = await prisma.folder.findFirst({ where: { userId, isRoot: true } });
    if (root) folderId = root.id;
  } else {
    const folder = await prisma.folder.findFirst({
      where: { id: folderId, userId, trashedAt: null },
    });
    if (!folder) throw Object.assign(new Error("Folder not found"), { status: 404 });
  }

  const storageKey = storageService.generateStorageKey(userId, folderId, originalName);

  // Upload to Supabase using the service-role key
  await storageService.uploadFile(storageKey, buffer, mimeType);

  // Create DB record
  const file = await prisma.file.create({
    data: { name: originalName, mimeType, size, storageKey, folderId, userId },
  });

  await prisma.fileVersion.create({
    data: { fileId: file.id, version: 1, storageKey, size },
  });

  await prisma.activity.create({
    data: {
      userId,
      action: "upload",
      resourceType: "file",
      resourceId: file.id,
      metadata: { name: originalName, size: size.toString() },
    },
  });

  return { file };
};

// ─── Init Upload ─────────────────────────────
// Creates a File record & generates a Supabase storage key.
// The client then uploads directly using the storage key.
const initUpload = async (userId, { name, mimeType, size, folderId }) => {
  // Resolve folder — use root if not specified
  if (!folderId) {
    const root = await prisma.folder.findFirst({
      where: { userId, isRoot: true },
    });
    if (root) folderId = root.id;
  } else {
    const folder = await prisma.folder.findFirst({
      where: { id: folderId, userId, trashedAt: null },
    });
    if (!folder) {
      throw Object.assign(new Error("Folder not found"), { status: 404 });
    }
  }

  const storageKey = storageService.generateStorageKey(userId, folderId, name);

  const file = await prisma.file.create({
    data: {
      name,
      mimeType,
      size,
      storageKey,
      folderId,
      userId,
    },
  });

  // Create initial version
  await prisma.fileVersion.create({
    data: {
      fileId: file.id,
      version: 1,
      storageKey,
      size,
    },
  });

  return { file, storageKey };
};

// ─── Complete Upload ─────────────────────────
// Called after the client finishes uploading to Supabase.
const completeUpload = async (userId, { fileId }) => {
  const file = await prisma.file.findFirst({
    where: { id: fileId, userId },
  });

  if (!file) {
    throw Object.assign(new Error("File not found"), { status: 404 });
  }

  // Log activity
  await prisma.activity.create({
    data: {
      userId,
      action: "upload",
      resourceType: "file",
      resourceId: file.id,
      metadata: { name: file.name, size: file.size.toString() },
    },
  });

  // Generate a signed URL for immediate access
  const signedUrl = await storageService.getSignedUrl(file.storageKey);

  return { file, signedUrl };
};

// ─── Get File ────────────────────────────────
const getFile = async (userId, fileId) => {
  const file = await prisma.file.findFirst({
    where: { id: fileId, userId, trashedAt: null },
    include: {
      versions: { orderBy: { version: "desc" } },
      stars: { where: { userId } },
    },
  });

  if (!file) {
    throw Object.assign(new Error("File not found"), { status: 404 });
  }

  // Attempt signed URL — don't let a Supabase hiccup 502 the whole request
  let signedUrl = null;
  try {
    signedUrl = await storageService.getSignedUrl(file.storageKey);
  } catch (e) {
    console.error("[file.service] getFile: failed to get signed URL:", e.message);
  }

  return { ...file, signedUrl, isStarred: file.stars.length > 0 };
};

// ─── Get Download (proxy) ────────────────────
// Downloads the file bytes via service role and returns them + metadata.
// No signed URL needed — works regardless of bucket RLS policies.
// Access allowed if: user is the file owner OR has a share record for this file.
const getDownloadUrl = async (userId, fileId) => {
  // First try: user owns the file
  let file = await prisma.file.findFirst({
    where: { id: fileId, userId, trashedAt: null },
  });

  // Second try: file was shared with this user
  if (!file) {
    const share = await prisma.share.findFirst({
      where: {
        resourceType: "file",
        resourceId: fileId,
        sharedWithId: userId,
      },
    });
    if (share) {
      file = await prisma.file.findFirst({
        where: { id: fileId, trashedAt: null },
      });
    }
  }

  if (!file) {
    throw Object.assign(new Error("File not found or access denied"), { status: 404 });
  }

  console.log("[file.service] downloading via service role, storageKey =", file.storageKey);
  const blob = await storageService.downloadFileBuffer(file.storageKey);

  // Convert Blob → Buffer so we can pipe it in the controller
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return { buffer, fileName: file.name, mimeType: file.mimeType, size: file.size };
};

// ─── Update File (rename / move) ─────────────
const updateFile = async (userId, fileId, data) => {
  const file = await prisma.file.findFirst({
    where: { id: fileId, userId, trashedAt: null },
  });

  if (!file) {
    throw Object.assign(new Error("File not found"), { status: 404 });
  }

  // Validate target folder if moving
  if (data.folderId) {
    const folder = await prisma.folder.findFirst({
      where: { id: data.folderId, userId, trashedAt: null },
    });
    if (!folder) {
      throw Object.assign(new Error("Target folder not found"), { status: 404 });
    }
  }

  const updated = await prisma.file.update({
    where: { id: fileId },
    data,
  });

  const action = data.folderId ? "move" : "rename";
  await prisma.activity.create({
    data: {
      userId,
      action,
      resourceType: "file",
      resourceId: fileId,
      metadata: data,
    },
  });

  return updated;
};

// ─── Soft-Delete File ────────────────────────
const softDeleteFile = async (userId, fileId) => {
  const file = await prisma.file.findFirst({
    where: { id: fileId, userId, trashedAt: null },
  });

  if (!file) {
    throw Object.assign(new Error("File not found"), { status: 404 });
  }

  await prisma.file.update({
    where: { id: fileId },
    data: { trashedAt: new Date() },
  });

  await prisma.activity.create({
    data: {
      userId,
      action: "delete",
      resourceType: "file",
      resourceId: fileId,
      metadata: { name: file.name },
    },
  });

  return { message: "File moved to trash" };
};

// ─── Search Files & Folders ──────────────────
const search = async (userId, { q, type, page, limit }) => {
  const skip = (page - 1) * limit;
  const results = {};

  if (type === "all" || type === "file") {
    const [files, fileCount] = await Promise.all([
      prisma.file.findMany({
        where: {
          userId,
          trashedAt: null,
          name: { contains: q, mode: "insensitive" },
        },
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.file.count({
        where: {
          userId,
          trashedAt: null,
          name: { contains: q, mode: "insensitive" },
        },
      }),
    ]);
    results.files = files;
    results.fileCount = fileCount;
  }

  if (type === "all" || type === "folder") {
    const [folders, folderCount] = await Promise.all([
      prisma.folder.findMany({
        where: {
          userId,
          trashedAt: null,
          isRoot: false,
          name: { contains: q, mode: "insensitive" },
        },
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.folder.count({
        where: {
          userId,
          trashedAt: null,
          isRoot: false,
          name: { contains: q, mode: "insensitive" },
        },
      }),
    ]);
    results.folders = folders;
    results.folderCount = folderCount;
  }

  return { ...results, page, limit };
};

// ─── Star / Unstar ───────────────────────────
const starFile = async (userId, fileId) => {
  // Verify file exists
  const file = await prisma.file.findFirst({
    where: { id: fileId, userId, trashedAt: null },
  });
  if (!file) {
    throw Object.assign(new Error("File not found"), { status: 404 });
  }

  const star = await prisma.star.upsert({
    where: { userId_fileId: { userId, fileId } },
    create: { userId, fileId },
    update: {},
  });

  return star;
};

const unstarFile = async (userId, fileId) => {
  await prisma.star.deleteMany({ where: { userId, fileId } });
  return { message: "Star removed" };
};

const getStarredFiles = async (userId) => {
  const stars = await prisma.star.findMany({
    where: {
      userId,
      file: { trashedAt: null }, // exclude trashed files
    },
    include: {
      file: {
        include: { stars: { where: { userId } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return stars
    .filter((s) => s.file !== null)
    .map((s) => ({ ...s.file, isStarred: true }));
};

// ─── Trash ───────────────────────────────────
const getTrash = async (userId) => {
  const [files, folders] = await Promise.all([
    prisma.file.findMany({
      where: { userId, trashedAt: { not: null } },
      orderBy: { trashedAt: "desc" },
    }),
    prisma.folder.findMany({
      where: { userId, trashedAt: { not: null }, isRoot: false },
      orderBy: { trashedAt: "desc" },
    }),
  ]);

  return { files, folders };
};

const restoreFromTrash = async (userId, { resourceType, resourceId }) => {
  if (resourceType === "file") {
    const file = await prisma.file.findFirst({
      where: { id: resourceId, userId, trashedAt: { not: null } },
    });
    if (!file) throw Object.assign(new Error("File not found in trash"), { status: 404 });

    await prisma.file.update({
      where: { id: resourceId },
      data: { trashedAt: null },
    });

    await prisma.activity.create({
      data: {
        userId,
        action: "restore",
        resourceType: "file",
        resourceId,
      },
    });
  } else {
    const folder = await prisma.folder.findFirst({
      where: { id: resourceId, userId, trashedAt: { not: null } },
    });
    if (!folder) throw Object.assign(new Error("Folder not found in trash"), { status: 404 });

    // Restore folder and its contents recursively
    await restoreFolderRecursive(resourceId);

    await prisma.activity.create({
      data: {
        userId,
        action: "restore",
        resourceType: "folder",
        resourceId,
      },
    });
  }

  return { message: "Restored successfully" };
};

const restoreFolderRecursive = async (folderId) => {
  await prisma.folder.update({
    where: { id: folderId },
    data: { trashedAt: null },
  });

  await prisma.file.updateMany({
    where: { folderId },
    data: { trashedAt: null },
  });

  const children = await prisma.folder.findMany({
    where: { parentId: folderId, trashedAt: { not: null } },
    select: { id: true },
  });

  for (const child of children) {
    await restoreFolderRecursive(child.id);
  }
};

// ─── Permanent Delete ─────────────────────────
// Hard-deletes a trashed file from DB + Supabase storage.
const permanentDelete = async (userId, { resourceType, resourceId }) => {
  if (resourceType === "file") {
    const file = await prisma.file.findFirst({
      where: { id: resourceId, userId, trashedAt: { not: null } },
    });
    if (!file) throw Object.assign(new Error("File not found in trash"), { status: 404 });

    // Delete from storage (silently ignore if already gone)
    try {
      await storageService.deleteFile(file.storageKey);
    } catch (e) {
      console.warn("[file.service] permanentDelete: storage delete skipped:", e.message);
    }

    // Hard-delete all related records first, then the file
    await prisma.star.deleteMany({ where: { fileId: resourceId } });
    await prisma.share.deleteMany({ where: { resourceType: "file", resourceId } });
    await prisma.activity.deleteMany({ where: { resourceType: "file", resourceId } });
    await prisma.file.delete({ where: { id: resourceId } });
  } else {
    const folder = await prisma.folder.findFirst({
      where: { id: resourceId, userId, trashedAt: { not: null } },
    });
    if (!folder) throw Object.assign(new Error("Folder not found in trash"), { status: 404 });

    // Recursively delete folder contents then the folder
    await deleteFolderRecursive(resourceId);
  }

  return { message: "Permanently deleted" };
};

const deleteFolderRecursive = async (folderId) => {
  // Delete all files inside
  const files = await prisma.file.findMany({ where: { folderId } });
  for (const file of files) {
    try { await storageService.deleteFile(file.storageKey); } catch {}
    await prisma.star.deleteMany({ where: { fileId: file.id } });
    await prisma.share.deleteMany({ where: { resourceType: "file", resourceId: file.id } });
  }
  await prisma.file.deleteMany({ where: { folderId } });

  // Recurse into sub-folders
  const children = await prisma.folder.findMany({ where: { parentId: folderId }, select: { id: true } });
  for (const child of children) {
    await deleteFolderRecursive(child.id);
  }

  await prisma.share.deleteMany({ where: { resourceType: "folder", resourceId: folderId } });
  await prisma.folder.delete({ where: { id: folderId } });
};

module.exports = {
  uploadFileFull,
  initUpload,
  completeUpload,
  getFile,
  getDownloadUrl,
  updateFile,
  softDeleteFile,
  search,
  starFile,
  unstarFile,
  getStarredFiles,
  getTrash,
  restoreFromTrash,
  permanentDelete,
};
