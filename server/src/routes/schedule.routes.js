import { Router } from 'express';
// Add "getScheduleOptions" inside the curly braces below:
import { 
  getSchedules, 
  createSchedule, 
  updateSchedule, 
  getScheduleOptions 
} from '../controllers/schedule.controller.js';
import { authenticate } from '../middleware/auth.js'; // Assuming this is where your authenticate middleware lives

const router = Router();

router.get('/', authenticate, getSchedules);
router.get('/options', authenticate, getScheduleOptions); // Now it's defined and safe!
router.post('/', authenticate, createSchedule);
router.put('/:id', authenticate, updateSchedule);

export default router;