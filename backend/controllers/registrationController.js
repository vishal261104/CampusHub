import * as registrationService from "../services/registrationService.js";

// Completes student registration by generating a unique student ID based on year and branch.
export async function registerStudent(req, res, next) {
  try {
    const result = await registrationService.registerStudent(req.user?.id, req.body);
    return res.status(200).json({ message: 'Student registration complete', ...result });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message, studentId: err.studentId });
    return next(err);
  }
}

// Completes faculty registration by generating a unique employee ID.
export async function registerFaculty(req, res, next) {
  try {
    const result = await registrationService.registerFaculty(req.user?.id, req.body);
    return res.status(200).json({ message: 'Faculty registration complete', ...result });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message, employeeId: err.employeeId });
    return next(err);
  }
}
