import { Router } from 'express';
import prisma from '../config/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logAudit } from '../utils/auditLog.js';

const router = Router();
router.use(authenticate);

// ─── GET /: All subjects, for the credential-requirement admin screen ────────
router.get('/', async (req, res) => {
  try {
    const subjects = await prisma.subject.findMany({ orderBy: { code: 'asc' } });
    return res.json({ success: true, data: subjects });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PATCH /:id/credentials: Set which credentials a subject requires ───────
router.patch('/:id/credentials', authorize('ADMINISTRATOR'), async (req, res) => {
  try {
    const { requiredCredentials } = req.body;
    if (!Array.isArray(requiredCredentials) || !requiredCredentials.every((c) => typeof c === 'string')) {
      return res.status(400).json({ success: false, message: 'requiredCredentials must be an array of strings.' });
    }

    const cleaned = [...new Set(requiredCredentials.map((c) => c.trim()).filter(Boolean))];

    const updated = await prisma.subject.update({
      where: { id: req.params.id },
      data: { requiredCredentials: cleaned },
    });

    await logAudit(req, {
      action: 'SUBJECT_CREDENTIALS_UPDATE',
      module: 'TEACHER_MANAGEMENT',
      description: `${req.user.firstName} set required credentials for ${updated.name}.`,
      targetRecordId: updated.id,
      targetRecordName: updated.name,
      metadata: { requiredCredentials: cleaned },
    });

    return res.json({ success: true, message: 'Required credentials updated.', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
