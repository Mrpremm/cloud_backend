const supabase = require("../config/supabase");

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "drive";

/**
 * Generate a unique storage key for a file.
 * Pattern: <userId>/<folderId|root>/<timestamp>-<originalName>
 */
const generateStorageKey = (userId, folderId, fileName) => {
  const folder = folderId || "root";
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${folder}/${timestamp}-${safeName}`;
};

/**
 * Upload a file buffer to Supabase Storage.
 */
const uploadFile = async (storageKey, fileBuffer, mimeType) => {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(storageKey, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) throw Object.assign(new Error(`Storage upload failed: ${error.message}`), { status: 502 });
  return data;
};

/**
 * Get a signed download URL valid for the given number of seconds.
 */
const getSignedUrl = async (storageKey, expiresIn = 3600) => {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storageKey, expiresIn);

  if (error) {
    console.error("[storage] createSignedUrl failed for key:", storageKey, "| error:", JSON.stringify(error));
    throw Object.assign(new Error(`Failed to create signed URL: ${error.message}`), { status: 502 });
  }
  return data.signedUrl;
};

/**
 * Delete a file from Supabase Storage.
 */
const deleteFile = async (storageKey) => {
  const { error } = await supabase.storage.from(BUCKET).remove([storageKey]);
  if (error) throw Object.assign(new Error(`Storage delete failed: ${error.message}`), { status: 502 });
};

/**
 * Get the public URL (for public buckets — otherwise use signed URLs).
 */
const getPublicUrl = (storageKey) => {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storageKey);
  return data.publicUrl;
};

/**
 * Download a file's raw bytes using the service role (no signed URL needed).
 * Returns a Blob.
 */
const downloadFileBuffer = async (storageKey) => {
  const { data, error } = await supabase.storage.from(BUCKET).download(storageKey);
  if (error) {
    console.error("[storage] download failed for key:", storageKey, "| error:", JSON.stringify(error));
    // Supabase returns statusCode "404" or status 400 for missing objects — map to 404, not 502
    const isNotFound =
      error.statusCode === "404" ||
      error.statusCode === "400" ||
      error.status === 400 ||
      (error.message && error.message.toLowerCase().includes("not found"));
    const httpStatus = isNotFound ? 404 : 502;
    const message = isNotFound
      ? "File not found in storage. It may have been uploaded with the old flow — please re-upload it."
      : `Storage download failed: ${error.message}`;
    throw Object.assign(new Error(message), { status: httpStatus });
  }
  return data; // Blob
};

module.exports = {
  generateStorageKey,
  uploadFile,
  getSignedUrl,
  downloadFileBuffer,
  deleteFile,
  getPublicUrl,
};
