import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getMySettings,
  updateMySettings,
  updateMyProfile,
} from '../controllers/settings.controller.js';

const router = Router();

router.use(authenticate);

router.get('/me', getMySettings);
router.patch('/me', updateMySettings);
router.patch('/me/profile', updateMyProfile);

export default router;
