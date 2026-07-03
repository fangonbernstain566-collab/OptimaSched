import prisma from '../config/prisma.js';

// logAudit(req, "what happened", { entityType, entityId })
export const logAudit = async (req, action, details = {}) => {
  if (!req.user?.id) return; // safety: never throw if somehow unauthenticated
  try {
    await prisma.auditLog.create({
      data: { action, userId: req.user.id, details },
    });
  } catch (err) {
    console.error('[auditLog] Failed to write log:', err.message); // never block the main action
  }
};