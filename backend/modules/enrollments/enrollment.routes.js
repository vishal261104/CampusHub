import express from "express";
import {
  enrollInCourse,
  dropCourse,
  getEnrollments,
  getStudentTimetable,
  getAdminRequests,
  updateRequestStatus
} from "./enrollment.controller.js";
import authMiddleware from "../../middleware/authMiddleware.js";
import authRoles from "../../middleware/authRoles.js";

const router = express.Router();

// ─── STUDENT ROUTES ─────────────────────────────────────────────────────────────

/**
 * POST /api/enrollments/enroll/:id
 * Submits a request for the logged-in student to enroll in a course offering.
 */
router.post("/enroll/:id", authMiddleware, authRoles("student"), enrollInCourse);

/**
 * DELETE /api/enrollments/drop/:id
 * Submits a request for the logged-in student to drop an active course enrollment.
 */
router.delete("/drop/:id", authMiddleware, authRoles("student"), dropCourse);

/**
 * GET /api/enrollments/
 * Fetches all enrollments for the logged-in student.
 */
router.get("/", authMiddleware, authRoles("student"), getEnrollments);

/**
 * GET /api/enrollments/timetable
 * Fetches the weekly timetable for the logged-in student based on active enrollments.
 */
router.get("/timetable", authMiddleware, authRoles("student"), getStudentTimetable);

// ─── ADMIN ROUTES ───────────────────────────────────────────────────────────────

/**
 * GET /api/enrollments/requests
 * Fetches all pending enrollment and drop requests for admin review.
 */
router.get("/requests", authMiddleware, authRoles("admin"), getAdminRequests);

/**
 * PATCH /api/enrollments/requests/:id
 * Approves or rejects a pending enrollment/drop request (Admin only).
 */
router.patch("/requests/:id", authMiddleware, authRoles("admin"), updateRequestStatus);

export default router;