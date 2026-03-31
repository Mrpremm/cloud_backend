const prisma = require("../models/prisma");
const { hashPassword, comparePassword } = require("../utils/hashPassword");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/generateToken");

// ─── Register ────────────────────────────────
const register = async ({ name, email, password }) => {
  // Check existing user
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw Object.assign(new Error("Email already registered"), { status: 409 });
  }

  const hashed = await hashPassword(password);

  // Create user + root folder in a transaction
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: { name, email, password: hashed },
    });

    // Every user gets a root folder
    await tx.folder.create({
      data: {
        name: "My Drive",
        userId: newUser.id,
        isRoot: true,
      },
    });

    return newUser;
  });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  // Store refresh token
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
};

// ─── Login ───────────────────────────────────
const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw Object.assign(new Error("Invalid credentials"), { status: 401 });
  }

  const valid = await comparePassword(password, user.password);
  if (!valid) {
    throw Object.assign(new Error("Invalid credentials"), { status: 401 });
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
};

// ─── Refresh Token ───────────────────────────
const refresh = async (currentRefreshToken) => {
  if (!currentRefreshToken) {
    throw Object.assign(new Error("Refresh token required"), { status: 401 });
  }

  let payload;
  try {
    payload = verifyRefreshToken(currentRefreshToken);
  } catch {
    throw Object.assign(new Error("Invalid refresh token"), { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user || user.refreshToken !== currentRefreshToken) {
    throw Object.assign(new Error("Invalid refresh token"), { status: 401 });
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  return { accessToken, refreshToken };
};

// ─── Logout ──────────────────────────────────
const logout = async (userId) => {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });
};

// ─── Get Current User ────────────────────────
const getMe = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error("User not found"), { status: 404 });
  }
  return sanitizeUser(user);
};

// ─── Helpers ─────────────────────────────────
const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatarUrl: user.avatarUrl,
  createdAt: user.createdAt,
});

module.exports = { register, login, refresh, logout, getMe };
