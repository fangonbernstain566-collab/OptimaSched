import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  exportAuditLogs,
  getAuditLogById,
  getAuditLogStats,
  listAuditLogs,
} from '../controllers/auditLog.controller.js';

const router = Router();

router.use(authenticate, authorize('ADMINISTRATOR'));

router.get('/stats', getAuditLogStats);
router.get('/export', exportAuditLogs);
router.get('/:id', getAuditLogById);
router.get('/', listAuditLogs);

export default router;
