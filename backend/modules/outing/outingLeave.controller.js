import * as outingLeaveService from "./outingLeave.service.js";

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

// Handles HTTP request to retrieve the current hostel settings (late return threshold).
export const getSettings = async (req, res, next) => {
    try {
        const settings = await outingLeaveService.getSettings();
        return res.status(200).json({ settings });
    } catch (err) {
        next(err);
    }
};

// Handles HTTP request for hostelAdmin to update the late return threshold.
export const updateThreshold = async (req, res, next) => {
    try {
        const settings = await outingLeaveService.updateLateThreshold(req.user.id, req.body);
        return res.status(200).json({ message: "Late return threshold updated", settings });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};

// ─── OUTINGS ──────────────────────────────────────────────────────────────────

// Handles HTTP request for a student to create a new same-day outing.
export const createOuting = async (req, res, next) => {
    try {
        const outing = await outingLeaveService.createOuting(req.userDoc._id, req.body);
        return res.status(201).json({ message: "Outing created. Safe travels!", outing });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};

// Handles HTTP request for a student to mark their return (check-in).
export const checkIn = async (req, res, next) => {
    try {
        const outing = await outingLeaveService.checkIn(req.userDoc._id);
        const lateMsg = outing.isLateReturn ? " (Late return flagged)" : "";
        return res.status(200).json({ message: `Checked in successfully${lateMsg}`, outing });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};

// Handles HTTP request for a student to view their outing history.
export const getMyOutings = async (req, res, next) => {
    try {
        const outings = await outingLeaveService.getMyOutings(req.userDoc._id);
        return res.status(200).json({ count: outings.length, outings });
    } catch (err) {
        next(err);
    }
};

// Handles HTTP request for hostelAdmin to see currently active outings (students outside).
export const getActiveOutings = async (req, res, next) => {
    try {
        const outings = await outingLeaveService.getActiveOutings();
        return res.status(200).json({ count: outings.length, outings });
    } catch (err) {
        next(err);
    }
};

// Handles HTTP request for hostelAdmin to list all outings with optional filters.
export const getAllOutings = async (req, res, next) => {
    try {
        const result = await outingLeaveService.getAllOutings(req.query);
        return res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};

// ─── LEAVE REQUESTS ───────────────────────────────────────────────────────────

// Handles HTTP request for a student to submit an overnight leave request.
export const createLeaveRequest = async (req, res, next) => {
    try {
        const leave = await outingLeaveService.createLeaveRequest(req.userDoc._id, req.body);
        return res.status(201).json({ message: "Leave request submitted for review", leave });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};

// Handles HTTP request for a student to view their leave request history.
export const getMyLeaveRequests = async (req, res, next) => {
    try {
        const requests = await outingLeaveService.getMyLeaveRequests(req.userDoc._id);
        return res.status(200).json({ count: requests.length, requests });
    } catch (err) {
        next(err);
    }
};

// Handles HTTP request for hostelAdmin to list all leave requests with optional status filter.
export const getAllLeaveRequests = async (req, res, next) => {
    try {
        const result = await outingLeaveService.getAllLeaveRequests(req.query);
        return res.status(200).json(result);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};

// Handles HTTP request for hostelAdmin to approve or reject a leave request.
export const reviewLeaveRequest = async (req, res, next) => {
    try {
        const { action, reviewNote } = req.body;
        const leave = await outingLeaveService.reviewLeaveRequest(req.params.id, action, reviewNote);
        return res.status(200).json({ message: `Leave request ${action}`, leave });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};
