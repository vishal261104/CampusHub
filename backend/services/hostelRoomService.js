import HostelRoom from "../models/HostelRoom.js";

// Creates a new hostel room after validating uniqueness and capacity.
export async function createRoom({ roomNumber, hostelType, hostelBlock, roomType, capacity, floor }) {
  const cap = parseInt(capacity, 10);
  if (!Number.isInteger(cap) || cap <= 0) {
    const err = new Error("capacity must be a positive integer");
    err.status = 400;
    throw err;
  }

  const existing = await HostelRoom.findOne({ roomNumber, hostelBlock, hostelType });
  if (existing) {
    const err = new Error(
      `Room ${roomNumber} already exists in block ${hostelBlock} (${hostelType} hostel)`
    );
    err.status = 409;
    throw err;
  }

  const room = await HostelRoom.create({
    roomNumber,
    hostelType,
    hostelBlock,
    roomType,
    capacity: cap,
    floor: parseInt(floor, 10),
    currentOccupancy: 0,
    isActive: true,
  });

  return room;
}

// Retrieves all active hostel rooms, optionally filtered by hostelType, block, type, floor, or availability.
export async function getAllRooms(query = {}) {
  const filter = { isActive: true };

  if (query.hostelType)  filter.hostelType  = query.hostelType;
  if (query.hostelBlock) filter.hostelBlock = query.hostelBlock;
  if (query.type)        filter.roomType = query.type;
  if (query.floor)       filter.floor = Number(query.floor);

  if (query.available === "true") {
    filter.$expr = { $lt: ["$currentOccupancy", "$capacity"] };
  } else if (query.available === "false") {
    filter.$expr = { $gte: ["$currentOccupancy", "$capacity"] };
  }

  const rooms = await HostelRoom.find(filter).sort({
    hostelType: 1,
    hostelBlock: 1,
    floor: 1,
    roomNumber: 1,
  });

  return rooms;
}

// Retrieves a single active hostel room by its database ID.
export async function getRoomById(roomId) {
  const room = await HostelRoom.findOne({ _id: roomId, isActive: true });
  if (!room) {
    const err = new Error("Room not found");
    err.status = 404;
    throw err;
  }
  return room;
}

// Updates details of an active hostel room, validating capacity adjustments.
export async function updateRoom(roomId, updates) {
  const room = await HostelRoom.findOne({ _id: roomId, isActive: true });
  if (!room) {
    const err = new Error("Room not found");
    err.status = 404;
    throw err;
  }

  if ("currentOccupancy" in updates) {
    const err = new Error(
      "currentOccupancy cannot be updated directly — it is managed internally"
    );
    err.status = 400;
    throw err;
  }

  if (updates.capacity !== undefined) {
    if (!Number.isInteger(updates.capacity) || updates.capacity <= 0) {
      const err = new Error("capacity must be a positive integer");
      err.status = 400;
      throw err;
    }
    if (updates.capacity < room.currentOccupancy) {
      const err = new Error(
        `Cannot reduce capacity to ${updates.capacity}. Room currently has ${room.currentOccupancy} occupant(s). Reallocate them first.`
      );
      err.status = 400;
      throw err;
    }
  }

  const allowedFields = ["roomNumber", "hostelType", "hostelBlock", "roomType", "capacity", "floor"];
  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      room[key] = updates[key];
    }
  }

  await room.save();
  return room;
}

// Deactivates/soft-deletes a hostel room if it has no current occupants.
export async function deleteRoom(roomId) {
  const room = await HostelRoom.findOne({ _id: roomId, isActive: true });
  if (!room) {
    const err = new Error("Room not found");
    err.status = 404;
    throw err;
  }

  if (room.currentOccupancy > 0) {
    const err = new Error(
      `Room has ${room.currentOccupancy} occupant(s). Reallocate them before deleting.`
    );
    err.status = 400;
    throw err;
  }

  room.isActive = false;
  await room.save();
  return room;
}

