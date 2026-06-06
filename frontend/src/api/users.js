import api from './axios';

export const getMe = () => api.get('/users/me');
export const updateMe = (data) => api.patch('/users/me', data);
export const updatePassword = (data) => api.patch('/users/me/password', data);
export const setUserRoleById = (id, role) => api.patch(`/users/${id}/role`, { role });
export const setUserRoleByEmail = (email, role) => api.patch('/users/role', { email, role });
