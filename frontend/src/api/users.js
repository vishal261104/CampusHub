import api from './axios';

export const getMe = () => api.get('/users/me');
export const getAllUsers = () => api.get('/users/all');
export const updateMe = (data) => api.patch('/users/me', data);
export const updatePassword = (data) => api.patch('/users/me/password', data);
export const setUserRoleById = (id, payload) => api.patch(`/users/${id}/role`, payload);
export const setUserRoleByEmail = (email, role, extraFields = {}) => api.patch('/users/role', { email, role, ...extraFields });


export const registerStudent = (data) => api.post('/users/register-student', data);
export const registerFaculty = (data) => api.post('/users/register-faculty', data);
