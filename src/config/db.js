const { PrismaClient } = require("@prisma/client");

/** Singleton Prisma client — re-used across hot-reloads in dev */
const prisma = global.__prisma || new PrismaClient({ log: ["warn", "error"] });

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

module.exports = prisma;
