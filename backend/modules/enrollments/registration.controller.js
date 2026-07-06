import * as registrationService from "./registration.service.js";

/**
 * Controller to finalize the registration of a new student.
 * Generates their permanent Student ID based on year and branch, and saves their details.
 * Route: POST /api/registration/student
 * Access: Authenticated User (with 'student' role)
 */
export async function registerStudent(req, res, next) {
  try {
    const result = await registrationService.registerStudent(req.user?.id, req.body);
    return res.status(200).json({ message: 'Student registration complete', ...result });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message, studentId: err.studentId });
    return next(err);
  }
}

/**
 * Controller to finalize the registration of a new faculty member.
 * Generates their permanent Employee ID and saves their details.
 * Route: POST /api/registration/faculty
 * Access: Authenticated User (with 'faculty' role)
 */
export async function registerFaculty(req, res, next) {
  try {
    const result = await registrationService.registerFaculty(req.user?.id, req.body);
    return res.status(200).json({ message: 'Faculty registration complete', ...result });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message, employeeId: err.employeeId });
    return next(err);
  }
}
