import Assessment from "./assessment.model.js";
import Mark from "./mark.model.js";
import CourseOffering from "../courses/courseOffering.model.js";
import Enrollment from "../enrollments/enrollment.model.js";

// ─── HELPERS ────────────────────────────────────────────────────────────────

/**
 * Verifies the faculty member is the owner of a given offering.
 */
async function assertFacultyOwnsOffering(facultyId, offeringId) {
    const offering = await CourseOffering.findById(offeringId);
    if (!offering) {
        const err = new Error("Course offering not found");
        err.status = 404;
        throw err;
    }
    if (String(offering.facultyId) !== String(facultyId)) {
        const err = new Error("You are not assigned to this course offering");
        err.status = 403;
        throw err;
    }
    return offering;
}

/**
 * Verifies the faculty member is the creator of a given assessment.
 */
async function assertFacultyOwnsAssessment(facultyId, assessmentId) {
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
        const err = new Error("Assessment not found");
        err.status = 404;
        throw err;
    }
    if (String(assessment.createdBy) !== String(facultyId)) {
        const err = new Error("You are not authorized to modify this assessment");
        err.status = 403;
        throw err;
    }
    return assessment;
}

/**
 * Gets all actively enrolled student IDs for an offering.
 */
async function getEnrolledStudentIds(offeringId) {
    const enrollments = await Enrollment.find({
        courseOfferingId: offeringId,
        status: "Enrolled",
    }).select("studentId").lean();
    return enrollments.map(e => String(e.studentId));
}

// ─── ASSESSMENT CRUD ────────────────────────────────────────────────────────

/**
 * Creates a new assessment for a course offering.
 */
export async function createAssessment(facultyId, offeringId, data) {
    await assertFacultyOwnsOffering(facultyId, offeringId);

    const { title, type, totalMarks, passingMarks, weightage, dueDate } = data;

    if (!title?.trim() || !type || !totalMarks || passingMarks === undefined || weightage === undefined) {
        const err = new Error("title, type, totalMarks, passingMarks, and weightage are required");
        err.status = 400;
        throw err;
    }
    if (passingMarks > totalMarks) {
        const err = new Error("passingMarks cannot exceed totalMarks");
        err.status = 400;
        throw err;
    }

    return Assessment.create({
        courseOfferingId: offeringId,
        title: title.trim(),
        type,
        totalMarks,
        passingMarks,
        weightage,
        dueDate: dueDate || null,
        createdBy: facultyId,
        status: "Draft",
    });
}

/**
 * Updates metadata of a Draft or Review assessment.
 */
export async function updateAssessment(facultyId, assessmentId, data) {
    const assessment = await assertFacultyOwnsAssessment(facultyId, assessmentId);

    if (assessment.status === "Published") {
        const err = new Error("Cannot edit a published assessment");
        err.status = 400;
        throw err;
    }

    const allowed = ["title", "type", "totalMarks", "passingMarks", "weightage", "dueDate"];
    const updates = {};
    for (const key of allowed) {
        if (data[key] !== undefined) updates[key] = data[key];
    }

    return Assessment.findByIdAndUpdate(assessmentId, updates, { new: true });
}

/**
 * Moves an assessment status: Draft → Review → Published.
 * On publish, validates all enrolled students have a mark record.
 */
export async function advanceAssessmentStatus(facultyId, assessmentId) {
    const assessment = await assertFacultyOwnsAssessment(facultyId, assessmentId);

    const transitions = { Draft: "Review", Review: "Published" };
    const next = transitions[assessment.status];

    if (!next) {
        const err = new Error("Assessment is already published");
        err.status = 400;
        throw err;
    }

    if (next === "Published") {
        const enrolledStudentIds = await getEnrolledStudentIds(assessment.courseOfferingId);
        if (enrolledStudentIds.length === 0) {
            const err = new Error("No enrolled students found for this offering");
            err.status = 400;
            throw err;
        }

        const marks = await Mark.find({ assessmentId }).select("studentId").lean();
        const markedStudentIds = new Set(marks.map(m => String(m.studentId)));

        const missing = enrolledStudentIds.filter(id => !markedStudentIds.has(id));
        if (missing.length > 0) {
            const err = new Error(
                `Cannot publish: ${missing.length} enrolled student(s) are missing marks. Upload marks for all students first.`
            );
            err.status = 400;
            throw err;
        }
    }

    const updateData = { status: next };
    if (next === "Published") updateData.publishedAt = new Date();

    return Assessment.findByIdAndUpdate(assessmentId, updateData, { new: true });
}

/**
 * Deletes a Draft assessment and all associated marks.
 */
export async function deleteAssessment(facultyId, assessmentId) {
    const assessment = await assertFacultyOwnsAssessment(facultyId, assessmentId);
    if (assessment.status !== "Draft") {
        const err = new Error("Only Draft assessments can be deleted");
        err.status = 400;
        throw err;
    }
    await Mark.deleteMany({ assessmentId });
    await Assessment.findByIdAndDelete(assessmentId);
}

// ─── BULK MARKS UPLOAD ──────────────────────────────────────────────────────

/**
 * Idempotent bulk upsert of marks for an assessment.
 * rows: [{ studentId, marksObtained, isAbsent, remarks }]
 */
export async function bulkUploadMarks(facultyId, assessmentId, rows) {
    const assessment = await assertFacultyOwnsAssessment(facultyId, assessmentId);

    if (assessment.status === "Published") {
        const err = new Error("Cannot upload marks for a published assessment");
        err.status = 400;
        throw err;
    }

    if (!Array.isArray(rows) || rows.length === 0) {
        const err = new Error("rows must be a non-empty array");
        err.status = 400;
        throw err;
    }

    const enrolledStudentIds = await getEnrolledStudentIds(assessment.courseOfferingId);
    const enrolledSet = new Set(enrolledStudentIds);

    const ops = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
        const { studentId, marksObtained, isAbsent = false, remarks = "" } = rows[i];

        if (!studentId) { errors.push(`Row ${i + 1}: studentId is required`); continue; }
        if (!enrolledSet.has(String(studentId))) { errors.push(`Row ${i + 1}: Student ${studentId} is not enrolled`); continue; }

        const marks = isAbsent ? 0 : parseFloat(marksObtained);
        if (!isAbsent && (isNaN(marks) || marks < 0)) { errors.push(`Row ${i + 1}: invalid marksObtained`); continue; }
        if (!isAbsent && marks > assessment.totalMarks) { errors.push(`Row ${i + 1}: marksObtained (${marks}) exceeds totalMarks (${assessment.totalMarks})`); continue; }

        ops.push({
            updateOne: {
                filter: { assessmentId, studentId },
                update: {
                    $set: {
                        assessmentId,
                        studentId,
                        courseOfferingId: assessment.courseOfferingId,
                        marksObtained: isAbsent ? 0 : marks,
                        isAbsent,
                        remarks: String(remarks).trim(),
                        uploadedBy: facultyId,
                    },
                },
                upsert: true,
            },
        });
    }

    if (errors.length > 0 && ops.length === 0) {
        const err = new Error("All rows had errors:\n" + errors.join("\n"));
        err.status = 400;
        throw err;
    }

    let result = { matched: 0, upserted: 0, modified: 0 };
    if (ops.length > 0) {
        const bulkResult = await Mark.bulkWrite(ops, { ordered: false });
        result = {
            matched: bulkResult.matchedCount,
            upserted: bulkResult.upsertedCount,
            modified: bulkResult.modifiedCount,
        };
    }

    return { result, errors, totalProcessed: ops.length, totalErrors: errors.length };
}

// ─── FACULTY VIEWS ──────────────────────────────────────────────────────────

/**
 * Fetches all assessments for a course offering (faculty view).
 */
export async function getOfferingAssessments(facultyId, offeringId) {
    await assertFacultyOwnsOffering(facultyId, offeringId);

    const assessments = await Assessment.find({ courseOfferingId: offeringId })
        .sort({ createdAt: 1 })
        .lean();

    // Attach mark counts to each assessment
    const ids = assessments.map(a => a._id);
    const markCounts = await Mark.aggregate([
        { $match: { assessmentId: { $in: ids } } },
        { $group: { _id: "$assessmentId", count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(markCounts.map(m => [String(m._id), m.count]));

    return assessments.map(a => ({ ...a, markCount: countMap[String(a._id)] || 0 }));
}

/**
 * Fetches all marks for a specific assessment (faculty view).
 */
export async function getAssessmentMarks(facultyId, assessmentId) {
    await assertFacultyOwnsAssessment(facultyId, assessmentId);

    return Mark.find({ assessmentId })
        .populate("studentId", "name email studentId")
        .sort({ marksObtained: -1 })
        .lean();
}

// ─── ANALYTICS ──────────────────────────────────────────────────────────────

/**
 * Computes per-assessment analytics for faculty.
 */
export async function getAssessmentAnalytics(facultyId, assessmentId) {
    await assertFacultyOwnsAssessment(facultyId, assessmentId);
    const assessment = await Assessment.findById(assessmentId);

    const marks = await Mark.find({ assessmentId, isAbsent: false })
        .populate("studentId", "name email studentId")
        .lean();

    if (marks.length === 0) {
        return { assessment, stats: null, distribution: [], topPerformers: [] };
    }

    const scores = marks.map(m => m.marksObtained).sort((a, b) => a - b);
    const total = scores.length;
    const sum = scores.reduce((s, v) => s + v, 0);
    const avg = sum / total;
    const highest = scores[total - 1];
    const lowest = scores[0];

    // Median
    const mid = Math.floor(total / 2);
    const median = total % 2 === 0 ? (scores[mid - 1] + scores[mid]) / 2 : scores[mid];

    const passed = scores.filter(s => s >= assessment.passingMarks).length;
    const passPercentage = ((passed / total) * 100).toFixed(1);

    // Distribution buckets (0-20%, 21-40%, 41-60%, 61-80%, 81-100%)
    const buckets = [0, 20, 40, 60, 80, 100];
    const distribution = [];
    for (let i = 0; i < buckets.length - 1; i++) {
        const lo = (buckets[i] / 100) * assessment.totalMarks;
        const hi = (buckets[i + 1] / 100) * assessment.totalMarks;
        const count = scores.filter(s => s >= lo && s <= hi).length;
        distribution.push({ label: `${buckets[i]}-${buckets[i + 1]}%`, count });
    }

    // Top 5 performers
    const topPerformers = marks
        .sort((a, b) => b.marksObtained - a.marksObtained)
        .slice(0, 5)
        .map((m, idx) => ({
            rank: idx + 1,
            student: m.studentId,
            marks: m.marksObtained,
            percentage: ((m.marksObtained / assessment.totalMarks) * 100).toFixed(1),
        }));

    const absentCount = await Mark.countDocuments({ assessmentId, isAbsent: true });

    return {
        assessment,
        stats: {
            total,
            highest,
            lowest,
            average: parseFloat(avg.toFixed(2)),
            median: parseFloat(median.toFixed(2)),
            passed,
            passPercentage: parseFloat(passPercentage),
            absentCount,
        },
        distribution,
        topPerformers,
    };
}

/**
 * Computes full offering analytics across all published assessments (faculty view).
 */
export async function getOfferingAnalytics(facultyId, offeringId) {
    await assertFacultyOwnsOffering(facultyId, offeringId);

    const assessments = await Assessment.find({
        courseOfferingId: offeringId,
        status: "Published",
    }).lean();

    const results = [];
    for (const a of assessments) {
        const marks = await Mark.find({ assessmentId: a._id, isAbsent: false }).lean();
        if (marks.length === 0) continue;

        const scores = marks.map(m => m.marksObtained);
        const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
        const passed = scores.filter(s => s >= a.passingMarks).length;

        results.push({
            assessmentId: a._id,
            title: a.title,
            type: a.type,
            totalMarks: a.totalMarks,
            weightage: a.weightage,
            average: parseFloat(avg.toFixed(2)),
            highest: Math.max(...scores),
            lowest: Math.min(...scores),
            passRate: parseFloat(((passed / scores.length) * 100).toFixed(1)),
            submittedCount: scores.length,
        });
    }

    return { offeringId, assessments: results };
}

// ─── STUDENT VIEWS ──────────────────────────────────────────────────────────

/**
 * Fetches a student's results for all published assessments in an offering.
 * Also includes their rank and class analytics per assessment.
 */
export async function getStudentResults(studentId, offeringId) {
    const enrollment = await Enrollment.findOne({
        studentId,
        courseOfferingId: offeringId,
        status: "Enrolled",
    });
    if (!enrollment) {
        const err = new Error("You are not enrolled in this course offering");
        err.status = 403;
        throw err;
    }

    const assessments = await Assessment.find({
        courseOfferingId: offeringId,
        status: "Published",
    }).lean();

    const results = [];

    for (const a of assessments) {
        // Student's own mark
        const myMark = await Mark.findOne({ assessmentId: a._id, studentId }).lean();

        // All marks for ranking
        const allMarks = await Mark.find({ assessmentId: a._id, isAbsent: false })
            .sort({ marksObtained: -1 })
            .lean();

        const scores = allMarks.map(m => m.marksObtained);
        const avg = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
        const highest = scores.length > 0 ? scores[0] : 0;

        let median = 0;
        if (scores.length > 0) {
            const sorted = [...scores].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
        }

        let rank = null;
        if (myMark && !myMark.isAbsent) {
            rank = allMarks.findIndex(m => String(m.studentId) === String(studentId)) + 1;
        }

        results.push({
            assessmentId: a._id,
            title: a.title,
            type: a.type,
            totalMarks: a.totalMarks,
            passingMarks: a.passingMarks,
            weightage: a.weightage,
            publishedAt: a.publishedAt,
            myMark: myMark
                ? {
                    marksObtained: myMark.marksObtained,
                    isAbsent: myMark.isAbsent,
                    remarks: myMark.remarks,
                    percentage: parseFloat(((myMark.marksObtained / a.totalMarks) * 100).toFixed(1)),
                    passed: myMark.marksObtained >= a.passingMarks && !myMark.isAbsent,
                }
                : null,
            classAnalytics: {
                average: parseFloat(avg.toFixed(2)),
                highest,
                median: parseFloat(median.toFixed(2)),
                totalStudents: allMarks.length,
                rank,
                passPercentage: parseFloat(
                    (scores.filter(s => s >= a.passingMarks).length / (scores.length || 1) * 100).toFixed(1)
                ),
            },
        });
    }

    return results;
}

/**
 * Computes the student's overall weighted grade across all published assessments for an offering.
 */
export async function getOverallGrade(studentId, offeringId) {
    const results = await getStudentResults(studentId, offeringId);

    if (results.length === 0) {
        return { offeringId, overallPercentage: null, grade: null, totalWeightage: 0, breakdown: [] };
    }

    let weightedSum = 0;
    let totalWeightage = 0;

    for (const r of results) {
        if (r.myMark && !r.myMark.isAbsent) {
            const pct = r.myMark.percentage;
            weightedSum += (pct * r.weightage) / 100;
            totalWeightage += r.weightage;
        }
    }

    const overallPercentage = totalWeightage > 0
        ? parseFloat(((weightedSum / totalWeightage) * 100).toFixed(2))
        : null;

    const grade = computeLetterGrade(overallPercentage);

    return {
        offeringId,
        overallPercentage,
        grade,
        totalWeightage,
        breakdown: results.map(r => ({
            title: r.title,
            type: r.type,
            weightage: r.weightage,
            myPercentage: r.myMark?.percentage ?? null,
            contribution: r.myMark && !r.myMark.isAbsent
                ? parseFloat(((r.myMark.percentage * r.weightage) / 100).toFixed(2))
                : null,
        })),
    };
}

/**
 * Maps an overall percentage to a letter grade.
 */
function computeLetterGrade(pct) {
    if (pct === null) return null;
    if (pct >= 90) return "O";
    if (pct >= 80) return "A+";
    if (pct >= 70) return "A";
    if (pct >= 60) return "B+";
    if (pct >= 50) return "B";
    if (pct >= 40) return "C";
    return "F";
}
