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
