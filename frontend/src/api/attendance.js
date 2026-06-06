import api from './axios';

export const getMyAttendance = () => api.get('/attendance/my/');
export const markAttendance = (data) => api.post('/attendance/mark', data);
export const getEnrolledStudents = (courseOfferingId) =>
  api.get(`/attendance/students/${courseOfferingId}/`);
export const getCourseAttendance = (courseOfferingId) =>
  api.get(`/attendance/course-offering/${courseOfferingId}/`);
