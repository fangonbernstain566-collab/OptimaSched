import prisma from '../config/prisma.js';

const extractIpAddress = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim() !== '') {
    return forwardedFor.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
};

const normalizePayload = (input, legacyDetails = {}) => {
  // Backward-compatible signature:
  // logAudit(req, "description text", { entityType, entityId, ... })
  if (typeof input === 'string') {
    return {
      action: 'CUSTOM',
      module: legacyDetails?.module || legacyDetails?.entityType || 'SYSTEM',
      description: input,
      targetRecordId: legacyDetails?.entityId ?? null,
      targetRecordName: legacyDetails?.entityName ?? null,
      metadata: legacyDetails ?? null,
    };
  }

  return {
    action: input?.action || 'CUSTOM',
    module: input?.module || 'SYSTEM',
    description: input?.description || input?.action || 'Audit event',
    targetRecordId: input?.targetRecordId ?? null,
    targetRecordName: input?.targetRecordName ?? null,
    metadata: input?.metadata ?? null,
  };
};

export const logAudit = async (req, payload, legacyDetails = {}, options = {}) => {
  const normalized = normalizePayload(payload, legacyDetails);

  const actorFirst = req.user?.firstName?.trim() ?? '';
  const actorLast = req.user?.lastName?.trim() ?? '';
  const userName = `${actorFirst} ${actorLast}`.trim() || req.user?.email || null;
  const userRole = req.user?.role?.name || req.user?.role || null;

  const data = {
    userId: req.user?.id ?? null,
    userName,
    userRole,
    action: normalized.action,
    module: normalized.module,
    description: normalized.description,
    targetRecordId: normalized.targetRecordId,
    targetRecordName: normalized.targetRecordName,
    ipAddress: extractIpAddress(req),
    userAgent: req.get('user-agent') || null,
    metadata: normalized.metadata,
  };

  try {
    await prisma.auditLog.create({
      data,
    });
  } catch (err) {
    console.error('[auditLog] Failed to write log:', err.message);
    if (options.throwOnError) {
      throw err;
    }
  }
};