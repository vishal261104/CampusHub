import * as announcementService from "./announcement.service.js";

/**
 * Creates a new announcement.
 * Route: POST /api/announcements
 * Access: admin | faculty
 */
export async function createAnnouncement(req, res, next) {
    try {
        const announcement = await announcementService.createAnnouncement(
            req.user.id,
            req.user.role,
            req.body
        );
        return res.status(201).json({ announcement });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
}

/**
 * Fetches announcements visible to the authenticated user.
 * Route: GET /api/announcements
 * Access: all authenticated roles
 */
export async function getAnnouncements(req, res, next) {
    try {
        const result = await announcementService.getAnnouncementsForUser(
            req.user.id,
            req.user.role,
            req.user.department,
            req.query
        );
        return res.status(200).json(result);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
}

/**
 * Returns the count of unread announcements for the authenticated user.
 * Route: GET /api/announcements/unread-count
 * Access: all authenticated roles
 */
export async function getUnreadCount(req, res, next) {
    try {
        const count = await announcementService.getUnreadCount(
            req.user.id,
            req.user.role,
            req.user.department
        );
        return res.status(200).json({ unreadCount: count });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
}

/**
 * Marks a single announcement as read.
 * Route: PATCH /api/announcements/:id/read
 * Access: all authenticated roles
 */
export async function markAsRead(req, res, next) {
    try {
        await announcementService.markAsRead(req.user.id, req.params.id);
        return res.status(200).json({ message: "Marked as read" });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
}

/**
 * Marks all visible announcements as read.
 * Route: PATCH /api/announcements/read-all
 * Access: all authenticated roles
 */
export async function markAllRead(req, res, next) {
    try {
        await announcementService.markAllReadForUser(
            req.user.id,
            req.user.role,
            req.user.department
        );
        return res.status(200).json({ message: "All announcements marked as read" });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
}

/**
 * Updates an announcement (title, body, priority, expiresAt only).
 * Route: PATCH /api/announcements/:id
 * Access: admin | faculty (creator only)
 */
export async function updateAnnouncement(req, res, next) {
    try {
        const announcement = await announcementService.updateAnnouncement(
            req.user.id,
            req.user.role,
            req.params.id,
            req.body
        );
        return res.status(200).json({ announcement });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
}

/**
 * Deletes an announcement and all associated read receipts.
 * Route: DELETE /api/announcements/:id
 * Access: admin | faculty (creator only)
 */
export async function deleteAnnouncement(req, res, next) {
    try {
        await announcementService.deleteAnnouncement(
            req.user.id,
            req.user.role,
            req.params.id
        );
        return res.status(200).json({ message: "Announcement deleted" });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
}
