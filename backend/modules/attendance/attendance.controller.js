import * as attendanceService from "./attendance.service.js";

/**
 * Controller to fetch all enrolled students for a given course offering.
 * Used by faculty to see who is available to mark for attendance.
 * Route: GET /api/attendance/enrolled/:courseOfferingId
 * Access: Faculty
 */
export async function getEnrolledStudents(req, res, next) {
  try {
    const students = await attendanceService.getEnrolledStudents(req.params.courseOfferingId);
    return res.status(200).json({ students });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}

/**
 * Controller to mark a student's attendance (Present/Absent/Late) for a specific date.
 * Route: POST /api/attendance/mark
 * Access: Faculty
 */
export async function markAttendance(req, res, next) {
  try {
    const attendance = await attendanceService.markAttendance(req.user.id, req.body);
    return res.status(201).json({ attendance });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}

/**
 * Controller to fetch aggregated attendance statistics for the logged-in student across all their courses.
 * Route: GET /api/attendance/student
 * Access: Student
 */
export async function getAttendance(req, res, next) {
  try {
    const result = await attendanceService.getAttendance(req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

/**
 * Controller to fetch all attendance records for a specific course offering.
 * Used by the faculty who teaches the course to review historic attendance data.
 * Route: GET /api/attendance/course/:courseOfferingId
 * Access: Faculty
 */
export async function getCourseAttendance(req, res, next) {
  try {
    const records = await attendanceService.getCourseAttendance(req.user.id, req.params.courseOfferingId);
    return res.status(200).json({ attendance: records });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}
