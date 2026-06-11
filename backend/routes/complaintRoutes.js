import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import authRoles from "../middleware/authRoles.js";
import attachUser from "../middleware/attachUser.js";
import {
    createComplaint,
    getMyComplaints,
    getAllComplaints,
    updateComplaintStatus,
    assignComplaint,
    addComment,
} from "../controllers/hostelComplaintController.js";

const router = express.Router();

// ─── Student routes ────────────────────────────────────────────────────────────
// roomId is derived from active RoomAllocation in service — never trusted from body
router.post("/", authMiddleware, authRoles("student"), attachUser, createComplaint);
router.get("/my", authMiddleware, authRoles("student"), attachUser, getMyComplaints);
router.post("/:id/comments", authMiddleware, authRoles("student", "hostelAdmin"), attachUser, addComment);

// ─── hostelAdmin routes ────────────────────────────────────────────────────────
router.get("/", authMiddleware, authRoles("hostelAdmin"), getAllComplaints);
router.patch("/:id/status", authMiddleware, authRoles("hostelAdmin"), updateComplaintStatus);
router.patch("/:id/assign", authMiddleware, authRoles("hostelAdmin"), assignComplaint);
// Admin can also add comments
router.post("/:id/comments", authMiddleware, authRoles("student", "hostelAdmin"), attachUser, addComment);

export default router;
