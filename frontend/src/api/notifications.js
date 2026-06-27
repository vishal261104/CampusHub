import api from './axios';

export const getMyNotifications = () => api.get('/notifications');
export const markAllRead        = () => api.patch('/notifications/read-all');
export const markOneRead        = (id) => api.patch(`/notifications/${id}/read`);
