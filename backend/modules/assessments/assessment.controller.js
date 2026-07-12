import * as assessmentService from "./assessment.service.js";

/**
 * Creates a new assessment for a course offering.
 * Route: POST /api/assessments/offering/:offeringId
 * Access: Faculty
 */
export async function createAssessment(req, res, next) {
    try {
        const assessment = await assessmentService.createAssessment(
            req.user.id,
            req.params.offeringId,
            req.body
        );
        return res.status(201).json({ assessment });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
}

/**
 * Updates metadata of a Draft or Review assessment.
 * Route: PATCH /api/assessments/:id
 * Access: Faculty (owner)
 */
export async function updateAssessment(req, res, next) {
    try {
        const assessment = await assessmentService.updateAssessment(
            req.user.id,
            req.params.id,
            req.body
        );
        return res.status(200).json({ assessment });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
}

/**
 * Advances the assessment status through Draft → Review → Published.
 * Route: PATCH /api/assessments/:id/advance
 * Access: Faculty (owner)
 */
export async function advanceAssessmentStatus(req, res, next) {
    try {
        const assessment = await assessmentService.advanceAssessmentStatus(
            req.user.id,
            req.params.id
        );
        return res.status(200).json({ message: `Status updated to ${assessment.status}`, assessment });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
}

/**
 * Deletes a Draft assessment and its marks.
 * Route: DELETE /api/assessments/:id
 * Access: Faculty (owner)
 */
export async function deleteAssessment(req, res, next) {
    try {
        await assessmentService.deleteAssessment(req.user.id, req.params.id);
        return res.status(200).json({ message: "Assessment deleted" });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
}

/**
 * Bulk upserts marks for an assessment.
 * Route: POST /api/assessments/:id/marks/bulk
 * Access: Faculty (owner)
 */
export async function bulkUploadMarks(req, res, next) {
    try {
        const result = await assessmentService.bulkUploadMarks(
            req.user.id,
            req.params.id,
            req.body.rows
        );
        return res.status(200).json({ message: "Marks uploaded", ...result });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
}

/**
 * Fetches all assessments for a course offering (faculty view).
 * Route: GET /api/assessments/offering/:offeringId
 * Access: Faculty (owner)
 */
export async function getOfferingAssessments(req, res, next) {
    try {
        const assessments = await assessmentService.getOfferingAssessments(
            req.user.id,
            req.params.offeringId
        );
        return res.status(200).json({ count: assessments.length, assessments });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
}

/**
 * Fetches all marks for a specific assessment (faculty view).
 * Route: GET /api/assessments/:id/marks
 * Access: Faculty (owner)
 */
export async function getAssessmentMarks(req, res, next) {
    try {
        const marks = await assessmentService.getAssessmentMarks(req.user.id, req.params.id);
        return res.status(200).json({ count: marks.length, marks });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
}

/**
 * Fetches per-assessment analytics for faculty.
 * Route: GET /api/assessments/:id/analytics
 * Access: Faculty (owner)
 */
export async function getAssessmentAnalytics(req, res, next) {
    try {
        const data = await assessmentService.getAssessmentAnalytics(req.user.id, req.params.id);
        return res.status(200).json(data);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
}

/**
 * Fetches full offering analytics across all published assessments.
 * Route: GET /api/assessments/offering/:offeringId/analytics
 * Access: Faculty (owner)
 */
export async function getOfferingAnalytics(req, res, next) {
    try {
        const data = await assessmentService.getOfferingAnalytics(req.user.id, req.params.offeringId);
        return res.status(200).json(data);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
}

/**
 * Fetches a student's results for all published assessments in an offering.
 * Route: GET /api/assessments/my/:offeringId
 * Access: Student (enrolled)
 */
export async function getStudentResults(req, res, next) {
    try {
        const results = await assessmentService.getStudentResults(
            req.user.id,
            req.params.offeringId
        );
        return res.status(200).json({ count: results.length, results });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
}

/**
 * Computes the student's overall weighted grade for an offering.
 * Route: GET /api/assessments/my/:offeringId/grade
 * Access: Student (enrolled)
 */
export async function getOverallGrade(req, res, next) {
    try {
        const data = await assessmentService.getOverallGrade(req.user.id, req.params.offeringId);
        return res.status(200).json(data);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
}
