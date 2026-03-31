const authService = require("../services/auth.service");

// Cookie options for refresh token
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
};

// ─── Register ────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await authService.register(req.body);

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

    return res.status(201).json({
      message: "User registered successfully",
      user,
      accessToken,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Login ───────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await authService.login(req.body);

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

    return res.status(200).json({
      message: "Login successful",
      user,
      accessToken,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Refresh Token ───────────────────────────
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    const { accessToken, refreshToken: newRefreshToken } =
      await authService.refresh(token);

    res.cookie("refreshToken", newRefreshToken, REFRESH_COOKIE_OPTIONS);

    return res.status(200).json({ accessToken });
  } catch (err) {
    next(err);
  }
};

// ─── Logout ──────────────────────────────────
const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user.userId);
    res.clearCookie("refreshToken", { path: "/" });
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
};

// ─── Get Me ──────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.userId);
    return res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refreshToken, logout, getMe };
