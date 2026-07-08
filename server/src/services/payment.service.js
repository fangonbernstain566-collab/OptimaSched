import prisma from '../config/prisma.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayLabel = (d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
const monthLabel = (d) => d.toLocaleString('en-US', { month: 'short' });

const create = async (cashierId, data) => {
  return prisma.payment.create({
    data: { ...data, cashierId },
    include: { cashier: { select: { firstName: true, lastName: true } } },
  });
};

const list = async (filters) => {
  const { page, pageSize, status, type, method, search, startDate, endDate } = filters;

  const where = { isDeleted: false };
  if (status) where.status = status;
  if (type) where.type = type;
  if (method) where.method = method;
  if (search) {
    where.OR = [
      { studentName: { contains: search, mode: 'insensitive' } },
      { studentId: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const take = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (currentPage - 1) * take;

  const [total, payments] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      include: { cashier: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);

  return {
    payments,
    pagination: { page: currentPage, pageSize: take, total, totalPages: Math.ceil(total / take) || 1 },
  };
};

const updateStatus = async (id, status) => {
  const existing = await prisma.payment.findUnique({ where: { id } });
  if (!existing) return null;

  return prisma.payment.update({
    where: { id },
    data: { status },
    include: { cashier: { select: { firstName: true, lastName: true } } },
  });
};

const softDelete = async (id) => {
  const existing = await prisma.payment.findUnique({ where: { id } });
  if (!existing || existing.isDeleted) return null;

  return prisma.payment.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });
};

const restore = async (id) => {
  const existing = await prisma.payment.findUnique({ where: { id } });
  if (!existing || !existing.isDeleted) return null;

  return prisma.payment.update({
    where: { id },
    data: { isDeleted: false, deletedAt: null },
  });
};

const permanentDelete = async (id) => {
  const existing = await prisma.payment.findUnique({ where: { id } });
  if (!existing || !existing.isDeleted) return null;

  await prisma.payment.delete({ where: { id } });
  return existing;
};

const listDeleted = async () => {
  return prisma.payment.findMany({
    where: { isDeleted: true },
    include: { cashier: { select: { firstName: true, lastName: true } } },
    orderBy: { deletedAt: 'desc' },
  });
};

const getStats = async () => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = new Date(todayStart.getTime() - 6 * DAY_MS);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [todayPayments, weekPayments, yearPayments, pendingCount, allPending] = await Promise.all([
    prisma.payment.findMany({ where: { isDeleted: false, createdAt: { gte: todayStart } } }),
    prisma.payment.findMany({ where: { isDeleted: false, createdAt: { gte: weekStart } } }),
    prisma.payment.findMany({ where: { isDeleted: false, createdAt: { gte: yearStart } } }),
    prisma.payment.count({ where: { isDeleted: false, status: 'PENDING' } }),
    prisma.payment.findMany({ where: { isDeleted: false, status: 'PENDING' }, select: { studentId: true } }),
  ]);

  const todayConfirmed = todayPayments.filter((p) => p.status === 'CONFIRMED');
  const todayCollected = todayConfirmed.reduce((sum, p) => sum + p.amount, 0);
  const outstandingStudents = new Set(allPending.map((p) => p.studentId)).size;

  // Last 7 days, oldest -> newest
  const weekly = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date(todayStart.getTime() - i * DAY_MS);
    const dayEnd = new Date(day.getTime() + DAY_MS);
    const total = weekPayments
      .filter((p) => p.status === 'CONFIRMED' && p.createdAt >= day && p.createdAt < dayEnd)
      .reduce((sum, p) => sum + p.amount, 0);
    weekly.push({ day: dayLabel(day), amount: total });
  }

  // This year, Jan -> current month
  const monthly = [];
  for (let m = 0; m <= now.getMonth(); m += 1) {
    const monthStart = new Date(now.getFullYear(), m, 1);
    const monthEnd = new Date(now.getFullYear(), m + 1, 1);
    const total = yearPayments
      .filter((p) => p.status === 'CONFIRMED' && p.createdAt >= monthStart && p.createdAt < monthEnd)
      .reduce((sum, p) => sum + p.amount, 0);
    monthly.push({ month: monthLabel(monthStart), amount: total });
  }

  const confirmedYear = yearPayments.filter((p) => p.status === 'CONFIRMED');
  const totalYearAmount = confirmedYear.reduce((sum, p) => sum + p.amount, 0);

  const breakdownBy = (key) => {
    const totals = new Map();
    for (const p of confirmedYear) {
      totals.set(p[key], (totals.get(p[key]) ?? 0) + p.amount);
    }
    return Array.from(totals.entries()).map(([name, amount]) => ({
      name,
      value: totalYearAmount > 0 ? Math.round((amount / totalYearAmount) * 100) : 0,
    }));
  };

  return {
    todayCollected,
    pendingCount,
    confirmedTodayCount: todayConfirmed.length,
    outstandingStudents,
    weekly,
    monthly,
    byType: breakdownBy('type'),
    byMethod: breakdownBy('method'),
  };
};

export const PaymentService = { create, list, updateStatus, getStats, softDelete, restore, permanentDelete, listDeleted };
