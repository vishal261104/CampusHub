import express from "express";
import authMiddleware from "../../middleware/authMiddleware.js";
import authRoles from "../../middleware/authRoles.js";
import attachUser from "../../middleware/attachUser.js";


import {
    getAllFeeStructures,
    getAcademicYears,
    getFeeStructureById,
    createFeeStructure,
    updateFeeStructure,
    archiveFeeStructure,
    restoreFeeStructure,
} from "./fee.controller.js";


import {
    getActiveSemester,
    getAllSemesters,
    activateSemester,
    deactivateSemester,
    updateActiveDueDate,
    getAllFeeRecords,
    updatePayment,
    syncFeeRecords,
    getMyFeeDashboard,
} from "./feeManagement.controller.js";



const router = express.Router();


// ─── SEMESTER & ACTIVE FEES ───────────────────────────────────────────────────

/**
 * GET /api/fees/semester/active
 * Fetches the currently active semester globally.
 */
router.get("/semester/active", authMiddleware, getActiveSemester);

/**
 * GET /api/fees/my-fees
 * Fetches the logged-in student's fee dashboard for the active semester.
 */
router.get("/my-fees",                                     authMiddleware, authRoles("student"), attachUser, getMyFeeDashboard);


// ─── ADMIN: SEMESTER MANAGEMENT ───────────────────────────────────────────────

/**
 * GET /api/fees/semester
 * Fetches all active/historical semesters.
 */
router.get("/semester",              authMiddleware, authRoles("admin"), getAllSemesters);

/**
 * POST /api/fees/semester/activate
 * Activates a new semester for fee processing globally.
 */
router.post("/semester/activate",    authMiddleware, authRoles("admin"), activateSemester);

/**
 * PATCH /api/fees/semester/deactivate
 * Deactivates the currently active semester.
 */
router.patch("/semester/deactivate", authMiddleware, authRoles("admin"), deactivateSemester);

/**
 * PATCH /api/fees/semester/due-date
 * Updates the global due date for the currently active semester fees.
 */
router.patch("/semester/due-date",   authMiddleware, authRoles("admin"), updateActiveDueDate);


// ─── ADMIN: STUDENT FEE RECORDS ───────────────────────────────────────────────

/**
 * GET /api/fees/records
 * Lists fee records for all students for the active semester.
 */
router.get("/records",           authMiddleware, authRoles("admin"), getAllFeeRecords);

/**
 * PATCH /api/fees/records/:id/pay
 * Manually records or updates a payment against a student's fee record.
 */
router.patch("/records/:id/pay", authMiddleware, authRoles("admin"), updatePayment);

/**
 * POST /api/fees/records/sync
 * Generates missing fee records for active students in the active semester.
 */
router.post("/records/sync",     authMiddleware, authRoles("admin"), syncFeeRecords);


// ─── ADMIN: FEE STRUCTURE TEMPLATES ───────────────────────────────────────────

/**
 * GET /api/fees/years
 * Fetches distinct years currently configured in fee structures.
 */
router.get("/years",             authMiddleware, authRoles("admin"), getAcademicYears);

/**
 * GET /api/fees/
 * Lists base fee structure templates (e.g. Tuition, Library).
 */
router.get("/",                  authMiddleware, authRoles("admin"), getAllFeeStructures);

/**
 * POST /api/fees/
 * Creates a new base fee structure.
 */
router.post("/",                 authMiddleware, authRoles("admin"), createFeeStructure);

/**
 * GET /api/fees/:id
 * Fetches a single base fee structure by ID.
 */
router.get("/:id",               authMiddleware, authRoles("admin"), getFeeStructureById);

/**
 * PUT /api/fees/:id
 * Updates an active base fee structure.
 */
router.put("/:id",               authMiddleware, authRoles("admin"), updateFeeStructure);

/**
 * DELETE /api/fees/:id
 * Archives (soft-deletes) a fee structure.
 */
router.delete("/:id",            authMiddleware, authRoles("admin"), archiveFeeStructure);

/**
 * PATCH /api/fees/:id/restore
 * Restores an archived fee structure.
 */
router.patch("/:id/restore",     authMiddleware, authRoles("admin"), restoreFeeStructure);

export default router;
