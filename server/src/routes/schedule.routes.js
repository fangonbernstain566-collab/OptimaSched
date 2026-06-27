import express from 'express';
import {
  getSchedules,
  getScheduleOptions,
  createSchedule,
  updateSchedule,
} from '../controllers/schedule.controller.js';

const router = express.Router();

router.get('/', getSchedules);
router.get('/options', getScheduleOptions);
router.post('/', createSchedule);
router.put('/:id', updateSchedule);

export default router;