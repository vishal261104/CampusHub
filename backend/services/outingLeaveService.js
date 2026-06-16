import Outing from "../models/Outing.js";
import LeaveRequest from "../models/LeaveRequest.js";
import RoomAllocation from "../models/RoomAllocation.js";
import HostelSettings from "../models/HostelSettings.js";

// Validates that a student has an active room allocation before allowing outing/leave actions.
async function requireActiveAllocation(studentId) {
    const allocation = await RoomAllocation.findOne({ studentId, isActive: true });
    if (!allocation) {
        const err = new Error("You must have an active room allocation to use outing/leave features.");
        err.status = 403;
        throw err;
    }
    return allocation;
}

// Returns true if the given Date is at or after the configured late-return threshold.
async function isLate(dateTime) {
    const settings = await HostelSettings.getSingleton();
    const h = dateTime.getHours();
    const m = dateTime.getMinutes();
    return h > settings.lateReturnHour ||
        (h === settings.lateReturnHour && m >= settings.lateReturnMinute);
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

// Returns the current hostel settings (late return threshold).
export async function getSettings() {
    return HostelSettings.getSingleton();
}

// Updates the late return threshold hour and minute. Only hostelAdmin can call this.
export async function updateLateThreshold(adminId, { lateReturnHour, lateReturnMinute }) {
    const hour = parseInt(lateReturnHour, 10);
    const minute = parseInt(lateReturnMinute ?? 0, 10);

    if (isNaN(hour) || hour < 0 || hour > 23) {
        const err = new Error("lateReturnHour must be between 0 and 23");
        err.status = 400;
        throw err;
    }
    if (isNaN(minute) || minute < 0 || minute > 59) {
        const err = new Error("lateReturnMinute must be between 0 and 59");
        err.status = 400;
        throw err;
    }

    const settings = await HostelSettings.getSingleton();
    settings.lateReturnHour = hour;
    settings.lateReturnMinute = minute;
    settings.updatedBy = adminId;
    await settings.save();
    return settings;
}

// ─── OUTINGS ──────────────────────────────────────────────────────────────────

// Creates a same-day outing entry for a student. Rejects if the student already has an active outing.
export async function createOuting(studentId, { purpose, expectedReturnTime }) {
    await requireActiveAllocation(studentId);

    if (!purpose?.trim() || !expectedReturnTime?.trim()) {
        const err = new Error("purpose and expectedReturnTime are required");
        err.status = 400;
        throw err;
    }

    const existing = await Outing.findOne({ studentId, status: "active" });
    if (existing) {
        const err = new Error("You already have an active outing. Please check in first.");
        err.status = 409;
        throw err;
    }

    return Outing.create({ studentId, purpose: purpose.trim(), expectedReturnTime: expectedReturnTime.trim() });
}

// Marks a student's active outing as completed. Flags as late if check-in time is past the DB-configured threshold.
export async function checkIn(studentId) {
    const outing = await Outing.findOne({ studentId, status: "active" });
    if (!outing) {
        const err = new Error("No active outing found.");
        err.status = 404;
        throw err;
    }

    const now = new Date();
    outing.inTime = now;
    outing.status = "completed";
    outing.isLateReturn = await isLate(now);
    await outing.save();
    return outing;
}

// Returns a student's full outing history, newest first.
export async function getMyOutings(studentId) {
    return Outing.find({ studentId }).sort({ createdAt: -1 });
}

// Returns all currently active outings (students outside hostel). Admin dashboard.
export async function getActiveOutings() {
    return Outing.find({ status: "active" })
        .populate("studentId", "name email studentId")
        .sort({ outTime: 1 });
}

// Returns all outings with optional filters for admin. Supports status filter and pagination.
export async function getAllOutings({ status, page = 1, limit = 30 } = {}) {
    const filter = {};
    if (status) filter.status = status;

    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
    const skip = (p - 1) * l;

    const [outings, count] = await Promise.all([
        Outing.find(filter)
            .populate("studentId", "name email studentId")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(l),
        Outing.countDocuments(filter),
    ]);
    return { count, page: p, limit: l, outings };
}

// ─── LEAVE REQUESTS ───────────────────────────────────────────────────────────

// Creates an overnight/multi-day leave request for a student.
export async function createLeaveRequest(studentId, { reason, fromDate, toDate, emergencyContact }) {
    await requireActiveAllocation(studentId);

    if (!reason?.trim() || !fromDate || !toDate || !emergencyContact?.trim()) {
        const err = new Error("reason, fromDate, toDate, and emergencyContact are required");
        err.status = 400;
        throw err;
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (isNaN(from) || isNaN(to)) {
        const err = new Error("fromDate and toDate must be valid dates");
        err.status = 400;
        throw err;
    }
    if (to <= from) {
        const err = new Error("toDate must be after fromDate");
        err.status = 400;
        throw err;
    }

    return LeaveRequest.create({
        studentId,
        reason: reason.trim(),
        fromDate: from,
        toDate: to,
        emergencyContact: emergencyContact.trim(),
    });
}

// Returns all leave requests for the authenticated student, newest first.
export async function getMyLeaveRequests(studentId) {
    return LeaveRequest.find({ studentId }).sort({ createdAt: -1 });
}

// Returns all leave requests for admin with optional status filter.
export async function getAllLeaveRequests({ status, page = 1, limit = 30 } = {}) {
    const filter = {};
    const allowed = ["pending", "approved", "rejected"];
    if (status) {
        if (!allowed.includes(status)) {
            const err = new Error(`Invalid status. Must be one of: ${allowed.join(", ")}`);
            err.status = 400;
            throw err;
        }
        filter.status = status;
    }

    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
    const skip = (p - 1) * l;

    const [requests, count] = await Promise.all([
        LeaveRequest.find(filter)
            .populate("studentId", "name email studentId")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(l),
        LeaveRequest.countDocuments(filter),
    ]);
    return { count, page: p, limit: l, requests };
}

// Approves or rejects a leave request. Sets reviewedAt and optional reviewNote.
export async function reviewLeaveRequest(leaveId, action, reviewNote = "") {
    const allowed = ["approved", "rejected"];
    if (!allowed.includes(action)) {
        const err = new Error("action must be 'approved' or 'rejected'");
        err.status = 400;
        throw err;
    }

    const leave = await LeaveRequest.findById(leaveId);
    if (!leave) {
        const err = new Error("Leave request not found");
        err.status = 404;
        throw err;
    }
    if (leave.status !== "pending") {
        const err = new Error(`Leave request is already ${leave.status}`);
        err.status = 400;
        throw err;
    }

    leave.status = action;
    leave.reviewedAt = new Date();
    leave.reviewNote = reviewNote?.trim() || "";
    await leave.save();
    return leave;
}
