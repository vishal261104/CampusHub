import api from './axios.js';

// ─── FACULTY ────────────────────────────────────────────────────────────────

export const createAssessment = (offeringId, data) =>
    api.post(`/assessments/offering/${offeringId}`, data);

export const updateAssessment = (id, data) =>
    api.patch(`/assessments/${id}`, data);

export const advanceAssessmentStatus = (id) =>
    api.patch(`/assessments/${id}/advance`);

export const deleteAssessment = (id) =>
    api.delete(`/assessments/${id}`);

export const bulkUploadMarks = (id, rows) =>
    api.post(`/assessments/${id}/marks/bulk`, { rows });

export const getOfferingAssessments = (offeringId) =>
    api.get(`/assessments/offering/${offeringId}`);

export const getAssessmentMarks = (id) =>
    api.get(`/assessments/${id}/marks`);

export const getAssessmentAnalytics = (id) =>
    api.get(`/assessments/${id}/analytics`);

export const getOfferingAnalytics = (offeringId) =>
    api.get(`/assessments/offering/${offeringId}/analytics`);

// ─── STUDENT ────────────────────────────────────────────────────────────────

export const getStudentResults = (offeringId) =>
    api.get(`/assessments/my/${offeringId}`);

export const getOverallGrade = (offeringId) =>
    api.get(`/assessments/my/${offeringId}/grade`);
