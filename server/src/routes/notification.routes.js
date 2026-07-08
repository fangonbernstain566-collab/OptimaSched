import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { NotificationService } from '../services/notification.service.js';

const router = Router();
router.use(authenticate);

router.get('/mine', async (req, res) => {
  try {
    const notifications = await NotificationService.listForUser(req.user.id);
    return res.json({ success: true, data: notifications });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const count = await NotificationService.getUnreadCount(req.user.id);
    return res.json({ success: true, data: { count } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    const updated = await NotificationService.markRead(req.params.id, req.user.id);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }
    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/read-all', async (req, res) => {
  try {
    await NotificationService.markAllRead(req.user.id);
    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
