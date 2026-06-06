import api from './axios';

export const enrollInCourse = (offeringId) => api.post(`/enrollments/enroll/${offeringId}`);
export const dropCourse = (offeringId) => api.delete(`/enrollments/drop/${offeringId}`);
export const getEnrollments = (params) => api.get('/enrollments', { params });
export const getTimetable = (params) => api.get('/enrollments/timetable', { params });
