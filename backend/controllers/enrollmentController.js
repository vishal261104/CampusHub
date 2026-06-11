import * as enrollmentService from "../services/enrollmentService.js";

// Handles HTTP request for a student to request enrollment in a course offering.
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

// Handles HTTP request for a student to request dropping a course offering.
export async function dropCourse(req, res, next) {
  try {
    await enrollmentService.dropCourse(req.user?.id, req.params.id);
    return res.status(200).json({ message: "Course dropped successfully" });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}

// Handles HTTP request to retrieve a student's enrollment records.
export async function getEnrollments(req, res, next) {
  try {
    const result = await enrollmentService.getEnrollments(req.user?.id, req.query);
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}

// Handles HTTP request to generate a student's weekly timetable.
export async function getStudentTimetable(req, res, next) {
  try {
    const result = await enrollmentService.getStudentTimetable(req.user?.id, req.query);
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}

// Handles HTTP request for admins to list pending enrollment/drop requests.
export async function getAdminRequests(req, res, next) {
  try {
    const result = await enrollmentService.getAdminRequests(req.query);
    return res.status(200).json({ count: result.length, requests: result });
  } catch (err) {
    return next(err);
  }
}

// Handles HTTP request for admins to approve or reject an enrollment/drop request.
export async function updateRequestStatus(req, res, next) {
  try {
    const enrollment = await enrollmentService.updateRequestStatus(req.params.id, req.body.action);
    return res.status(200).json({ message: `Request ${req.body.action}d successfully`, enrollment });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}