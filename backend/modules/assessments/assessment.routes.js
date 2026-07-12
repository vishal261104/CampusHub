import express from "express";
import authMiddleware from "../../middleware/authMiddleware.js";
import authRoles from "../../middleware/authRoles.js";
import {
    createAssessment,
    updateAssessment,
    advanceAssessmentStatus,
    deleteAssessment,
    bulkUploadMarks,
    getOfferingAssessments,
    getAssessmentMarks,
    getAssessmentAnalytics,
    getOfferingAnalytics,
    getStudentResults,
    getOverallGrade,
} from "./assessment.controller.js";

/**
 * Assessment Routes
 * Manages the full assessment lifecycle: creation, bulk mark uploads,
 * status transitions (Draft → Review → Published), analytics, and student result views.
 */
const router = express.Router();

// ─── FACULTY ROUTES ──────────────────────────────────────────────────────────

router.post(
    "/offering/:offeringId",
    authMiddleware, authRoles("faculty"),
    createAssessment
);

router.patch(
    "/:id",
    authMiddleware, authRoles("faculty"),
    updateAssessment
);

router.patch(
    "/:id/advance",
    authMiddleware, authRoles("faculty"),
    advanceAssessmentStatus
);

router.delete(
    "/:id",
    authMiddleware, authRoles("faculty"),
    deleteAssessment
);

router.post(
    "/:id/marks/bulk",
    authMiddleware, authRoles("faculty"),
    bulkUploadMarks
);

router.get(
    "/offering/:offeringId",
    authMiddleware, authRoles("faculty"),
    getOfferingAssessments
);

router.get(
    "/:id/marks",
    authMiddleware, authRoles("faculty"),
    getAssessmentMarks
);

router.get(
    "/:id/analytics",
    authMiddleware, authRoles("faculty"),
    getAssessmentAnalytics
);

router.get(
    "/offering/:offeringId/analytics",
    authMiddleware, authRoles("faculty"),
    getOfferingAnalytics
);

// ─── STUDENT ROUTES ──────────────────────────────────────────────────────────

router.get(
    "/my/:offeringId",
    authMiddleware, authRoles("student"),
    getStudentResults
);

router.get(
    "/my/:offeringId/grade",
    authMiddleware, authRoles("student"),
    getOverallGrade
);

export default router;
