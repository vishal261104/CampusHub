import * as semesterService from "../services/semesterService.js";
import * as studentFeeService from "../services/studentFeeService.js";

// ─── SEMESTER MANAGEMENT (Admin) ──────────────────────────────────────────────

export const getActiveSemester = async (req, res, next) => {
    try {
        const config = await semesterService.getActiveSemester();
        return res.status(200).json({ activeSemester: config || null });
    } catch (err) { next(err); }
};

export const getAllSemesters = async (req, res, next) => {
    try {
        const semesters = await semesterService.getAllSemesters();
        return res.status(200).json({ semesters });
    } catch (err) { next(err); }
};

export const activateSemester = async (req, res, next) => {
    try {
        const config = await semesterService.activateSemester(req.user.id, req.body);
        return res.status(200).json({ message: `${config.semester} ${config.year} is now active`, activeSemester: config });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};

export const deactivateSemester = async (req, res, next) => {
    try {
        const config = await semesterService.deactivateSemester();
        return res.status(200).json({ message: "Semester deactivated", config });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};

export const updateActiveDueDate = async (req, res, next) => {
    try {
        const config = await semesterService.updateActiveDueDate(req.body.dueDate);
        return res.status(200).json({ message: "Due date updated", activeSemester: config });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};

// ─── FEE RECORDS (Admin) ──────────────────────────────────────────────────────

export const getAllFeeRecords = async (req, res, next) => {
    try {
        const { records, activeSemester } = await studentFeeService.getAllRecordsForActiveSemester(req.query);
        return res.status(200).json({ count: records.length, records, activeSemester });
    } catch (err) { next(err); }
};

export const updatePayment = async (req, res, next) => {
    try {
        const record = await studentFeeService.updatePaidAmount(req.params.id, req.user.id, req.body);
        return res.status(200).json({ message: "Payment updated", record });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};

export const syncFeeRecords = async (req, res, next) => {
    try {
        const result = await studentFeeService.syncRecordsForActiveSemester(req.user.id);
        return res.status(200).json({ message: `Synced: ${result.created} new records created out of ${result.total} students`, ...result });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};

// ─── STUDENT DASHBOARD ────────────────────────────────────────────────────────

export const getMyFeeDashboard = async (req, res, next) => {
    try {
        const result = await studentFeeService.getMyFeeDashboard(req.userDoc._id);
        if (!result) return res.status(200).json({ activeSemester: null, record: null });
        return res.status(200).json(result);
    } catch (err) { next(err); }
};
