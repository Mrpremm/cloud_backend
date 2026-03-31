const { z } = require("zod");

// ─── File Upload Init ────────────────────────
const fileInitSchema = z.object({
  name: z.string().min(1, "File name is required").max(255),
  mimeType: z.string().min(1, "MIME type is required"),
  size: z.number().int().positive("Size must be positive"),
  folderId: z.string().uuid("Invalid folder ID").optional().nullable(),
});

// ─── File Upload Complete ────────────────────
const fileCompleteSchema = z.object({
  fileId: z.string().uuid("Invalid file ID"),
});

// ─── File Update (rename / move) ─────────────
const fileUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  folderId: z.string().uuid("Invalid folder ID").optional().nullable(),
});

// ─── Folder Create ───────────────────────────
const folderCreateSchema = z.object({
  name: z
    .string({ required_error: "Folder name is required" })
    .min(1, "Folder name is required")
    .max(255),
  parentId: z.string().uuid("Invalid parent folder ID").optional().nullable(),
});

// ─── Folder Update ───────────────────────────
const folderUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  parentId: z.string().uuid("Invalid parent folder ID").optional().nullable(),
});

// ─── Share ───────────────────────────────────
const shareCreateSchema = z.object({
  resourceType: z.enum(["file", "folder"], {
    required_error: "resourceType is required (file | folder)",
  }),
  resourceId: z.string().uuid("Invalid resource ID"),
  sharedWithEmail: z
    .string({ required_error: "Recipient email is required" })
    .email("Invalid email"),
  permission: z.enum(["view", "edit"]).default("view"),
});

// ─── Link Share ──────────────────────────────
const linkShareCreateSchema = z.object({
  resourceType: z.enum(["file", "folder"], {
    required_error: "resourceType is required",
  }),
  resourceId: z.string().uuid("Invalid resource ID"),
  permission: z.enum(["view", "edit"]).default("view"),
  expiresAt: z.string().datetime().optional().nullable(),
});

// ─── Star ────────────────────────────────────
const starSchema = z.object({
  fileId: z.string().uuid("Invalid file ID"),
});

// ─── Search Query ────────────────────────────
const searchQuerySchema = z.object({
  q: z.string().min(1, "Search query is required"),
  type: z.enum(["file", "folder", "all"]).default("all"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ─── Trash Restore ───────────────────────────
const trashRestoreSchema = z.object({
  resourceType: z.enum(["file", "folder"]),
  resourceId: z.string().uuid("Invalid resource ID"),
});

module.exports = {
  fileInitSchema,
  fileCompleteSchema,
  fileUpdateSchema,
  folderCreateSchema,
  folderUpdateSchema,
  shareCreateSchema,
  linkShareCreateSchema,
  starSchema,
  searchQuerySchema,
  trashRestoreSchema,
};
