import express from "express";
import authMiddleware from "../../middleware/authMiddleware.js";
import authRoles from "../../middleware/authRoles.js";
import attachUser from "../../middleware/attachUser.js";
import {
    createOuting,
    checkIn,
    getMyOutings,
    getActiveOutings,
    getAllOutings,
    createLeaveRequest,
    getMyLeaveRequests,
    getAllLeaveRequests,
    reviewLeaveRequest,
    getSettings,
    updateThreshold,
} from "./outingLeave.controller.js";

const router = express.Router();

// ─── Settings (both roles can read; only hostelAdmin can update) ─────────────────
router.get("/settings", authMiddleware, getSettings);
router.patch("/settings/threshold", authMiddleware, authRoles("hostelAdmin"), updateThreshold);

// ─── Student outing routes ─────────────────────────────────────────────────────
// studentId is derived from req.userDoc via attachUser — never from request body
router.post("/outings", authMiddleware, authRoles("student"), attachUser, createOuting);
router.patch("/outings/checkin", authMiddleware, authRoles("student"), attachUser, checkIn);
router.get("/outings/my", authMiddleware, authRoles("student"), attachUser, getMyOutings);

// ─── Student leave routes ──────────────────────────────────────────────────────
router.post("/leave", authMiddleware, authRoles("student"), attachUser, createLeaveRequest);
router.get("/leave/my", authMiddleware, authRoles("student"), attachUser, getMyLeaveRequests);

// ─── hostelAdmin routes ────────────────────────────────────────────────────────
router.get("/outings/active", authMiddleware, authRoles("hostelAdmin"), getActiveOutings);
router.get("/outings", authMiddleware, authRoles("hostelAdmin"), getAllOutings);
router.get("/leave", authMiddleware, authRoles("hostelAdmin"), getAllLeaveRequests);
router.patch("/leave/:id/review", authMiddleware, authRoles("hostelAdmin"), reviewLeaveRequest);

export default router;
