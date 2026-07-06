import * as semesterService from "../core/semester.service.js";
import * as studentFeeService from "./studentFee.service.js";

/**
 * Controller to fetch the currently active semester configuration.
 * Route: GET /api/fees/semester/active
 * Access: Authenticated Users
 */
export const getActiveSemester = async (req, res, next) => {
    try {
        const config = await semesterService.getActiveSemester();
        return res.status(200).json({ activeSemester: config || null });
    } catch (err) { next(err); }
};

/**
 * Controller to fetch all historical and active semesters.
 * Route: GET /api/fees/semester
 * Access: Admin
 */
export const getAllSemesters = async (req, res, next) => {
    try {
        const semesters = await semesterService.getAllSemesters();
        return res.status(200).json({ semesters });
    } catch (err) { next(err); }
};

/**
 * Controller to explicitly activate a specific semester and year for the entire institution.
 * Also configures the default fee due date for the semester.
 * Route: POST /api/fees/semester/activate
 * Access: Admin
 */
export const activateSemester = async (req, res, next) => {
    try {
        const config = await semesterService.activateSemester(req.user.id, req.body);
        return res.status(200).json({ message: `${config.semester} ${config.year} is now active`, activeSemester: config });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};

/**
 * Controller to deactivate the current active semester (leaving none active).
 * Route: PATCH /api/fees/semester/deactivate
 * Access: Admin
 */
export const deactivateSemester = async (req, res, next) => {
    try {
        const config = await semesterService.deactivateSemester();
        return res.status(200).json({ message: "Semester deactivated", config });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};

/**
 * Controller to push a new global due date to the currently active semester.
 * Route: PATCH /api/fees/semester/due-date
 * Access: Admin
 */
export const updateActiveDueDate = async (req, res, next) => {
    try {
        const config = await semesterService.updateActiveDueDate(req.body.dueDate);
        return res.status(200).json({ message: "Due date updated", activeSemester: config });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};

/**
 * Controller to list all student fee records for the currently active semester.
 * Useful for admins generating reports on who has/hasn't paid.
 * Route: GET /api/fees/records
 * Access: Admin
 */
export const getAllFeeRecords = async (req, res, next) => {
    try {
        const { records, activeSemester } = await studentFeeService.getAllRecordsForActiveSemester(req.query);
        return res.status(200).json({ count: records.length, records, activeSemester });
    } catch (err) { next(err); }
};

/**
 * Controller to manually record a fee payment made by a student.
 * Updates the 'paidAmount' field.
 * Route: PATCH /api/fees/records/:id/pay
 * Access: Admin
 */
export const updatePayment = async (req, res, next) => {
    try {
        const record = await studentFeeService.updatePaidAmount(req.params.id, req.user.id, req.body);
        return res.status(200).json({ message: "Payment updated", record });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};

/**
 * Controller to batch-generate fee records for all currently active students
 * who don't already have one for the current semester.
 * Route: POST /api/fees/records/sync
 * Access: Admin
 */
export const syncFeeRecords = async (req, res, next) => {
    try {
        const result = await studentFeeService.syncRecordsForActiveSemester(req.user.id);
        return res.status(200).json({ message: `Synced: ${result.created} new records created out of ${result.total} students`, ...result });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};

/**
 * Controller for students to view their own fee breakdown, due dates, and paid status
 * for the current active semester.
 * Route: GET /api/fees/my-fees
 * Access: Student
 */
export const getMyFeeDashboard = async (req, res, next) => {
    try {
        const result = await studentFeeService.getMyFeeDashboard(req.userDoc._id);
        if (!result) return res.status(200).json({ activeSemester: null, record: null });
        return res.status(200).json(result);
    } catch (err) { next(err); }
};
