import { z } from 'zod';
import { TimmyService } from '../services/timmy.service.js';
import { TimmyPaymentsService } from '../services/timmyPayments.service.js';
import { TimmyInstructorService } from '../services/timmyInstructor.service.js';

const recommendSchema = z.object({
  scheduleId: z.string().uuid('Invalid schedule id format.'),
});

export const getRecommendations = async (req, res, next) => {
  try {
    const parsed = recommendSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || 'Invalid request payload.',
      });
    }

    const result = await TimmyService.recommendSlots(parsed.data.scheduleId);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    if (error instanceof TimmyService.NotFoundError) {
      return res.status(404).json({ success: false, message: error.message });
    }
    return next(error);
  }
};

export const getPaymentInsights = async (req, res, next) => {
  try {
    const result = await TimmyPaymentsService.getOutstandingInsights();
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const getInstructorInsights = async (req, res, next) => {
  try {
    const result = await TimmyInstructorService.getInstructorInsights(req.user.id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error instanceof TimmyInstructorService.NotFoundError) {
      return res.status(404).json({ success: false, message: error.message });
    }
    return next(error);
  }
};
