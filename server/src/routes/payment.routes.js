import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  createPayment,
  listPayments,
  updatePaymentStatus,
  getPaymentStats,
  deletePayment,
  restorePayment,
  permanentDeletePayment,
  listDeletedPayments,
} from '../controllers/payment.controller.js';

const router = Router();

router.use(authenticate, authorize('CASHIER', 'ADMINISTRATOR'));

router.get('/stats', getPaymentStats);
router.get('/recently-deleted', listDeletedPayments);
router.get('/', listPayments);
router.post('/', createPayment);
router.patch('/:id/status', updatePaymentStatus);
router.patch('/:id/restore', restorePayment);
router.delete('/:id/permanent', permanentDeletePayment);
router.delete('/:id', deletePayment);

export default router;
