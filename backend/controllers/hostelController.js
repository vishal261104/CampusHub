import HostelApplication from "../models/HostelApplication.js";
import * as roomService from "../services/hostelRoomService.js";
import * as allocationService from "../services/roomAllocationService.js";

// Handles HTTP request to create a new hostel room.
export const createRoom = async (req, res, next) => {
  try {
    const room = await roomService.createRoom(req.body);
    return res.status(201).json({ message: "Room created successfully", room });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

// Handles HTTP request to retrieve all active rooms based on query filters.
export const getAllRooms = async (req, res, next) => {
  try {
    const rooms = await roomService.getAllRooms(req.query);
    return res.status(200).json({ count: rooms.length, rooms });
  } catch (err) {
    next(err);
  }
};

// Handles HTTP request to retrieve details of a single hostel room by ID.
export const getRoomById = async (req, res, next) => {
  try {
    const room = await roomService.getRoomById(req.params.id);
    return res.status(200).json({ room });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

// Handles HTTP request to update an existing hostel room.
export const updateRoom = async (req, res, next) => {
  try {
    const room = await roomService.updateRoom(req.params.id, req.body);
    return res.status(200).json({ message: "Room updated successfully", room });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

// Handles HTTP request to soft-delete a hostel room.
export const deleteRoom = async (req, res, next) => {
  try {
    await roomService.deleteRoom(req.params.id);
    return res.status(200).json({ message: "Room deactivated successfully" });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

// Handles HTTP request to view currently allocated occupants of a room.
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

// Handles HTTP request for a student to submit a new hostel application.
// roomNumber is optional — if omitted, a room will be auto-assigned on approval.
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

// Handles HTTP request for a student to view their own latest application.
export const getMyApplication = async (req, res, next) => {
  try {
    const application = await HostelApplication.findOne({ studentId: req.userDoc._id })
      .sort({ appliedAt: -1 });

    if (!application) {
      return res.status(404).json({ message: 'No application found' });
    }

    // If approved, attach allocation info
    let allocation = null;
    if (application.status === 'Approved') {
      allocation = await allocationService.getStudentAllocation(req.userDoc._id);
    }

    return res.status(200).json({ application, allocation });
  } catch (err) {
    next(err);
  }
};

// Handles HTTP request for a student to cancel their pending hostel application.
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

// Handles HTTP request for admins to list all hostel applications, optionally filtered by status.
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

// Handles HTTP request for admins to approve or reject a pending hostel application.
// On approval: allocates a room (preferred or auto-assigned) and increments occupancy.
// On rejection: simply updates the status.
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
      // Allocate room — throws if no room available or student already allocated
      const { allocation, room } = await allocationService.allocateRoom({
        studentId: application.studentId,
        applicationId: application._id,
        hostelType: application.hostel,
        roomCategory: application.roomCategory,
        preferredRoomNumber: application.roomNumber || null,
      });

      application.status = 'Approved';
      // Store the actually allocated room number on the application for reference
      application.roomNumber = room.roomNumber;
      await application.save();

      return res.status(200).json({
        message: `Application approved. Room ${room.roomNumber} (${room.hostelBlock}) allocated.`,
        application,
        allocation,
        room,
      });
    }

    // Rejection
    application.status = 'Rejected';
    await application.save();

    return res.status(200).json({ message: 'Application rejected successfully', application });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};