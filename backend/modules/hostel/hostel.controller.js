import HostelApplication from "./hostelApplication.model.js";
import * as roomService from "./hostelRoom.service.js";
import * as allocationService from "./roomAllocation.service.js";

/**
 * Controller to create a new physical room in a hostel.
 * Route: POST /api/hostels/rooms/
 * Access: Admin
 */
export const createRoom = async (req, res, next) => {
  try {
    const room = await roomService.createRoom(req.body);
    return res.status(201).json({ message: "Room created successfully", room });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

/**
 * Controller to list all active rooms. Supports filtering by block, type, or availability.
 * Route: GET /api/hostels/rooms/
 * Access: Admin
 */
export const getAllRooms = async (req, res, next) => {
  try {
    const rooms = await roomService.getAllRooms(req.query);
    return res.status(200).json({ count: rooms.length, rooms });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller to fetch details of a specific room by its ID.
 * Route: GET /api/hostels/rooms/:id
 * Access: Admin
 */
export const getRoomById = async (req, res, next) => {
  try {
    const room = await roomService.getRoomById(req.params.id);
    return res.status(200).json({ room });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

/**
 * Controller to update room properties like type or capacity.
 * Route: PUT /api/hostels/rooms/:id
 * Access: Admin
 */
export const updateRoom = async (req, res, next) => {
  try {
    const room = await roomService.updateRoom(req.params.id, req.body);
    return res.status(200).json({ message: "Room updated successfully", room });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

/**
 * Controller to logically delete (deactivate) a room. Cannot delete if occupied.
 * Route: DELETE /api/hostels/rooms/:id
 * Access: Admin
 */
export const deleteRoom = async (req, res, next) => {
  try {
    await roomService.deleteRoom(req.params.id);
    return res.status(200).json({ message: "Room deactivated successfully" });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

/**
 * Controller to fetch detailed occupancy data for a specific room, including a list of students.
 * Route: GET /api/hostels/rooms/:id/occupancy
 * Access: Admin
 */
export const getRoomOccupancy = async (req, res, next) => {
  try {
    const room = await roomService.getRoomById(req.params.id);
    const allocations = await allocationService.getRoomAllocations(room._id);
    return res.status(200).json({
      room,
      currentOccupancy: room.currentOccupancy,
      capacity: room.capacity,
      occupants: allocations,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};


// ─── HOSTEL APPLICATIONS ────────────────────────────────────────────────────────

/**
 * Controller for a student to apply for a hostel room.
 * Generates an application number and enforces gender-specific hostel assignment.
 * Route: POST /api/hostels/
 * Access: Student
 */
export const applyForHostel = async (req, res, next) => {
  try {
    const userDoc = req.userDoc;

    if (!userDoc.studentId) {
      return res.status(400).json({ message: 'Please complete your student registration first to get a Student ID' });
    }

    const gender = userDoc.gender;
    if (!gender) {
      return res.status(400).json({ message: 'Gender is not set on your profile. Please contact admin.' });
    }
    const hostel = gender === 'Male' ? 'Boys' : 'Girls';

    const { roomCategory, roomNumber } = req.body;

    if (!roomCategory) {
      return res.status(400).json({ message: 'Room category is required' });
    }

    const admissionYearStr = userDoc.studentId.substring(0, 2);
    const admissionYear = 2000 + parseInt(admissionYearStr, 10);
    const currentYear = new Date().getFullYear();
    const yearDiff = currentYear - admissionYear;
    
    let year = '1st';
    if (yearDiff === 1) year = '2nd';
    else if (yearDiff === 2) year = '3rd';
    else if (yearDiff >= 3) year = '4th';

    const existing = await HostelApplication.findOne({
      studentId: userDoc._id,
      status: { $in: ['Pending', 'Approved'] },
    });
    if (existing) {
      return res.status(400).json({
        message: 'You already have an active application',
        applicationNumber: existing.hostelApplicationNumber,
      });
    }

    const hostelApplicationNumber = `HA-${Date.now()}-${userDoc.studentId}`;

    const application = await HostelApplication.create({
      studentId: userDoc._id,
      gender,
      hostel,
      roomCategory,
      roomNumber: roomNumber || '',
      year,
      hostelApplicationNumber,
    });

    return res.status(201).json({ message: 'Application submitted successfully', application });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller for a student to check their current active hostel application and allocation.
 * Route: GET /api/hostels/my-application
 * Access: Student
 */
export const getMyApplication = async (req, res, next) => {
  try {
    const application = await HostelApplication.findOne({ studentId: req.userDoc._id })
      .sort({ appliedAt: -1 });

    if (!application) {
      return res.status(404).json({ message: 'No application found' });
    }

    
    let allocation = null;
    if (application.status === 'Approved') {
      allocation = await allocationService.getStudentAllocation(req.userDoc._id);
    }

    return res.status(200).json({ application, allocation });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller for a student to cancel a 'Pending' application.
 * Route: PATCH /api/hostels/:id/cancel
 * Access: Student
 */
export const cancelApplication = async (req, res, next) => {
  try {
    const applicationId = req.params.id;

    const application = await HostelApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.studentId.toString() !== req.userDoc._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to cancel this application' });
    }

    if (application.status !== 'Pending') {
      return res.status(400).json({
        message: `Cannot cancel an application with status '${application.status}'. Only Pending applications can be cancelled.`,
      });
    }

    application.status = 'Cancelled';
    await application.save();

    return res.status(200).json({ message: 'Application cancelled successfully', application });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller for admins to list all hostel applications, with optional status filtering.
 * Route: GET /api/hostels/
 * Access: Admin
 */
export const getAllApplications = async (req, res, next) => {
  try {
    const { status } = req.query;

    const filter = {};
    if (status) {
      const allowed = ['Pending', 'Approved', 'Rejected', 'Cancelled'];
      if (!allowed.includes(status)) {
        return res.status(400).json({ message: `Invalid status filter. Must be one of: ${allowed.join(', ')}` });
      }
      filter.status = status;
    }

    const applications = await HostelApplication.find(filter)
      .populate('studentId', 'name email studentId')
      .sort({ appliedAt: -1 });

    return res.status(200).json({ count: applications.length, applications });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller for admins to approve or reject a hostel application.
 * Approval automatically triggers room allocation logic.
 * Route: PATCH /api/hostels/:id/status
 * Access: Admin
 */
export const updateApplicationStatus = async (req, res, next) => {
  try {
    const applicationId = req.params.id;
    const { status } = req.body;

    const allowed = ['Approved', 'Rejected'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${allowed.join(', ')}` });
    }

    const application = await HostelApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.status !== 'Pending') {
      return res.status(400).json({
        message: `Cannot update an application with status '${application.status}'. Only Pending applications can be approved or rejected.`,
      });
    }

    if (status === 'Approved') {
      
      const { allocation, room } = await allocationService.allocateRoom({
        studentId: application.studentId,
        applicationId: application._id,
        hostelType: application.hostel,
        roomCategory: application.roomCategory,
        preferredRoomNumber: application.roomNumber || null,
      });

      application.status = 'Approved';
      
      application.roomNumber = room.roomNumber;
      await application.save();

      return res.status(200).json({
        message: `Application approved. Room ${room.roomNumber} (${room.hostelBlock}) allocated.`,
        application,
        allocation,
        room,
      });
    }

    
    application.status = 'Rejected';
    await application.save();

    return res.status(200).json({ message: 'Application rejected successfully', application });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};