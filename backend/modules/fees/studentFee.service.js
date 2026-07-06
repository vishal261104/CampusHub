import StudentFeeRecord from "./studentFeeRecord.model.js";
import FeeStructure from "./feeStructure.model.js";
import SemesterConfig from "../core/semesterConfig.model.js";
import User from "../users/user.model.js";


async function buildBreakdown(semester, year) {
    const feeStructures = await FeeStructure.find({ semester, year, isActive: true });
    const breakdown = feeStructures.map((f) => ({
        feeStructureId: f._id,
        category: f.category,
        label: f.label,
        amount: f.amount,
    }));
    const totalAmount = breakdown.reduce((s, b) => s + b.amount, 0);
    return { breakdown, totalAmount };
}





/**
 * Generates or retrieves the fee dashboard for a specific student for the currently active semester.
 * If the student does not have a fee record for the active semester, it calculates their breakdown
 * based on the active fee structures and automatically creates the record.
 * @param {String} studentId - The MongoDB ObjectID of the student user
 */
export async function getMyFeeDashboard(studentId) {
    const activeSemester = await SemesterConfig.findOne({ isActive: true });
    if (!activeSemester) {
        return null; 
    }

    const { semester, year, dueDate } = activeSemester;

    
    let record = await StudentFeeRecord.findOne({ studentId, semester, year });
    if (!record) {
        const { breakdown, totalAmount } = await buildBreakdown(semester, year);
        record = await StudentFeeRecord.create({
            studentId,
            semester,
            year,
            dueDate,
            feeBreakdown: breakdown,
            totalAmount,
            paidAmount: 0,
        });
    }

    return {
        record: await record.populate("studentId", "name email studentId"),
        activeSemester,
    };
}





/**
 * Retrieves all generated student fee records for the currently active semester.
 * Can be optionally filtered by payment status ("Pending", "Partial", "Paid").
 * @param {Object} query - Filtering params
 */
export async function getAllRecordsForActiveSemester({ status } = {}) {
    const activeSemester = await SemesterConfig.findOne({ isActive: true });
    if (!activeSemester) return { records: [], activeSemester: null };

    const filter = { semester: activeSemester.semester, year: activeSemester.year };
    if (status) filter.status = status;

    const records = await StudentFeeRecord.find(filter)
        .populate("studentId", "name email studentId")
        .populate("lastUpdatedBy", "name")
        .sort({ status: 1, createdAt: 1 });

    return { records, activeSemester };
}



/**
 * Manually updates the paid amount for a student's fee record.
 * Typically used by admins acknowledging offline payments or correcting balances.
 * @param {String} recordId - ID of the StudentFeeRecord
 * @param {String} adminId - ID of the admin making the change
 * @param {Object} data - Contains paidAmount and paymentNote
 */
export async function updatePaidAmount(recordId, adminId, { paidAmount, paymentNote }) {
    const record = await StudentFeeRecord.findById(recordId);
    if (!record) {
        const err = new Error("Fee record not found");
        err.status = 404;
        throw err;
    }

    const amount = parseFloat(paidAmount);
    if (isNaN(amount) || amount < 0) {
        const err = new Error("paidAmount must be a non-negative number");
        err.status = 400;
        throw err;
    }
    if (amount > record.totalAmount) {
        const err = new Error(`paidAmount (₹${amount}) cannot exceed totalAmount (₹${record.totalAmount})`);
        err.status = 400;
        throw err;
    }

    record.paidAmount     = amount;
    record.paymentNote    = paymentNote?.trim() || record.paymentNote;
    record.lastUpdatedBy  = adminId;
    await record.save(); 

    return record;
}



/**
 * Batch-generates fee records for all current students who do not yet have one
 * for the currently active semester. Used typically right after activating a new semester.
 * @param {String} adminId - ID of the admin triggering the sync
 */
export async function syncRecordsForActiveSemester(adminId) {
    const activeSemester = await SemesterConfig.findOne({ isActive: true });
    if (!activeSemester) {
        const err = new Error("No active semester to sync");
        err.status = 404;
        throw err;
    }

    const { semester, year, dueDate } = activeSemester;
    const { breakdown, totalAmount } = await buildBreakdown(semester, year);

    
    const students = await User.find({ role: "student" }).select("_id");

    let created = 0;
    for (const student of students) {
        const exists = await StudentFeeRecord.findOne({ studentId: student._id, semester, year });
        if (!exists) {
            await StudentFeeRecord.create({
                studentId: student._id,
                semester,
                year,
                dueDate,
                feeBreakdown: breakdown,
                totalAmount,
                paidAmount: 0,
            });
            created++;
        }
    }

    return { created, total: students.length };
}
