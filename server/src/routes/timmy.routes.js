import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getRecommendations,
  getPaymentInsights,
  getInstructorInsights,
} from '../controllers/timmy.controller.js';

const router = Router();

router.use(authenticate);

// Scheduling recommendations — Admin/Registrar (who place classes).
router.post('/recommend', authorize('ADMINISTRATOR', 'REGISTRAR_SCHEDULER'), getRecommendations);

// Outstanding-payment follow-up priority — Cashier.
router.get('/payments/insights', authorize('CASHIER', 'ADMINISTRATOR'), getPaymentInsights);

// Load/transition warnings for the logged-in instructor's own schedule.
router.get('/instructor/insights', authorize('INSTRUCTOR'), getInstructorInsights);

export default router;
