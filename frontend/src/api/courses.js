import api from './axios';

export const getCatalog = (params) => api.get('/courses/catalog', { params });
export const createCourse = (data) => api.post('/courses/course', data);
export const getCourse = (id) => api.get(`/courses/course/${id}`);
export const updateCourse = (id, data) => api.put(`/courses/course/${id}`, data);
export const deleteCourse = (id) => api.delete(`/courses/course/${id}`);
