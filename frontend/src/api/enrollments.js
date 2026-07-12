import api from './axios';

export const enrollInCourse = (offeringId) => api.post(`/enrollments/enroll/${offeringId}`);
export const dropCourse = (id) => api.delete(`/enrollments/drop/${id}`);
export const getEnrollments = (params) => api.get('/enrollments', { params });
export const getTimetable = (params) => api.get('/enrollments/timetable', { params });
export const getAdminEnrollmentRequests = (params) => api.get('/enrollments/requests', { params });
export const updateEnrollmentRequestStatus = (id, data) => api.patch(`/enrollments/requests/${id}`, data);
export const getMyEnrollments = (params) => api.get('/enrollments', { params });
