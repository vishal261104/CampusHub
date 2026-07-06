import Notification from "./notification.model.js";
import StudentFeeRecord from "../fees/studentFeeRecord.model.js";




/**
 * Creates a new notification for a specific user.
 */
export async function createNotification(userId, type, title, body, metadata = {}) {
    return Notification.create({ userId, type, title, body, metadata });
}


/**
 * Fetches recent notifications for a user, sorted by unread status and date.
 */
export async function getMyNotifications(userId) {
    return Notification.find({ userId })
        .sort({ isRead: 1, createdAt: -1 })
        .limit(30)
        .lean();
}


/**
 * Marks all unread notifications as read for a given user.
 */
export async function markAllRead(userId) {
    return Notification.updateMany({ userId, isRead: false }, { isRead: true });
}


/**
 * Marks a single specific notification as read.
 */
export async function markOneRead(userId, notificationId) {
    return Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { isRead: true },
        { new: true }
    );
}


/**
 * Returns the count of unread notifications for a user.
 */
export async function countUnread(userId) {
    return Notification.countDocuments({ userId, isRead: false });
}



function fmtINR(n) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
}

function fmtDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}


/**
 * Background job to scan for pending fees and generate due fee notifications.
 * Runs automatically based on a schedule.
 */
export async function scanDueFeeNotifications() {
    const now = new Date();

    
    const soon = new Date(now);
    soon.setDate(soon.getDate() + 8);

    const records = await StudentFeeRecord.find({
        dueDate: { $gte: now, $lte: soon },
        status: { $in: ["Pending", "Partial"] }, 
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
