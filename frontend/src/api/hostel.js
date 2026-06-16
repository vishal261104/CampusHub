import api from './axios';

// ─── Hostel application ────────────────────────────────────────────────────────
export const applyForHostel = (data) => api.post('/hostel', data);
export const getMyHostelApplication = () => api.get('/hostel/me');
export const cancelHostelApplication = (applicationId) => api.put(`/hostel/${applicationId}`);
export const getAllHostelApplications = (params) => api.get('/hostel', { params });
export const updateHostelApplicationStatus = (applicationId, data) => api.patch(`/hostel/${applicationId}`, data);

// ─── Rooms ─────────────────────────────────────────────────────────────────────
export const getAllRooms = (params) => api.get('/rooms', { params });
export const createRoom = (data) => api.post('/rooms', data);
export const updateRoom = (id, data) => api.put(`/rooms/${id}`, data);
export const deleteRoom = (id) => api.delete(`/rooms/${id}`);
export const getRoomOccupancy = (id) => api.get(`/rooms/${id}/occupancy`);

// ─── Complaints ────────────────────────────────────────────────────────────────
export const createComplaint = (data) => api.post('/complaints', data);
export const getMyComplaints = () => api.get('/complaints/my');
export const getAllComplaints = (params) => api.get('/complaints', { params });
export const updateComplaintStatus = (id, data) => api.patch(`/complaints/${id}/status`, data);
export const assignComplaint = (id, data) => api.patch(`/complaints/${id}/assign`, data);
export const addComplaintComment = (id, data) => api.post(`/complaints/${id}/comments`, data);

// ─── Outings (same-day) ────────────────────────────────────────────────────────
export const createOuting = (data) => api.post('/outing/outings', data);
export const checkIn = () => api.patch('/outing/outings/checkin');
export const getMyOutings = () => api.get('/outing/outings/my');
export const getActiveOutings = () => api.get('/outing/outings/active');
export const getAllOutings = (params) => api.get('/outing/outings', { params });

// ─── Hostel Settings ─────────────────────────────────────────────────────────────────
export const getHostelSettings = () => api.get('/outing/settings');
export const updateLateThreshold = (data) => api.patch('/outing/settings/threshold', data);

// ─── Leave Requests (overnight) ───────────────────────────────────────────────
export const createLeaveRequest = (data) => api.post('/outing/leave', data);
export const getMyLeaveRequests = () => api.get('/outing/leave/my');
export const getAllLeaveRequests = (params) => api.get('/outing/leave', { params });
export const reviewLeaveRequest = (id, data) => api.patch(`/outing/leave/${id}/review`, data);
