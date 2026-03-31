const prisma = require("../models/prisma");

// ─── Create Folder ───────────────────────────
const createFolder = async (userId, { name, parentId }) => {
  // If parentId is given, verify it belongs to user
  if (parentId) {
    const parent = await prisma.folder.findFirst({
      where: { id: parentId, userId, trashedAt: null },
    });
    if (!parent) {
      throw Object.assign(new Error("Parent folder not found"), { status: 404 });
    }
  } else {
    // Default to root folder
    const root = await prisma.folder.findFirst({
      where: { userId, isRoot: true },
    });
    if (root) parentId = root.id;
  }

  const folder = await prisma.folder.create({
    data: { name, parentId, userId },
  });

  // Log activity
  await prisma.activity.create({
    data: {
      userId,
      action: "create",
      resourceType: "folder",
      resourceId: folder.id,
      metadata: { name },
    },
  });

  return folder;
};

// ─── Get Folder with Children ────────────────
const getFolder = async (userId, folderId) => {
  const folder = await prisma.folder.findFirst({
    where: { id: folderId, userId, trashedAt: null },
    include: {
      children: {
        where: { trashedAt: null },
        orderBy: { name: "asc" },
      },
      files: {
        where: { trashedAt: null },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!folder) {
    throw Object.assign(new Error("Folder not found"), { status: 404 });
  }

  return folder;
};

// ─── Get Root Folder ─────────────────────────
const getRootFolder = async (userId) => {
  const root = await prisma.folder.findFirst({
    where: { userId, isRoot: true },
    include: {
      children: {
        where: { trashedAt: null },
        orderBy: { name: "asc" },
      },
      files: {
        where: { trashedAt: null },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!root) {
    throw Object.assign(new Error("Root folder not found"), { status: 404 });
  }

  return root;
};

// ─── Update Folder (rename / move) ───────────
const updateFolder = async (userId, folderId, data) => {
  const folder = await prisma.folder.findFirst({
    where: { id: folderId, userId, trashedAt: null, isRoot: false },
  });

  if (!folder) {
    throw Object.assign(new Error("Folder not found or cannot modify root folder"), { status: 404 });
  }

  // Prevent moving a folder into itself or its descendants
  if (data.parentId) {
    if (data.parentId === folderId) {
      throw Object.assign(new Error("Cannot move folder into itself"), { status: 400 });
    }
    const parent = await prisma.folder.findFirst({
      where: { id: data.parentId, userId, trashedAt: null },
    });
    if (!parent) {
      throw Object.assign(new Error("Target parent folder not found"), { status: 404 });
    }
  }

  const updated = await prisma.folder.update({
    where: { id: folderId },
    data,
  });

  // Log activity
  const action = data.parentId ? "move" : "rename";
  await prisma.activity.create({
    data: {
      userId,
      action,
      resourceType: "folder",
      resourceId: folderId,
      metadata: data,
    },
  });

  return updated;
};

// ─── Soft-Delete Folder (cascade to children & files) ─
const deleteFolder = async (userId, folderId) => {
  const folder = await prisma.folder.findFirst({
    where: { id: folderId, userId, isRoot: false },
  });

  if (!folder) {
    throw Object.assign(new Error("Folder not found or cannot delete root folder"), { status: 404 });
  }

  const now = new Date();

  // Recursively trash all sub-folders and files
  await trashFolderRecursive(folderId, now);

  await prisma.activity.create({
    data: {
      userId,
      action: "delete",
      resourceType: "folder",
      resourceId: folderId,
      metadata: { name: folder.name },
    },
  });

  return { message: "Folder moved to trash" };
};

/**
 * Recursively set trashedAt on a folder, its children, and files.
 */
const trashFolderRecursive = async (folderId, trashedAt) => {
  // Trash the folder itself
  await prisma.folder.update({
    where: { id: folderId },
    data: { trashedAt },
  });

  // Trash direct files
  await prisma.file.updateMany({
    where: { folderId },
    data: { trashedAt },
  });

  // Recurse into child folders
  const children = await prisma.folder.findMany({
    where: { parentId: folderId, trashedAt: null },
    select: { id: true },
  });

  for (const child of children) {
    await trashFolderRecursive(child.id, trashedAt);
  }
};

module.exports = {
  createFolder,
  getFolder,
  getRootFolder,
  updateFolder,
  deleteFolder,
};
