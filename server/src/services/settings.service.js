import prisma from '../config/prisma.js';

const getOrCreate = async (userId) => {
  const existing = await prisma.userSettings.findUnique({ where: { userId } });
  if (existing) return existing;

  return prisma.userSettings.create({ data: { userId } });
};

const update = async (userId, data) => {
  await getOrCreate(userId);

  return prisma.userSettings.update({
    where: { userId },
    data,
  });
};

const updateProfile = async (userId, data) => {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, firstName: true, lastName: true },
  });
};

export const SettingsService = { getOrCreate, update, updateProfile };
