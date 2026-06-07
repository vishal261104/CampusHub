import api from './axios';

// Student: Apply for hostel
export const applyForHostel = (data) => api.post('/hostel', data);

// Student: Get own application
export const getMyHostelApplication = () => api.get('/hostel/me');

// Student: Cancel own application
export const cancelHostelApplication = (applicationId) => api.put(`/hostel/${applicationId}`);

// Admin: Get all applications
export const getAllHostelApplications = (params) => api.get('/hostel', { params });

// Admin: Update application status
export const updateHostelApplicationStatus = (applicationId, data) => api.patch(`/hostel/${applicationId}`, data);
