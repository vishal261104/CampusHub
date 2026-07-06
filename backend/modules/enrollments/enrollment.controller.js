import * as enrollmentService from "./enrollment.service.js";

/**
 * Controller for a student to initiate an enrollment request for a specific course offering.
 * Route: POST /api/enrollments/:id/enroll
 * Access: Student
 */
export async function enrollInCourse(req, res, next) {
  try {
    const enrollment = await enrollmentService.enrollInCourse(req.user?.id, req.params.id);
    return res.status(201).json({ message: "Enrollment successful", enrollment });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "Student is already enrolled in this course offering" });
    }
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}

/**
 * Controller for a student to initiate a request to drop an already enrolled course.
 * Route: POST /api/enrollments/:id/drop
 * Access: Student
 */
export async function dropCourse(req, res, next) {
  try {
    await enrollmentService.dropCourse(req.user?.id, req.params.id);
    return res.status(200).json({ message: "Course dropped successfully" });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}

/**
 * Controller for a student to view their own course enrollments, optionally filtered by status, semester, and year.
 * Route: GET /api/enrollments/my-enrollments
 * Access: Student
 */
export async function getEnrollments(req, res, next) {
  try {
    const result = await enrollmentService.getEnrollments(req.user?.id, req.query);
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}

/**
 * Controller for a student to fetch their weekly timetable of enrolled courses.
 * Route: GET /api/enrollments/timetable
 * Access: Student
 */
export async function getStudentTimetable(req, res, next) {
  try {
    const result = await enrollmentService.getStudentTimetable(req.user?.id, req.query);
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}

/**
 * Controller for an admin to view all pending enrollment and drop requests system-wide.
 * Route: GET /api/enrollments/admin/requests
 * Access: Admin
 */
export async function getAdminRequests(req, res, next) {
  try {
    const result = await enrollmentService.getAdminRequests(req.query);
    return res.status(200).json({ count: result.length, requests: result });
  } catch (err) {
    return next(err);
  }
}

/**
 * Controller for an admin to approve or reject a pending enrollment/drop request.
 * Route: PATCH /api/enrollments/admin/requests/:id
 * Access: Admin
 */
export async function updateRequestStatus(req, res, next) {
  try {
    const enrollment = await enrollmentService.updateRequestStatus(req.params.id, req.body.action);
    return res.status(200).json({ message: `Request ${req.body.action}d successfully`, enrollment });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}