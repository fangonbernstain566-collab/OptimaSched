import { z } from 'zod';
import { AuditLogService } from '../services/auditLog.service.js';

const listQuerySchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  sort: z.enum(['newest', 'oldest', 'user', 'module']).optional(),
  search: z.string().optional(),
  module: z.string().optional(),
  userRole: z.string().optional(),
  action: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const exportQuerySchema = listQuerySchema.extend({
  format: z.enum(['csv', 'excel']).optional(),
});

export const listAuditLogs = async (req, res, next) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || 'Invalid query parameters.',
      });
    }

    const result = await AuditLogService.getList(parsed.data);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

export const getAuditLogStats = async (req, res, next) => {
  try {
    const data = await AuditLogService.getStats();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

export const getAuditLogById = async (req, res, next) => {
  try {
    const log = await AuditLogService.getById(req.params.id);
    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Audit log entry not found.',
      });
    }

    return res.status(200).json({ success: true, data: log });
  } catch (error) {
    return next(error);
  }
};

export const exportAuditLogs = async (req, res, next) => {
  try {
    const parsed = exportQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || 'Invalid export parameters.',
      });
    }

    const format = parsed.data.format || 'csv';
    const exportResult = await AuditLogService.export(parsed.data, format);

    res.setHeader('Content-Type', exportResult.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    return res.status(200).send(exportResult.payload);
  } catch (error) {
    return next(error);
  }
};
