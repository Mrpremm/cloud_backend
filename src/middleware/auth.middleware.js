const { verifyAccessToken } = require("../utils/generateToken");

/**
 * Protect routes — requires a valid JWT access token in the Authorization header.
 * Sets req.user = { userId } on success.
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const token = authHeader.split(" ")[1];
    const payload = verifyAccessToken(token);
    req.user = { userId: payload.userId };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = { authenticate };
