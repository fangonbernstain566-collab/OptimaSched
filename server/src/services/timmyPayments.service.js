// Timmy — Cashier variant: ranks PENDING payments by follow-up priority.
// Same "deterministic, explainable, no ML" principle as the scheduling
// engine, just applied to a different domain (Payment instead of Schedule).
import prisma from '../config/prisma.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const daysPending = (createdAt) => Math.floor((Date.now() - new Date(createdAt).getTime()) / DAY_MS);

const getOutstandingInsights = async () => {
  const pending = await prisma.payment.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
  });

  const totalOutstanding = pending.reduce((sum, p) => sum + p.amount, 0);

  const ranked = pending
    .map((p) => {
      const age = daysPending(p.createdAt);
      // Heuristic: older pending payments and larger amounts get priority —
      // tune freely, same spirit as the scheduling engine's scoring.
      const score = age * 10 + p.amount / 1000;
      return {
        id: p.id,
        studentName: p.studentName,
        studentId: p.studentId,
        amount: p.amount,
        type: p.type,
        method: p.method,
        daysPending: age,
        createdAt: p.createdAt,
        score: Math.round(score * 100) / 100,
        reason: `Pending ${age} day${age === 1 ? '' : 's'} · ₱${p.amount.toLocaleString('en-PH')} via ${p.method.replace(/_/g, ' ').toLowerCase()}${age >= 7 ? ' — aging past a week' : ''}.`,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ ...p, rank: i + 1 }));

  return {
    totalOutstanding,
    pendingCount: pending.length,
    oldestDaysPending: pending.length > 0 ? Math.max(...pending.map((p) => daysPending(p.createdAt))) : 0,
    topFollowUps: ranked.slice(0, 5),
  };
};

export const TimmyPaymentsService = { getOutstandingInsights };
