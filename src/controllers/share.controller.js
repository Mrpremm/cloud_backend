const prisma = require("../models/prisma");
const storageService = require("../services/storage.service");

// ─── Create Share (user-to-user) ─────────────
const createShare = async (req, res, next) => {
  try {
    const { resourceType, resourceId, sharedWithEmail, permission } = req.body;
    const userId = req.user.userId;

    // Look up recipient
    const recipient = await prisma.user.findUnique({
      where: { email: sharedWithEmail },
    });
    if (!recipient) {
      return res.status(404).json({ error: "User not found" });
    }
    if (recipient.id === userId) {
      return res.status(400).json({ error: "Cannot share with yourself" });
    }

    // Verify ownership of resource
    if (resourceType === "file") {
      const file = await prisma.file.findFirst({
        where: { id: resourceId, userId },
      });
      if (!file) return res.status(404).json({ error: "File not found" });
    } else {
      const folder = await prisma.folder.findFirst({
        where: { id: resourceId, userId },
      });
      if (!folder) return res.status(404).json({ error: "Folder not found" });
    }

    const share = await prisma.share.upsert({
      where: {
        resourceType_resourceId_sharedWithId: {
          resourceType,
          resourceId,
          sharedWithId: recipient.id,
        },
      },
      create: {
        resourceType,
        resourceId,
        ownerId: userId,
        sharedWithId: recipient.id,
        permission,
      },
      update: { permission },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId,
        action: "share",
        resourceType,
        resourceId,
        metadata: { sharedWith: sharedWithEmail, permission },
      },
    });

    return res.status(201).json({ share });
  } catch (err) {
    next(err);
  }
};

// ─── Get Shares for a Resource ───────────────
const getShares = async (req, res, next) => {
  try {
    const { resourceType, resourceId } = req.params;
    const userId = req.user.userId;

    const shares = await prisma.share.findMany({
      where: { resourceType, resourceId, ownerId: userId },
      include: {
        sharedWith: { select: { id: true, name: true, email: true } },
      },
    });

    return res.status(200).json({ shares });
  } catch (err) {
    next(err);
  }
};

// ─── Get Files / Folders Shared With Me ──────
const getSharedWithMe = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const shares = await prisma.share.findMany({
      where: { sharedWithId: userId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch the actual resource for each share
    const results = await Promise.all(
      shares.map(async (share) => {
        let resource = null;
        if (share.resourceType === "file") {
          resource = await prisma.file.findFirst({
            where: { id: share.resourceId, trashedAt: null },
          });
        } else {
          resource = await prisma.folder.findFirst({
            where: { id: share.resourceId, trashedAt: null },
          });
        }
        if (!resource) return null;
        return {
          shareId: share.id,
          permission: share.permission,
          sharedAt: share.createdAt,
          sharedBy: share.owner,
          resourceType: share.resourceType,
          resource,
        };
      })
    );

    // Filter out any shares whose resource was deleted
    const filtered = results.filter(Boolean);

    return res.status(200).json({ shared: filtered });
  } catch (err) {
    next(err);
  }
};

// ─── Delete Share ────────────────────────────
const deleteShare = async (req, res, next) => {
  try {
    const share = await prisma.share.findFirst({
      where: { id: req.params.id, ownerId: req.user.userId },
    });
    if (!share) return res.status(404).json({ error: "Share not found" });

    await prisma.share.delete({ where: { id: req.params.id } });
    return res.status(200).json({ message: "Share removed" });
  } catch (err) {
    next(err);
  }
};

// ─── Create Link Share (public link) ─────────
const createLinkShare = async (req, res, next) => {
  try {
    const { resourceType, resourceId, permission, expiresAt } = req.body;
    const userId = req.user.userId;

    // Verify ownership
    if (resourceType === "file") {
      const file = await prisma.file.findFirst({
        where: { id: resourceId, userId },
      });
      if (!file) return res.status(404).json({ error: "File not found" });
    } else {
      const folder = await prisma.folder.findFirst({
        where: { id: resourceId, userId },
      });
      if (!folder) return res.status(404).json({ error: "Folder not found" });
    }

    const linkShare = await prisma.linkShare.create({
      data: {
        resourceType,
        resourceId,
        userId,
        permission: permission || "view",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return res.status(201).json({ linkShare });
  } catch (err) {
    next(err);
  }
};

// ─── Access Public Link ──────────────────────
const accessLinkShare = async (req, res, next) => {
  try {
    const { token } = req.params;

    const linkShare = await prisma.linkShare.findUnique({
      where: { token },
    });

    if (!linkShare) {
      return res.status(404).json({ error: "Link not found or expired" });
    }

    // Check expiry
    if (linkShare.expiresAt && new Date() > new Date(linkShare.expiresAt)) {
      return res.status(410).json({ error: "Link has expired" });
    }

    // Return resource data
    let resource;
    if (linkShare.resourceType === "file") {
      resource = await prisma.file.findUnique({
        where: { id: linkShare.resourceId },
      });
      if (resource) {
        const signedUrl = await storageService.getSignedUrl(resource.storageKey);
        resource = { ...resource, signedUrl };
      }
    } else {
      resource = await prisma.folder.findUnique({
        where: { id: linkShare.resourceId },
        include: {
          children: { where: { trashedAt: null } },
          files: { where: { trashedAt: null } },
        },
      });
    }

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    return res.status(200).json({
      permission: linkShare.permission,
      resourceType: linkShare.resourceType,
      resource,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Delete Link Share ───────────────────────
const deleteLinkShare = async (req, res, next) => {
  try {
    const linkShare = await prisma.linkShare.findFirst({
      where: { id: req.params.id, userId: req.user.userId },
    });
    if (!linkShare)
      return res.status(404).json({ error: "Link share not found" });

    await prisma.linkShare.delete({ where: { id: req.params.id } });
    return res.status(200).json({ message: "Link share removed" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createShare,
  getShares,
  getSharedWithMe,
  deleteShare,
  createLinkShare,
  accessLinkShare,
  deleteLinkShare,
};
