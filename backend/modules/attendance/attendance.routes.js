import express from "express";
import * as attendanceController from "./attendance.controller.js";
import authMiddleware from "../../middleware/authMiddleware.js";
import authRoles from "../../middleware/authRoles.js";
import attachUser from "../../middleware/attachUser.js";

const router = express.Router();

/**
 * Middleware to authenticate and attach the user document to all attendance routes.
 */
router.use(authMiddleware);
router.use(attachUser);

/**
 * GET /api/attendance/students/:courseOfferingId
 * Fetches all enrolled students for a specific course offering (Faculty only).
 */
router.get("/students/:courseOfferingId", authRoles("faculty"), attendanceController.getEnrolledStudents);

/**
 * POST /api/attendance/mark
 * Marks attendance for a specific student and date (Faculty only).
 */
router.post("/mark", authRoles("faculty"), attendanceController.markAttendance);

/**
 * GET /api/attendance/my
 * Fetches aggregated attendance stats across all courses for the logged-in student.
 */
router.get("/my", authRoles("student"), attendanceController.getAttendance);

/**
 * GET /api/attendance/course-offering/:courseOfferingId
 * Fetches all raw attendance records for a specific course offering (Faculty only).
 */
router.get("/course-offering/:courseOfferingId", authRoles("faculty"), attendanceController.getCourseAttendance);

export default router;