import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { User, AuditLog } from "../db/models.js";

export async function auth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ detail: "Authentication required" });
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(payload.sub).lean();
    if (!user) return res.status(401).json({ detail: "User not found" });
    req.user = { ...user, id: user._id || user.id };
    next();
  } catch {
    res.status(401).json({ detail: "Invalid or expired token" });
  }
}

export const role = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role)
    ? next()
    : res.status(403).json({ detail: "Insufficient permissions" });

export const officer = [auth, role("officer")];
export const vendor = [auth, role("vendor")];

export async function audit(actor, action, entityType, entityId, metadata = {}) {
  try {
    await AuditLog.create({
      actorUserId: actor?.id,
      actorRole: actor?.role,
      action,
      entityType,
      entityId,
      metadata,
      timestamp: new Date(),
    });
  } catch {
    // Non-blocking fallback if audit_logs table is missing in database schema
  }
}
