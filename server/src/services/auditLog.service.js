import prisma from '../config/prisma.js';

const SORT_MAP = {
  newest: [{ createdAt: 'desc' }],
  oldest: [{ createdAt: 'asc' }],
  user: [{ userName: 'asc' }, { createdAt: 'desc' }],
  module: [{ module: 'asc' }, { createdAt: 'desc' }],
};

const buildDateRange = (startDate, endDate) => {
  if (!startDate && !endDate) return null;
  const createdAt = {};

  if (startDate) {
    const parsedStart = new Date(startDate);
    if (!Number.isNaN(parsedStart.getTime())) {
      createdAt.gte = parsedStart;
    }
  }

  if (endDate) {
    const parsedEnd = new Date(endDate);
    if (!Number.isNaN(parsedEnd.getTime())) {
      createdAt.lte = parsedEnd;
    }
  }

  return Object.keys(createdAt).length > 0 ? createdAt : null;
};

const buildWhereClause = (filters) => {
  const conditions = [];
  const {
    search,
    module,
    userRole,
    action,
    startDate,
    endDate,
  } = filters;

  const dateRange = buildDateRange(startDate, endDate);
  if (dateRange) {
    conditions.push({ createdAt: dateRange });
  }

  if (module) {
    conditions.push({ module });
  }

  if (userRole) {
    conditions.push({ userRole });
  }

  if (action) {
    conditions.push({ action });
  }

  if (search && search.trim() !== '') {
    const q = search.trim();
    conditions.push({
      OR: [
        { userName: { contains: q, mode: 'insensitive' } },
        { module: { contains: q, mode: 'insensitive' } },
        { action: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { targetRecordName: { contains: q, mode: 'insensitive' } },
        { targetRecordId: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  if (conditions.length === 0) return {};
  return { AND: conditions };
};

const csvEscape = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const toCsv = (rows) => {
  const headers = [
    'Date & Time',
    'User',
    'Role',
    'Module',
    'Action',
    'Description',
    'Target Record ID',
    'Target Record Name',
    'IP Address',
    'User Agent',
  ];

  const lines = [
    headers.join(','),
    ...rows.map((row) => ([
      row.createdAt?.toISOString() ?? '',
      row.userName ?? '',
      row.userRole ?? '',
      row.module ?? '',
      row.action ?? '',
      row.description ?? '',
      row.targetRecordId ?? '',
      row.targetRecordName ?? '',
      row.ipAddress ?? '',
      row.userAgent ?? '',
    ].map(csvEscape).join(','))),
  ];

  return lines.join('\n');
};

const toExcelTsv = (rows) => {
  const headers = [
    'Date & Time',
    'User',
    'Role',
    'Module',
    'Action',
    'Description',
    'Target Record ID',
    'Target Record Name',
    'IP Address',
    'User Agent',
  ];

  const lines = [
    headers.join('\t'),
    ...rows.map((row) => ([
      row.createdAt?.toISOString() ?? '',
      row.userName ?? '',
      row.userRole ?? '',
      row.module ?? '',
      row.action ?? '',
      row.description ?? '',
      row.targetRecordId ?? '',
      row.targetRecordName ?? '',
      row.ipAddress ?? '',
      row.userAgent ?? '',
    ].map((cell) => String(cell).replace(/\t/g, ' ').replace(/\r?\n/g, ' ')).join('\t'))),
  ];

  return lines.join('\n');
};

const buildListParams = (params) => {
  const page = Math.max(Number(params.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(params.pageSize) || 20, 1), 100);
  const sort = SORT_MAP[params.sort] ? params.sort : 'newest';

  return { page, pageSize, sort };
};

export class AuditLogService {
  static async getList(params) {
    const { page, pageSize, sort } = buildListParams(params);
    const where = buildWhereClause(params);
    const orderBy = SORT_MAP[sort];
    const skip = (page - 1) * pageSize;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
      }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  static async getById(id) {
    return prisma.auditLog.findUnique({ where: { id } });
  }

  static async getStats() {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const [totalLogs, todaysLogs, activeUsersTodayGrouped, mostActiveModule] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.count({
        where: { createdAt: { gte: startOfToday } },
      }),
      prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: startOfToday },
          userId: { not: null },
        },
      }),
      prisma.auditLog.groupBy({
        by: ['module'],
        where: { createdAt: { gte: startOfToday } },
        _count: { module: true },
        orderBy: { _count: { module: 'desc' } },
        take: 1,
      }),
    ]);

    return {
      totalLogs,
      todaysLogs,
      activeUsersToday: activeUsersTodayGrouped.length,
      mostActiveModule: mostActiveModule[0]?.module ?? 'N/A',
      mostActiveModuleCount: mostActiveModule[0]?._count?.module ?? 0,
    };
  }

  static async export(params, format) {
    const where = buildWhereClause(params);
    const rows = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50000,
    });

    if (format === 'excel') {
      return {
        contentType: 'application/vnd.ms-excel; charset=utf-8',
        filename: `audit-logs-${Date.now()}.xls`,
        payload: toExcelTsv(rows),
      };
    }

    return {
      contentType: 'text/csv; charset=utf-8',
      filename: `audit-logs-${Date.now()}.csv`,
      payload: toCsv(rows),
    };
  }
}
