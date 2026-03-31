const multer = require("multer");

// Store files in memory as Buffer — we forward them to Supabase via the service role
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB limit
  },
});

module.exports = { upload };
