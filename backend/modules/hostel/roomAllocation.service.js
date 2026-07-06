import HostelRoom from "./hostelRoom.model.js";
import RoomAllocation from "./roomAllocation.model.js";





export async function allocateRoom({ studentId, applicationId, hostelType, roomCategory, preferredRoomNumber }) {
  
  const existingAlloc = await RoomAllocation.findOne({ studentId, isActive: true });
  if (existingAlloc) {
    const err = new Error("Student already has an active room allocation. Deallocate first.");
    err.status = 409;
    throw err;
  }

  
  const roomTypeMap = { Single: "Single", Double: "Double", Triple: "Triple", Quad: "Suite" };
  const targetRoomType = roomTypeMap[roomCategory] || roomCategory;

  let room = null;

  
  if (preferredRoomNumber) {
    room = await HostelRoom.findOne({
      roomNumber: preferredRoomNumber,
      hostelType,
      roomType: targetRoomType,
      isActive: true,
      $expr: { $lt: ["$currentOccupancy", "$capacity"] },
    });
  }

  
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


export async function getStudentAllocation(studentId) {
  return RoomAllocation.findOne({ studentId, isActive: true })
    .populate("roomId", "roomNumber hostelType hostelBlock roomType floor capacity currentOccupancy");
}


export async function getRoomAllocations(roomId) {
  return RoomAllocation.find({ roomId, isActive: true })
    .populate("studentId", "name email studentId gender");
}
