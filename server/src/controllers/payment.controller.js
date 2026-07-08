import { z } from 'zod';
import { PaymentService } from '../services/payment.service.js';
import { logAudit } from '../utils/auditLog.js';

const createSchema = z.object({
  studentName: z.string().min(1, 'Student name is required.'),
  studentId:   z.string().min(1, 'Student ID is required.'),
  amount:      z.number().positive('Amount must be greater than 0.'),
  type:        z.enum(['TUITION_FEE', 'MISCELLANEOUS', 'LAB_FEE', 'ENROLLMENT_FEE', 'PARTIAL_PAYMENT', 'ID_FEE', 'OTHER']),
  method:      z.enum(['CASH', 'GCASH', 'BANK_TRANSFER']),
  status:      z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']).optional(),
  notes:       z.string().optional(),
});

const listQuerySchema = z.object({
  page:      z.string().optional(),
  pageSize:  z.string().optional(),
  status:    z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']).optional(),
  type:      z.string().optional(),
  method:    z.string().optional(),
  search:    z.string().optional(),
  startDate: z.string().optional(),
  endDate:   z.string().optional(),
});

const statusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']),
});

export const createPayment = async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid payment payload.' });
    }

    const payment = await PaymentService.create(req.user.id, parsed.data);

    await logAudit(req, {
      action: 'PAYMENT_CREATE',
      module: 'PAYMENT_MANAGEMENT',
      description: `${req.user.firstName} recorded a ${parsed.data.type.replace(/_/g, ' ').toLowerCase()} payment of ₱${parsed.data.amount} for ${parsed.data.studentName}.`,
      targetRecordId: payment.id,
      targetRecordName: parsed.data.studentName,
      metadata: { amount: parsed.data.amount, type: parsed.data.type, method: parsed.data.method },
    });

    return res.status(201).json({ success: true, data: payment });
  } catch (error) {
    return next(error);
  }
};

export const listPayments = async (req, res, next) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid query parameters.' });
    }

    const result = await PaymentService.list(parsed.data);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

export const updatePaymentStatus = async (req, res, next) => {
  try {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid status.' });
    }

    const payment = await PaymentService.updateStatus(req.params.id, parsed.data.status);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found.' });
    }

    await logAudit(req, {
      action: 'PAYMENT_STATUS_UPDATE',
      module: 'PAYMENT_MANAGEMENT',
      description: `${req.user.firstName} marked ${payment.studentName}'s payment as ${parsed.data.status.toLowerCase()}.`,
      targetRecordId: payment.id,
      targetRecordName: payment.studentName,
      metadata: { status: parsed.data.status },
    });

    return res.status(200).json({ success: true, data: payment });
  } catch (error) {
    return next(error);
  }
};

export const getPaymentStats = async (req, res, next) => {
  try {
    const stats = await PaymentService.getStats();
    return res.status(200).json({ success: true, data: stats });
  } catch (error) {
    return next(error);
  }
};

export const deletePayment = async (req, res, next) => {
  try {
    const payment = await PaymentService.softDelete(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found.' });
    }

    await logAudit(req, {
      action: 'PAYMENT_SOFT_DELETE',
      module: 'PAYMENT_MANAGEMENT',
      description: `${req.user.firstName} moved ${payment.studentName}'s payment to Recently Deleted.`,
      targetRecordId: payment.id,
      targetRecordName: payment.studentName,
    });

    return res.status(200).json({ success: true, message: 'Payment moved to Recently Deleted.' });
  } catch (error) {
    return next(error);
  }
};

export const restorePayment = async (req, res, next) => {
  try {
    const payment = await PaymentService.restore(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found or not deleted.' });
    }

    await logAudit(req, {
      action: 'PAYMENT_RESTORE',
      module: 'PAYMENT_MANAGEMENT',
      description: `${req.user.firstName} restored ${payment.studentName}'s payment.`,
      targetRecordId: payment.id,
      targetRecordName: payment.studentName,
    });

    return res.status(200).json({ success: true, message: 'Payment restored.', data: payment });
  } catch (error) {
    return next(error);
  }
};

export const permanentDeletePayment = async (req, res, next) => {
  try {
    const payment = await PaymentService.permanentDelete(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found or must be soft-deleted first.' });
    }

    await logAudit(req, {
      action: 'PAYMENT_PERMANENT_DELETE',
      module: 'PAYMENT_MANAGEMENT',
      description: `${req.user.firstName} permanently deleted ${payment.studentName}'s payment.`,
      targetRecordId: payment.id,
      targetRecordName: payment.studentName,
    });

    return res.status(200).json({ success: true, message: 'Payment permanently deleted.' });
  } catch (error) {
    return next(error);
  }
};

export const listDeletedPayments = async (req, res, next) => {
  try {
    const payments = await PaymentService.listDeleted();
    return res.status(200).json({ success: true, data: payments });
  } catch (error) {
    return next(error);
  }
};
