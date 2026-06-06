import api from './axios';

export const listOfferings = (params) => api.get('/courses/course-offerings', { params });
export const getOffering = (id) => api.get(`/courses/course-offering/${id}`);
export const createOffering = (data) => api.post('/courses/course-offering', data);
export const updateOffering = (id, data) => api.put(`/courses/course-offering/${id}`, data);
export const deleteOffering = (id) => api.delete(`/courses/course-offering/${id}`);
export const assignFaculty = (id, data) => api.patch(`/courses/course-offering/${id}/faculty`, data);
export const getCourseCatalog = (params) => api.get('/courses/course-catalog', { params });
