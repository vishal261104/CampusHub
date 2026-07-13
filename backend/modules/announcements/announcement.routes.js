import express from "express";
import authMiddleware from "../../middleware/authMiddleware.js";
import {
    createAnnouncement,
    getAnnouncements,
    getUnreadCount,
    markAsRead,
    markAllRead,
    updateAnnouncement,
    deleteAnnouncement,
} from "./announcement.controller.js";

/**
 * Announcement Routes
 * Central communication hub — allows admin and faculty to publish targeted
 * announcements and all users to view, filter, search, and mark them as read.
 */
const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// ─── READ ROUTES (all roles) ─────────────────────────────────────────────────

router.get("/", getAnnouncements);
router.get("/unread-count", getUnreadCount);

// ─── READ RECEIPT ROUTES (all roles) ─────────────────────────────────────────

// Order matters — /read-all must come before /:id/read to avoid Express matching "read-all" as an :id
router.patch("/read-all", markAllRead);
router.patch("/:id/read", markAsRead);

// ─── PUBLISH / MANAGE ROUTES (admin | faculty) ───────────────────────────────

router.post("/", createAnnouncement);
router.patch("/:id", updateAnnouncement);
router.delete("/:id", deleteAnnouncement);

export default router;
