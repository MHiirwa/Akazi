import { verifyToken } from "../utils/token.js";
import prisma from "../config/prisma.js";
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or malformed authorization header" });
  }
  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, isSuspended: true }
    });
    if (!user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    if (user.isSuspended) {
      return res.status(403).json({ error: "Your account has been suspended." });
    }
    req.user = { id: user.id, role: user.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "You don't have permission to do that" });
    }
    next();
  };
}
export {
  requireAuth,
  requireRole
};
