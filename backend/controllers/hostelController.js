import HostelApplication from "../models/HostelApplication.js";

// ─── STUDENT: Submit a hostel application ────────────────────────────────────
export const applyForHostel = async (req, res, next) => {
  try {
    const userDoc = req.userDoc; // from attachUser middleware

    // 1. Must have a studentId (completed student registration)
    if (!userDoc.studentId) {
      return res.status(400).json({ message: 'Please complete your student registration first to get a Student ID' });
    }

    // 2. Gender and hostel come from verified DB data — not from body
    const gender = userDoc.gender;
    if (!gender) {
      return res.status(400).json({ message: 'Gender is not set on your profile. Please contact admin.' });
    }
    const hostel = gender === 'Male' ? 'Boys' : 'Girls';

    const { roomCategory, roomNumber } = req.body;

    // 3. Validate required body fields
    if (!roomCategory || !roomNumber) {
      return res.status(400).json({ message: 'All fields are required: roomCategory, roomNumber' });
    }

    // 3b. Calculate academic year from studentId (e.g., '24CS001' -> admission year 2024)
    const admissionYearStr = userDoc.studentId.substring(0, 2);
    const admissionYear = 2000 + parseInt(admissionYearStr, 10);
    const currentYear = new Date().getFullYear();
    const yearDiff = currentYear - admissionYear;
    
    let year = '1st';
    if (yearDiff === 1) year = '2nd';
    else if (yearDiff === 2) year = '3rd';
    else if (yearDiff >= 3) year = '4th';

    // 4. Block duplicate active applications (Pending or Approved)
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

    // 5. Generate unique application number
    const hostelApplicationNumber = `HA-${Date.now()}-${userDoc.studentId}`;

    // 6. Create the application
    const application = await HostelApplication.create({
      studentId: userDoc._id,
      gender,
      hostel,
      roomCategory,
      roomNumber,
      year,
      hostelApplicationNumber,
    });

    return res.status(201).json({ message: 'Application submitted successfully', application });
  } catch (err) {
    next(err);
  }
};

// ─── STUDENT: View own latest application ────────────────────────────────────
export const getMyApplication = async (req, res, next) => {
  try {
    const application = await HostelApplication.findOne({ studentId: req.userDoc._id })
      .sort({ appliedAt: -1 });

    if (!application) {
      return res.status(404).json({ message: 'No application found' });
    }

    return res.status(200).json({ application });
  } catch (err) {
    next(err);
  }
};

// ─── STUDENT: Cancel own application (only if Pending) ───────────────────────
export const cancelApplication = async (req, res, next) => {
  try {
    const applicationId = req.params.id;

    const application = await HostelApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Ownership check
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

// ─── ADMIN: Get all applications (with optional status filter) ────────────────
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

// ─── ADMIN: Approve or Reject an application ─────────────────────────────────
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

    application.status = status;
    await application.save();

    return res.status(200).json({ message: `Application ${status.toLowerCase()} successfully`, application });
  } catch (err) {
    next(err);
  }
};