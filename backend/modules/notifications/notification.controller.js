import * as notificationService from "./notification.service.js";

// GET /api/notifications
export const getMyNotifications = async (req, res, next) => {
    try {
        const notifications = await notificationService.getMyNotifications(req.userDoc._id);
        const unreadCount = notifications.filter(n => !n.isRead).length;
        return res.status(200).json({ unreadCount, notifications });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/notifications/read-all
export const markAllRead = async (req, res, next) => {
    try {
        await notificationService.markAllRead(req.userDoc._id);
        return res.status(200).json({ message: "All notifications marked as read" });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/notifications/:id/read
export const markOneRead = async (req, res, next) => {
    try {
        const notification = await notificationService.markOneRead(req.userDoc._id, req.params.id);
        if (!notification) return res.status(404).json({ message: "Notification not found" });
        return res.status(200).json({ notification });
    } catch (err) {
        next(err);
    }
};
