import HostelRoom from "../models/HostelRoom.js";
import RoomAllocation from "../models/RoomAllocation.js";

// Allocates a room to a student upon application approval.
// If the application has a preferred roomNumber, tries that room first.
// Otherwise auto-assigns the first available room in the matching hostel,
// ordered by floor → block → roomNumber, matching the requested roomCategory.
export async function allocateRoom({ studentId, applicationId, hostelType, roomCategory, preferredRoomNumber }) {
  // Constraint: one student → one active room
  const existingAlloc = await RoomAllocation.findOne({ studentId, isActive: true });
  if (existingAlloc) {
    const err = new Error("Student already has an active room allocation. Deallocate first.");
    err.status = 409;
    throw err;
  }

  // Map roomCategory to roomType (application uses "Quad", rooms use "Suite" for 4 capacity)
  const roomTypeMap = { Single: "Single", Double: "Double", Triple: "Triple", Quad: "Suite" };
  const targetRoomType = roomTypeMap[roomCategory] || roomCategory;

  let room = null;

  // 1) Try preferred room if specified
  if (preferredRoomNumber) {
    room = await HostelRoom.findOne({
      roomNumber: preferredRoomNumber,
      hostelType,
      roomType: targetRoomType,
      isActive: true,
      $expr: { $lt: ["$currentOccupancy", "$capacity"] },
    });
  }

  // 2) Auto-assign: find first available room matching hostelType + roomType, ordered floor → block → roomNumber
  if (!room) {
    room = await HostelRoom.findOne({
      hostelType,
      roomType: targetRoomType,
      isActive: true,
      $expr: { $lt: ["$currentOccupancy", "$capacity"] },
    }).sort({ floor: 1, hostelBlock: 1, roomNumber: 1 });
  }

  if (!room) {
    const err = new Error(`No available ${roomCategory} rooms in ${hostelType} hostel. All rooms are at capacity.`);
    err.status = 400;
    throw err;
  }

  // Atomic increment to prevent race conditions
  const updated = await HostelRoom.findOneAndUpdate(
    {
      _id: room._id,
      isActive: true,
      $expr: { $lt: ["$currentOccupancy", "$capacity"] },
    },
    { $inc: { currentOccupancy: 1 } },
    { new: true }
  );

  if (!updated) {
    const err = new Error("Room was filled by another allocation. Please try again.");
    err.status = 409;
    throw err;
  }

  const allocation = await RoomAllocation.create({
    studentId,
    roomId: room._id,
    applicationId,
  });

  return { allocation, room: updated };
}

// Deallocates a student from their room (used when cancelling an approved application).
export async function deallocateByApplication(applicationId) {
  const allocation = await RoomAllocation.findOne({ applicationId, isActive: true });
  if (!allocation) return null;

  allocation.isActive = false;
  await allocation.save();

  await HostelRoom.findOneAndUpdate(
    { _id: allocation.roomId },
    { $inc: { currentOccupancy: -1 } }
  );

  return allocation;
}

// Gets the active allocation for a student.
export async function getStudentAllocation(studentId) {
  return RoomAllocation.findOne({ studentId, isActive: true })
    .populate("roomId", "roomNumber hostelType hostelBlock roomType floor capacity currentOccupancy");
}

// Gets all active allocations for a room.
export async function getRoomAllocations(roomId) {
  return RoomAllocation.find({ roomId, isActive: true })
    .populate("studentId", "name email studentId gender");
}
