import FeeStructure, { FEE_CATEGORIES_LIST, FEE_SEMESTERS_LIST } from "./feeStructure.model.js";



function validateCategory(category) {
    if (!FEE_CATEGORIES_LIST.includes(category)) {
        const err = new Error(`Invalid category. Must be one of: ${FEE_CATEGORIES_LIST.join(", ")}`);
        err.status = 400;
        throw err;
    }
}

function validateSemester(semester) {
    if (!FEE_SEMESTERS_LIST.includes(semester)) {
        const err = new Error(`Invalid semester. Must be one of: ${FEE_SEMESTERS_LIST.join(", ")}`);
        err.status = 400;
        throw err;
    }
    return semester;
}

function validateAmount(amount) {
    const a = parseFloat(amount);
    if (isNaN(a) || a < 0) {
        const err = new Error("amount must be a non-negative number");
        err.status = 400;
        throw err;
    }
    return a;
}

function validateYear(year) {
    const y = parseInt(year, 10);
    if (isNaN(y) || y < 2000) {
        const err = new Error("year must be a valid calendar year (≥ 2000)");
        err.status = 400;
        throw err;
    }
    return y;
}

async function assertNoDuplicate(category, year, semester, excludeId = null) {
    const filter = { category, year, semester };
    if (excludeId) filter._id = { $ne: excludeId };
    const existing = await FeeStructure.findOne(filter);
    if (existing) {
        const err = new Error(
            `A fee structure for "${category}" in ${semester} ${year} already exists.`
        );
        err.status = 409;
        throw err;
    }
}




/**
 * Creates a new base fee structure (e.g. Tuition Fee, Library Fee) for a specific term.
 * @param {String} adminId - ID of the admin creating this structure
 * @param {Object} data - Contains category, label, amount, year, semester, description
 */
export async function createFeeStructure(adminId, { category, label, amount, year, semester, description }) {
    if (!label?.trim()) {
        const err = new Error("label is required");
        err.status = 400;
        throw err;
    }

    validateCategory(category);
    validateSemester(semester);
    const yr  = validateYear(year);
    const amt = validateAmount(amount);

    await assertNoDuplicate(category, yr, semester);

    return FeeStructure.create({
        category,
        label: label.trim(),
        amount: amt,
        year: yr,
        semester,
        description: description?.trim() || "",
        createdBy: adminId,
    });
}


/**
 * Retrieves all fee structures matching the specified filters.
 * @param {Object} query - Filtering params (year, semester, category, isActive)
 */
export async function getAllFeeStructures({ year, semester, category, isActive } = {}) {
    const filter = {};

    
    if (isActive === "false" || isActive === false) {
        filter.isActive = false;
    } else if (isActive === "all") {
        
    } else {
        filter.isActive = true;
    }

    if (year)     filter.year     = parseInt(year, 10);
    if (semester && FEE_SEMESTERS_LIST.includes(semester)) filter.semester = semester;
    if (category && FEE_CATEGORIES_LIST.includes(category)) filter.category = category;

    return FeeStructure.find(filter)
        .populate("createdBy", "name email")
        .sort({ year: -1, semester: 1, category: 1 });
}


/**
 * Fetches a single fee structure by ID.
 * @param {String} id - Fee structure ID
 */
export async function getFeeStructureById(id) {
    const fee = await FeeStructure.findById(id).populate("createdBy", "name email");
    if (!fee) {
        const err = new Error("Fee structure not found");
        err.status = 404;
        throw err;
    }
    return fee;
}


/**
 * Updates an active fee structure.
 * Prevents editing if the structure has been archived.
 * @param {String} id - Fee structure ID
 * @param {Object} data - Fields to update
 */
export async function updateFeeStructure(id, { category, label, amount, year, semester, description }) {
    const fee = await FeeStructure.findById(id);
    if (!fee) {
        const err = new Error("Fee structure not found");
        err.status = 404;
        throw err;
    }
    if (!fee.isActive) {
        const err = new Error("Cannot edit an archived fee structure. Restore it first.");
        err.status = 400;
        throw err;
    }

    
    const newCategory    = category    || fee.category;
    const newSemester    = semester    || fee.semester;
    const newYear        = year        !== undefined ? validateYear(year)     : fee.year;
    const newAmount      = amount      !== undefined ? validateAmount(amount) : fee.amount;
    const newLabel       = label?.trim()  || fee.label;
    const newDescription = description !== undefined ? description.trim() : fee.description;

    if (category) validateCategory(newCategory);
    if (semester) validateSemester(newSemester);

    
    const tupleChanged =
        newCategory  !== fee.category  ||
        newYear      !== fee.year      ||
        newSemester  !== fee.semester;

    if (tupleChanged) {
        await assertNoDuplicate(newCategory, newYear, newSemester, id);
    }

    fee.category    = newCategory;
    fee.label       = newLabel;
    fee.amount      = newAmount;
    fee.year        = newYear;
    fee.semester    = newSemester;
    fee.description = newDescription;

    await fee.save();
    return fee;
}


/**
 * Archies a fee structure so it is no longer applied to new active semester syncs.
 * @param {String} id - Fee structure ID
 */
export async function archiveFeeStructure(id) {
    const fee = await FeeStructure.findById(id);
    if (!fee) {
        const err = new Error("Fee structure not found");
        err.status = 404;
        throw err;
    }
    if (!fee.isActive) {
        const err = new Error("Fee structure is already archived");
        err.status = 400;
        throw err;
    }
    fee.isActive = false;
    await fee.save();
    return fee;
}


/**
 * Restores an archived fee structure back to active status.
 * @param {String} id - Fee structure ID
 */
export async function restoreFeeStructure(id) {
    const fee = await FeeStructure.findById(id);
    if (!fee) {
        const err = new Error("Fee structure not found");
        err.status = 404;
        throw err;
    }
    if (fee.isActive) {
        const err = new Error("Fee structure is already active");
        err.status = 400;
        throw err;
    }
    await assertNoDuplicate(fee.category, fee.year, fee.semester, id);
    fee.isActive = true;
    await fee.save();
    return fee;
}


/**
 * Gets a distinct list of all years that have fee structures defined.
 */
export async function getDistinctYears() {
    const years = await FeeStructure.distinct("year");
    return years.sort((a, b) => b - a);
}
