import { z } from 'zod';
import prisma from '../config/prisma.js';
import { SettingsService } from '../services/settings.service.js';

const updateSettingsSchema = z.object({
  themeMode: z.enum(['LIGHT', 'DARK', 'SYSTEM']).optional(),
  fontSize: z.enum(['SMALL', 'MEDIUM', 'LARGE']).optional(),
  highContrast: z.boolean().optional(),
  reducedMotion: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  inAppNotifications: z.boolean().optional(),
  defaultLandingPage: z.string().min(1).optional(),
});

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

export const getMySettings = async (req, res, next) => {
  try {
    const settings = await SettingsService.getOrCreate(req.user.id);
    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    return next(error);
  }
};

export const updateMySettings = async (req, res, next) => {
  try {
    const parsed = updateSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || 'Invalid settings payload.',
      });
    }

    const settings = await SettingsService.update(req.user.id, parsed.data);
    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    return next(error);
  }
};

export const updateMyProfile = async (req, res, next) => {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || 'Invalid profile payload.',
      });
    }

    if (parsed.data.email) {
      const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
      if (existing && existing.id !== req.user.id) {
        return res.status(409).json({ success: false, message: 'Email is already in use.' });
      }
    }

    const user = await SettingsService.updateProfile(req.user.id, parsed.data);
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return next(error);
  }
};
