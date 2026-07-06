import * as feeService from "./fee.service.js";

/**
 * Controller to fetch all fee structures (base fees).
 * Supports filtering by year, semester, category, and active status.
 * Route: GET /api/fees/
 * Access: Admin
 */
export const getAllFeeStructures = async (req, res, next) => {
    try {
        const fees = await feeService.getAllFeeStructures(req.query);
        return res.status(200).json({ count: fees.length, fees });
    } catch (err) {
        next(err);
    }
};

/**
 * Controller to fetch a distinct list of academic years currently used in fee structures.
 * Route: GET /api/fees/years
 * Access: Admin
 */
export const getAcademicYears = async (req, res, next) => {
    try {
        const years = await feeService.getDistinctYears();
        return res.status(200).json({ years });
    } catch (err) {
        next(err);
    }
};

/**
 * Controller to fetch details of a specific fee structure by ID.
 * Route: GET /api/fees/:id
 * Access: Admin
 */
export const getFeeStructureById = async (req, res, next) => {
    try {
        const fee = await feeService.getFeeStructureById(req.params.id);
        return res.status(200).json({ fee });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};

/**
 * Controller to create a new fee structure component (e.g., Tuition Fee for Fall 2024).
 * Ensures no duplicates exist for the same category, year, and semester.
 * Route: POST /api/fees/
 * Access: Admin
 */
export const createFeeStructure = async (req, res, next) => {
    try {
        const fee = await feeService.createFeeStructure(req.user.id, req.body);
        return res.status(201).json({ message: "Fee structure created", fee });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};

/**
 * Controller to update an existing active fee structure.
 * Validates that it doesn't conflict with another existing component.
 * Route: PUT /api/fees/:id
 * Access: Admin
 */
export const updateFeeStructure = async (req, res, next) => {
    try {
        const fee = await feeService.updateFeeStructure(req.params.id, req.body);
        return res.status(200).json({ message: "Fee structure updated", fee });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};

/**
 * Controller to logically archive (soft-delete) a fee structure.
 * Archived fees are not applied to new students in active semesters.
 * Route: DELETE /api/fees/:id
 * Access: Admin
 */
export const archiveFeeStructure = async (req, res, next) => {
    try {
        const fee = await feeService.archiveFeeStructure(req.params.id);
        return res.status(200).json({ message: "Fee structure archived", fee });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};

/**
 * Controller to restore an archived fee structure, making it active again.
 * Route: PATCH /api/fees/:id/restore
 * Access: Admin
 */
export const restoreFeeStructure = async (req, res, next) => {
    try {
        const fee = await feeService.restoreFeeStructure(req.params.id);
        return res.status(200).json({ message: "Fee structure restored", fee });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};
