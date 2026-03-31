/**
 * Re-export singleton Prisma client.
 * Import from here in services/controllers so the source of truth is one file.
 */
const prisma = require("../config/db");

module.exports = prisma;
