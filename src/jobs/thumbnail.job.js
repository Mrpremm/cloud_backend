/**
 * Thumbnail generation job — stub / placeholder.
 *
 * In production you would hook this up to a job queue (Bull, BullMQ, or a
 * Supabase Edge Function) to generate thumbnails for uploaded images/videos.
 *
 * Example flow:
 *   1. After completeUpload in file.service.js, enqueue a thumbnail job.
 *   2. This worker downloads the file from Supabase Storage.
 *   3. Uses sharp (images) or ffmpeg (video) to create a thumbnail.
 *   4. Uploads the thumbnail back to a "thumbnails/" prefix in the bucket.
 *   5. Updates the File record with a thumbnailKey column.
 *
 * For now this exports a no-op so the file isn't empty.
 */

const logger = require("../utils/logger");

const generateThumbnail = async (fileId, storageKey, mimeType) => {
  logger.debug(
    `[ThumbnailJob] Thumbnail generation requested for file: ${fileId}, key: ${storageKey}, type: ${mimeType}`
  );

  // TODO: implement actual thumbnail generation
  // const sharp = require("sharp");
  // const supabase = require("../config/supabase");
  // ...

  return null;
};

module.exports = { generateThumbnail };
