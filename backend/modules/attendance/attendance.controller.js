import * as attendanceService from "./attendance.service.js";

// Handles HTTP request to retrieve enrolled students for a course offering.
export async function getEnrolledStudents(req, res, next) {
  try {
    const students = await attendanceService.getEnrolledStudents(req.params.courseOfferingId);
    return res.status(200).json({ students });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}

// Handles HTTP request to mark attendance for a student.
export async function markAttendance(req, res, next) {
  try {
    const attendance = await attendanceService.markAttendance(req.user.id, req.body);
    return res.status(201).json({ attendance });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}

// Handles HTTP request to retrieve the logged-in student's attendance summary.
export async function getAttendance(req, res, next) {
  try {
    const result = await attendanceService.getAttendance(req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

// Handles HTTP request to retrieve attendance records for a course offering (faculty only).
export async function getCourseAttendance(req, res, next) {
  try {
    const records = await attendanceService.getCourseAttendance(req.user.id, req.params.courseOfferingId);
    return res.status(200).json({ attendance: records });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}
