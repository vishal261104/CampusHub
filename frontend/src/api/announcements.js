import api from './axios';

export const getAnnouncements = (params) => api.get('/announcements', { params });
export const getUnreadCount   = ()       => api.get('/announcements/unread-count');
export const markAsRead       = (id)     => api.patch(`/announcements/${id}/read`);
export const markAllRead      = ()       => api.patch('/announcements/read-all');
export const createAnnouncement = (data) => api.post('/announcements', data);
export const updateAnnouncement = (id, data) => api.patch(`/announcements/${id}`, data);
export const deleteAnnouncement = (id)   => api.delete(`/announcements/${id}`);
