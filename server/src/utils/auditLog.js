import prisma from '../config/prisma.js';

const extractIpAddress = (req) => {
  if (!req) return null;

  const forwardedFor = req.headers?.['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim() !== '') {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || null;
};

const normalizePayload = (input, legacyDetails = {}) => {
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

export const logAudit = async (
  req,
  payload,
  legacyDetails = {},
  options = {},
  actor = req?.user
) => {
  const normalized = normalizePayload(payload, legacyDetails);

  const actorFirst = actor?.firstName?.trim() ?? '';
  const actorLast = actor?.lastName?.trim() ?? '';

  const userName =
    `${actorFirst} ${actorLast}`.trim() ||
    actor?.email ||
    null;

  const userRole =
    actor?.role?.name ||
    actor?.role ||
    null;

  const data = {
    userId: actor?.id ?? null,
    userName,
    userRole,

    action: normalized.action,
    module: normalized.module,
    description: normalized.description,

    targetRecordId: normalized.targetRecordId,
    targetRecordName: normalized.targetRecordName,

    ipAddress: extractIpAddress(req),

    userAgent: req?.get?.('user-agent') || null,

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