import SemesterConfig, { SEMESTER_LIST } from "./semesterConfig.model.js";



function validateSemesterName(semester) {
    if (!SEMESTER_LIST.includes(semester)) {
        const err = new Error(`Invalid semester. Must be one of: ${SEMESTER_LIST.join(", ")}`);
        err.status = 400;
        throw err;
    }
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





export async function activateSemester(adminId, { semester, year, dueDate }) {
    validateSemesterName(semester);
    const yr = validateYear(year);

    if (!dueDate) {
        const err = new Error("dueDate is required");
        err.status = 400;
        throw err;
    }
    const due = new Date(dueDate);
    if (isNaN(due)) {
        const err = new Error("dueDate must be a valid date");
        err.status = 400;
        throw err;
    }

    
    await SemesterConfig.updateMany({ isActive: true }, { isActive: false });

    
    let config = await SemesterConfig.findOne({ semester, year: yr });
    if (config) {
        config.dueDate     = due;
        config.isActive    = true;
        config.activatedBy = adminId;
        config.activatedAt = new Date();
        await config.save();
    } else {
        config = await SemesterConfig.create({
            semester,
            year: yr,
            dueDate: due,
            isActive: true,
            activatedBy: adminId,
            activatedAt: new Date(),
        });
    }

    return config;
}


export async function deactivateSemester() {
    const active = await SemesterConfig.findOne({ isActive: true });
    if (!active) {
        const err = new Error("No active semester to deactivate");
        err.status = 404;
        throw err;
    }
    active.isActive = false;
    await active.save();
    return active;
}


export async function getActiveSemester() {
    return SemesterConfig.findOne({ isActive: true }).populate("activatedBy", "name email");
}


export async function getAllSemesters() {
    return SemesterConfig.find()
        .populate("activatedBy", "name email")
        .sort({ year: -1, semester: 1 });
}


export async function updateActiveDueDate(dueDate) {
    const active = await SemesterConfig.findOne({ isActive: true });
    if (!active) {
        const err = new Error("No active semester found");
        err.status = 404;
        throw err;
    }
    const due = new Date(dueDate);
    if (isNaN(due)) {
        const err = new Error("dueDate must be a valid date");
        err.status = 400;
        throw err;
    }
    active.dueDate = due;
    await active.save();
    return active;
}
