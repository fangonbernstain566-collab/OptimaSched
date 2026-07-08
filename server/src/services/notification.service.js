import prisma from '../config/prisma.js';

const create = async (userId, { title, message, type, link }) => {
  return prisma.notification.create({
    data: { userId, title, message, type, link: link ?? null },
  });
};

// Fan-out helper — e.g. notifying every Admin/Registrar about a new request.
const createForUsers = async (userIds, { title, message, type, link }) => {
  if (userIds.length === 0) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({ userId, title, message, type, link: link ?? null })),
  });
};

const createForRoles = async (roleNames, { title, message, type, link }) => {
  const users = await prisma.user.findMany({
    where: { role: { name: { in: roleNames } } },
    select: { id: true },
  });
  await createForUsers(users.map((u) => u.id), { title, message, type, link });
};

const listForUser = async (userId) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
};

const getUnreadCount = async (userId) => {
  return prisma.notification.count({ where: { userId, isRead: false } });
};

const markRead = async (id, userId) => {
  const existing = await prisma.notification.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return null;

  return prisma.notification.update({ where: { id }, data: { isRead: true } });
};

const markAllRead = async (userId) => {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
};

export const NotificationService = { create, createForUsers, createForRoles, listForUser, getUnreadCount, markRead, markAllRead };
