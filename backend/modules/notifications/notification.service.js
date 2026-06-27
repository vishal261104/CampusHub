import Notification from "./notification.model.js";
import StudentFeeRecord from "../fees/studentFeeRecord.model.js";

// ─── Core CRUD ────────────────────────────────────────────────────────────────

/**
 * Create a single notification for a user.
 */
export async function createNotification(userId, type, title, body, metadata = {}) {
    return Notification.create({ userId, type, title, body, metadata });
}

/**
 * Get the latest 30 notifications for a user (unread first, then by date).
 */
export async function getMyNotifications(userId) {
    return Notification.find({ userId })
        .sort({ isRead: 1, createdAt: -1 })
        .limit(30)
        .lean();
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllRead(userId) {
    return Notification.updateMany({ userId, isRead: false }, { isRead: true });
}

/**
 * Mark a single notification as read.
 */
export async function markOneRead(userId, notificationId) {
    return Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { isRead: true },
        { new: true }
    );
}

/**
 * Count unread notifications for a user.
 */
export async function countUnread(userId) {
    return Notification.countDocuments({ userId, isRead: false });
}

// ─── Due-Fee Scanner (run periodically from index.js) ─────────────────────────

function fmtINR(n) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
}

function fmtDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Scans all active fee records and fires due-date notifications.
 * Called hourly from index.js via setInterval.
 * Avoids duplicates by checking if a notification of the same type
 * was already created for this user within the last 20 hours.
 */
export async function scanDueFeeNotifications() {
    const now = new Date();

    // We check records whose dueDate falls within the next 8 days (covers 7d and 1d windows)
    const soon = new Date(now);
    soon.setDate(soon.getDate() + 8);

    const records = await StudentFeeRecord.find({
        dueDate: { $gte: now, $lte: soon },
        status: { $in: ["Pending", "Partial"] }, // skip fully paid
    }).populate("studentId", "_id name");

    let fired = 0;

    for (const record of records) {
        const userId = record.studentId?._id;
        if (!userId) continue;

        const daysLeft = Math.ceil((new Date(record.dueDate) - now) / (1000 * 60 * 60 * 24));
        const pending = record.totalAmount - record.paidAmount;
        const dueDateStr = fmtDate(record.dueDate);
        const amountStr = fmtINR(pending);
        const semLabel = `${record.semester} ${record.year}`;

        let type = null;
        let title = '';
        let body = '';

        if (daysLeft <= 1) {
            type = "fee_due_1d";
            title = "⚠️ Fee Due Tomorrow!";
            body = `${amountStr} for ${semLabel} is due on ${dueDateStr}. Please pay before the deadline.`;
        } else if (daysLeft <= 7) {
            type = "fee_due_7d";
            title = "📅 Fee Due in 7 Days";
            body = `${amountStr} for ${semLabel} is due on ${dueDateStr}. Pay early to avoid late fees.`;
        }

        if (!type) continue;

        // Dedup: skip if we already sent this type for this user in the last 20 hours
        const cutoff = new Date(now.getTime() - 20 * 60 * 60 * 1000);
        const existing = await Notification.findOne({
            userId,
            type,
            createdAt: { $gte: cutoff },
            "metadata.feeRecordId": String(record._id),
        });
        if (existing) continue;

        await createNotification(userId, type, title, body, {
            feeRecordId: record._id,
            daysLeft,
            amount: pending,
        });
        fired++;
    }

    if (fired > 0) {
        console.log(`[notifications] Fired ${fired} due-fee notification(s).`);
    }
}
