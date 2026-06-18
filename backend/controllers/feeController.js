import * as feeService from "../services/feeService.js";

// ─── ADMIN: Fee Structure CRUD ────────────────────────────────────────────────

// GET /api/fees — list all fee structures (filters via query params)
export const getAllFeeStructures = async (req, res, next) => {
    try {
        const fees = await feeService.getAllFeeStructures(req.query);
        return res.status(200).json({ count: fees.length, fees });
    } catch (err) {
        next(err);
    }
};

// GET /api/fees/years — distinct year list for dropdown
export const getAcademicYears = async (req, res, next) => {
    try {
        const years = await feeService.getDistinctYears();
        return res.status(200).json({ years });
    } catch (err) {
        next(err);
    }
};

// GET /api/fees/:id — single fee structure
export const getFeeStructureById = async (req, res, next) => {
    try {
        const fee = await feeService.getFeeStructureById(req.params.id);
        return res.status(200).json({ fee });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};

// POST /api/fees — create fee structure
export const createFeeStructure = async (req, res, next) => {
    try {
        const fee = await feeService.createFeeStructure(req.user.id, req.body);
        return res.status(201).json({ message: "Fee structure created", fee });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};

// PUT /api/fees/:id — update fee structure
export const updateFeeStructure = async (req, res, next) => {
    try {
        const fee = await feeService.updateFeeStructure(req.params.id, req.body);
        return res.status(200).json({ message: "Fee structure updated", fee });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};

// DELETE /api/fees/:id — soft-archive
export const archiveFeeStructure = async (req, res, next) => {
    try {
        const fee = await feeService.archiveFeeStructure(req.params.id);
        return res.status(200).json({ message: "Fee structure archived", fee });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};

// PATCH /api/fees/:id/restore — restore archived fee structure
export const restoreFeeStructure = async (req, res, next) => {
    try {
        const fee = await feeService.restoreFeeStructure(req.params.id);
        return res.status(200).json({ message: "Fee structure restored", fee });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};
