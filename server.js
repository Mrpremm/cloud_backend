require("dotenv").config();

const app = require("./src/app");
const prisma = require("./src/config/db");
const logger = require("./src/utils/logger");

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    // Verify database connection
    await prisma.$connect();
    logger.info("✅ Connected to PostgreSQL via Prisma");

    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
    });
  } catch (err) {
    logger.error("❌ Failed to start server:", err);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  logger.info("Shutting down...");
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start();
