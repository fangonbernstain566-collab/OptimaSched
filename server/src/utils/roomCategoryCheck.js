import prisma from '../config/prisma.js';

// Enforces the bidirectional class-classroom category rule:
//  - A subject that declares requiredRoomCategories may only be placed in a
//    room whose allowedCategories intersects those tags (e.g. an IT Lab
//    subject needs a room tagged "IT").
//  - A room that declares allowedCategories may only host subjects whose
//    requiredRoomCategories intersects those tags (e.g. a Maritime-only room
//    rejects an untagged/general subject).
// Rooms/subjects with no tags at all are treated as unrestricted and match
// each other freely, preserving existing behavior for ordinary lecture rooms.
export async function assertRoomMatchesSubjectCategory(roomId, subjectOfferingId) {
  const [room, offering] = await Promise.all([
    prisma.room.findUnique({ where: { id: roomId }, select: { name: true, allowedCategories: true } }),
    prisma.subjectOffering.findUnique({
      where: { id: subjectOfferingId },
      select: { subject: { select: { name: true, requiredRoomCategories: true } } },
    }),
  ]);

  if (!room || !offering) {
    throw new Error('Invalid room or subject offering reference.');
  }

  const subjectTags = offering.subject.requiredRoomCategories ?? [];
  const roomTags = room.allowedCategories ?? [];

  if (subjectTags.length === 0 && roomTags.length === 0) return;

  const intersects = subjectTags.some((tag) => roomTags.includes(tag));

  if (!intersects) {
    if (subjectTags.length > 0 && roomTags.length === 0) {
      throw new Error(
        `${offering.subject.name} requires a room designated for: ${subjectTags.join(', ')}. Room '${room.name}' is not designated for any special category.`
      );
    }
    if (subjectTags.length === 0 && roomTags.length > 0) {
      throw new Error(
        `Room '${room.name}' is restricted to classes designated for: ${roomTags.join(', ')}. ${offering.subject.name} is not designated for any of those categories.`
      );
    }
    throw new Error(
      `Room '${room.name}' (designated for: ${roomTags.join(', ')}) does not support ${offering.subject.name} (requires: ${subjectTags.join(', ')}).`
    );
  }
}
