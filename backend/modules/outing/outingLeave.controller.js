import * as outingLeaveService from "./outingLeave.service.js";




/**
 * Retrieves the global settings for outing/leave (e.g. late return thresholds).
 */
export const getSettings = async (req, res, next) => {
    try {
        const settings = await outingLeaveService.getSettings();
        return res.status(200).json({ settings });
    } catch (err) {
        next(err);
    }
};


/**
 * Updates the late return threshold (hour and minute) used for evaluating late check-ins.
 */
export const updateThreshold = async (req, res, next) => {
    try {
        const settings = await outingLeaveService.updateLateThreshold(req.user.id, req.body);
        return res.status(200).json({ message: "Late return threshold updated", settings });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};




/**
 * Creates a new outing record for a student, provided they have an active room allocation.
 */
export const createOuting = async (req, res, next) => {
    try {
        const outing = await outingLeaveService.createOuting(req.userDoc._id, req.body);
        return res.status(201).json({ message: "Outing created. Safe travels!", outing });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};


/**
 * Checks a student back in from an active outing and marks if they are late.
 */
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


/**
 * Retrieves the history of outings for the currently logged-in student.
 */
export const getMyOutings = async (req, res, next) => {
    try {
        const outings = await outingLeaveService.getMyOutings(req.userDoc._id);
        return res.status(200).json({ count: outings.length, outings });
    } catch (err) {
        next(err);
    }
};


/**
 * Retrieves all currently active (not yet checked-in) outings across the hostel.
 */
export const getActiveOutings = async (req, res, next) => {
    try {
        const outings = await outingLeaveService.getActiveOutings();
        return res.status(200).json({ count: outings.length, outings });
    } catch (err) {
        next(err);
    }
};


/**
 * Retrieves all outing records with pagination and optional status filters (admin use).
 */
export const getAllOutings = async (req, res, next) => {
    try {
        const result = await outingLeaveService.getAllOutings(req.query);
        return res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};




/**
 * Submits a new leave request for a student extending over multiple days.
 */
export const createLeaveRequest = async (req, res, next) => {
    try {
        const leave = await outingLeaveService.createLeaveRequest(req.userDoc._id, req.body);
        return res.status(201).json({ message: "Leave request submitted for review", leave });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};


/**
 * Retrieves the history of leave requests for the currently logged-in student.
 */
export const getMyLeaveRequests = async (req, res, next) => {
    try {
        const requests = await outingLeaveService.getMyLeaveRequests(req.userDoc._id);
        return res.status(200).json({ count: requests.length, requests });
    } catch (err) {
        next(err);
    }
};


/**
 * Retrieves all leave requests with pagination and optional status filters (admin use).
 */
export const getAllLeaveRequests = async (req, res, next) => {
    try {
        const result = await outingLeaveService.getAllLeaveRequests(req.query);
        return res.status(200).json(result);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};


/**
 * Reviews (approves or rejects) a pending leave request.
 */
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
