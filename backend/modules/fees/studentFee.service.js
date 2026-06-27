import StudentFeeRecord from "./studentFeeRecord.model.js";
import FeeStructure from "./feeStructure.model.js";
import SemesterConfig from "../core/semesterConfig.model.js";
import User from "../users/user.model.js";

// Builds the fee breakdown snapshot from active FeeStructures for a semester+year.
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

// ─── STUDENT OPERATIONS ───────────────────────────────────────────────────────

// Returns the fee dashboard for the authenticated student for the active semester.
// Lazily creates a StudentFeeRecord if one doesn't exist yet.
export async function getMyFeeDashboard(studentId) {
    const activeSemester = await SemesterConfig.findOne({ isActive: true });
    if (!activeSemester) {
        return null; // no active semester — student sees "No fees due" state
    }

    const { semester, year, dueDate } = activeSemester;

    // Lazy creation: create record the first time the student views their dashboard
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

// ─── ADMIN OPERATIONS ─────────────────────────────────────────────────────────

// Returns all fee records for the active semester (admin view).
// Optionally filter by status.
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

// Admin manually records a payment for a student.
// paidAmount is the NEW total paid (not an increment) — admin sets the exact amount.
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
    await record.save(); // pre-save hook auto-computes status

    return record;
}

// Bulk-creates StudentFeeRecords for ALL students who don't have one yet
// for the currently active semester. Called manually by admin ("Sync Records" action).
export async function syncRecordsForActiveSemester(adminId) {
    const activeSemester = await SemesterConfig.findOne({ isActive: true });
    if (!activeSemester) {
        const err = new Error("No active semester to sync");
        err.status = 404;
        throw err;
    }

    const { semester, year, dueDate } = activeSemester;
    const { breakdown, totalAmount } = await buildBreakdown(semester, year);

    // Find all students
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
