const bcrypt = require("bcrypt");

const SALT_ROUNDS = 12;

/**
 * Hash a plain-text password.
 */
const hashPassword = (plainPassword) => bcrypt.hash(plainPassword, SALT_ROUNDS);

/**
 * Compare a plain-text password against a hash.
 */
const comparePassword = (plainPassword, hashedPassword) =>
  bcrypt.compare(plainPassword, hashedPassword);

module.exports = { hashPassword, comparePassword };
