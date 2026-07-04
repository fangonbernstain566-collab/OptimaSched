import { Router } from 'express';
import prisma from '../config/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logAudit } from '../utils/auditLog.js';

const router = Router();
router.use(authenticate, authorize('ADMINISTRATOR'));

const VALID_ROOM_TYPES = [
  'LECTURE_ROOM',
  'COMPUTER_LABORATORY',
  'LABORATORY',
];

// Whitelist of columns the UI is allowed to sort by, mapped to the Prisma
// orderBy shape needed to reach them. Keeping this as an explicit map (rather
// than trusting req.query.sortBy directly) prevents arbitrary/unsupported
// field names from being handed to Prisma.
const ROOM_SORT_MAP = {
  name:      (order) => ({ name: order }),
  building:  (order) => ({ building: { name: order } }),
  type:      (order) => ({ type: order }),
  capacity:  (order) => ({ capacity: order }),
  createdAt: (order) => ({ createdAt: order }),
};

// GET /api/rooms
// Fetch active rooms with their building info.
// Pagination is opt-in via ?page= so existing unpaginated callers (e.g. the
// Schedule Plotter and Manage Schedules dropdowns, which expect a full array)
// keep working unchanged.
router.get('/', async (req, res) => {
  try {
    const where = { isDeleted: false };
    const include = {
      building: true,
      _count: { select: { schedules: true } },
    };
    const defaultOrderBy = { name: 'asc' };

    if (req.query.page === undefined) {
      const rooms = await prisma.room.findMany({ where, include, orderBy: defaultOrderBy });
      return res.status(200).json({ success: true, data: rooms });
    }

    const page     = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 10, 1), 100);
    const skip     = (page - 1) * pageSize;

    const order   = req.query.order === 'desc' ? 'desc' : 'asc';
    const sortMap = ROOM_SORT_MAP[req.query.sortBy];
    const orderBy = sortMap ? sortMap(order) : defaultOrderBy;

    const [total, rooms] = await Promise.all([
      prisma.room.count({ where }),
      prisma.room.findMany({ where, include, orderBy, skip, take: pageSize }),
    ]);

    return res.status(200).json({
      success: true,
      data: rooms,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching rooms:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch rooms.',
    });
  }
});

// GET /api/rooms/recently-deleted
// List soft-deleted rooms
router.get('/recently-deleted', async (req, res) => {
  try {
    const deletedRooms = await prisma.room.findMany({
      where: { isDeleted: true },
      include: { building: true },
      orderBy: { deletedAt: 'desc' },
    });

    return res.status(200).json({ success: true, data: deletedRooms });
  } catch (error) {
    console.error('❌ Error fetching recently deleted rooms:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch recently deleted rooms.' });
  }
});

// POST /api/rooms
// Create a new room
router.post('/', async (req, res) => {
  try {
    const {
      name,
      capacity,
      type = 'LECTURE_ROOM',
      buildingName = 'Main Building',
    } = req.body;

    if (!name || !capacity) {
      return res.status(400).json({
        success: false,
        message: 'Room name and capacity are required.',
      });
    }

    const parsedCapacity = parseInt(capacity, 10);

    if (Number.isNaN(parsedCapacity) || parsedCapacity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Capacity must be a positive number.',
      });
    }

    if (!VALID_ROOM_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid room type. Allowed values: ${VALID_ROOM_TYPES.join(', ')}`,
      });
    }

    const normalizedRoomName = name.trim();
    const normalizedBuildingName = buildingName.trim() || 'Main Building';

    // Building.name is unique in your Prisma schema, so upsert is safe here.
    const building = await prisma.building.upsert({
      where: {
        name: normalizedBuildingName,
      },
      update: {},
      create: {
        name: normalizedBuildingName,
      },
    });

    // Room.name is NOT unique in your schema, so use findFirst instead of upsert.
    const existingRoom = await prisma.room.findFirst({
      where: {
        name: normalizedRoomName,
        buildingId: building.id,
      },
    });

    if (existingRoom) {
      return res.status(409).json({
        success: false,
        message: 'A room with this name already exists in this building.',
      });
    }

    const room = await prisma.room.create({
      data: {
        name: normalizedRoomName,
        capacity: parsedCapacity,
        type,
        buildingId: building.id,
      },
      include: {
        building: true,
      },
    });

    await logAudit(req, {
      action: 'ROOM_CREATE',
      module: 'ROOM_MANAGEMENT',
      description: `Created room ${room.name}.`,
      targetRecordId: room.id,
      targetRecordName: room.name,
      metadata: {
        building: room.building?.name ?? null,
        capacity: room.capacity,
        type: room.type,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Room created successfully.',
      data: room,
    });
  } catch (error) {
    console.error('❌ Error creating room:', error);

    return res.status(500).json({
      success: false,
      message: `Database Insertion Failure: ${error.message}`,
    });
  }
});

// PUT /api/rooms/:id
// Update room details
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      capacity,
      type,
      buildingName,
    } = req.body;

    const existingRoom = await prisma.room.findUnique({
      where: { id },
      include: { building: true },
    });

    if (!existingRoom) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.',
      });
    }

    let buildingId = existingRoom.buildingId;

    if (buildingName) {
      const building = await prisma.building.upsert({
        where: {
          name: buildingName.trim(),
        },
        update: {},
        create: {
          name: buildingName.trim(),
        },
      });

      buildingId = building.id;
    }

    const parsedCapacity =
      capacity !== undefined
        ? parseInt(capacity, 10)
        : existingRoom.capacity;

    if (Number.isNaN(parsedCapacity) || parsedCapacity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Capacity must be a positive number.',
      });
    }

    if (type && !VALID_ROOM_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid room type. Allowed values: ${VALID_ROOM_TYPES.join(', ')}`,
      });
    }

    const updatedRoom = await prisma.room.update({
      where: { id },
      data: {
        name: name?.trim() || existingRoom.name,
        capacity: parsedCapacity,
        type: type || existingRoom.type,
        buildingId,
      },
      include: {
        building: true,
      },
    });

    await logAudit(req, {
      action: 'ROOM_UPDATE',
      module: 'ROOM_MANAGEMENT',
      description: `Updated room ${updatedRoom.name}.`,
      targetRecordId: updatedRoom.id,
      targetRecordName: updatedRoom.name,
      metadata: {
        building: updatedRoom.building?.name ?? null,
        capacity: updatedRoom.capacity,
        type: updatedRoom.type,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Room updated successfully.',
      data: updatedRoom,
    });
  } catch (error) {
    console.error('❌ Error updating room:', error);

    return res.status(500).json({
      success: false,
      message: `Room update failed: ${error.message}`,
    });
  }
});

// PATCH /api/rooms/:id/restore
// Restore a soft-deleted room
router.patch('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.room.findUnique({
      where: { id },
      include: { building: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }
    if (!existing.isDeleted) {
      return res.status(400).json({ success: false, message: 'Room is already active.' });
    }

    const restored = await prisma.room.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null },
      include: { building: true },
    });

    await logAudit(req, {
      action: 'ROOM_RESTORE',
      module: 'ROOM_MANAGEMENT',
      description: `Restored room ${existing.name}.`,
      targetRecordId: id,
      targetRecordName: existing.name,
    });

    return res.status(200).json({ success: true, message: 'Room restored successfully!', data: restored });
  } catch (error) {
    console.error('❌ Error restoring room:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/rooms/:id/permanent
// Hard-delete a soft-deleted room
router.delete('/:id/permanent', async (req, res) => {
  try {
    const { id } = req.params;

    const target = await prisma.room.findUnique({
      where: { id },
      include: { building: true },
    });

    if (!target) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }
    if (!target.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Room must be soft-deleted first before permanent deletion.',
      });
    }

    await prisma.room.delete({ where: { id } });

    await logAudit(req, {
      action: 'ROOM_PERMANENT_DELETE',
      module: 'ROOM_MANAGEMENT',
      description: `Permanently deleted room ${target.name}.`,
      targetRecordId: id,
      targetRecordName: target.name,
    });

    return res.status(200).json({ success: true, message: 'Room permanently deleted.' });
  } catch (error) {
    console.error('❌ Error permanently deleting room:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/rooms/:id
// Soft-delete room only if it is not used by schedules
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const scheduleCount = await prisma.schedule.count({
      where: {
        roomId: id,
      },
    });

    if (scheduleCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete this room because it is already used in schedules.',
      });
    }

    const roomToDelete = await prisma.room.findUnique({
      where: { id },
      include: { building: true },
    });

    if (!roomToDelete) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.',
      });
    }
    if (roomToDelete.isDeleted) {
      return res.status(400).json({ success: false, message: 'Room is already deleted.' });
    }

    await prisma.room.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    await logAudit(req, {
      action: 'ROOM_DELETE',
      module: 'ROOM_MANAGEMENT',
      description: `Moved room ${roomToDelete.name} to Recently Deleted.`,
      targetRecordId: roomToDelete.id,
      targetRecordName: roomToDelete.name,
      metadata: {
        building: roomToDelete.building?.name ?? null,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Room moved to Recently Deleted.',
    });
  } catch (error) {
    console.error('❌ Error deleting room:', error);

    return res.status(500).json({
      success: false,
      message: `Room deletion failed: ${error.message}`,
    });
  }
});

export default router;