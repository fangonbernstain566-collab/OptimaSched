import { Router } from 'express';
import prisma from '../config/prisma.js';

const router = Router();

const VALID_ROOM_TYPES = [
  'LECTURE_ROOM',
  'COMPUTER_LABORATORY',
  'LABORATORY',
];

// GET /api/rooms
// Fetch all rooms with their building info
router.get('/', async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      include: {
        building: true,
        _count: {
          select: {
            schedules: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return res.status(200).json({
      success: true,
      data: rooms,
    });
  } catch (error) {
    console.error('❌ Error fetching rooms:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch rooms.',
    });
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

// DELETE /api/rooms/:id
// Delete room only if it is not used by schedules
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

    await prisma.room.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: 'Room deleted successfully.',
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