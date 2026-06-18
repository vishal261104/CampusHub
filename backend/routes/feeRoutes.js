import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import authRoles from "../middleware/authRoles.js";
import attachUser from "../middleware/attachUser.js";

// Fee structure CRUD (existing)
import {
    getAllFeeStructures,
    getAcademicYears,
    getFeeStructureById,
    createFeeStructure,
    updateFeeStructure,
    archiveFeeStructure,
    restoreFeeStructure,
} from "../controllers/feeController.js";

// Semester management + student fee dashboard (new)
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
} from "../controllers/feeManagementController.js";

import {
    createPaymentIntent,
    confirmPayment,
    getPaymentHistory,
} from "../controllers/paymentController.js";

const router = express.Router();

// ─── Public (any authenticated user) ─────────────────────────────────────────
// Both students and admin need to know the active semester
router.get("/semester/active", authMiddleware, getActiveSemester);

// ─── Student routes ───────────────────────────────────────────────────────────
router.get("/my-fees",                                     authMiddleware, authRoles("student"), attachUser, getMyFeeDashboard);
router.post("/payment/intent",                             authMiddleware, authRoles("student"), attachUser, createPaymentIntent);
router.post("/payment/confirm",                            authMiddleware, authRoles("student"), attachUser, confirmPayment);
router.get("/payment/history/:feeRecordId",                authMiddleware, authRoles("student"), attachUser, getPaymentHistory);

// ─── Admin: Semester management ───────────────────────────────────────────────
router.get("/semester",              authMiddleware, authRoles("admin"), getAllSemesters);
router.post("/semester/activate",    authMiddleware, authRoles("admin"), activateSemester);
router.patch("/semester/deactivate", authMiddleware, authRoles("admin"), deactivateSemester);
router.patch("/semester/due-date",   authMiddleware, authRoles("admin"), updateActiveDueDate);

// ─── Admin: Student fee records ───────────────────────────────────────────────
router.get("/records",           authMiddleware, authRoles("admin"), getAllFeeRecords);
router.patch("/records/:id/pay", authMiddleware, authRoles("admin"), updatePayment);
router.post("/records/sync",     authMiddleware, authRoles("admin"), syncFeeRecords);

// ─── Admin: Fee structure CRUD ────────────────────────────────────────────────
router.get("/years",             authMiddleware, authRoles("admin"), getAcademicYears);
router.get("/",                  authMiddleware, authRoles("admin"), getAllFeeStructures);
router.post("/",                 authMiddleware, authRoles("admin"), createFeeStructure);
router.get("/:id",               authMiddleware, authRoles("admin"), getFeeStructureById);
router.put("/:id",               authMiddleware, authRoles("admin"), updateFeeStructure);
router.delete("/:id",            authMiddleware, authRoles("admin"), archiveFeeStructure);
router.patch("/:id/restore",     authMiddleware, authRoles("admin"), restoreFeeStructure);

export default router;
