import api from './axios';


export const createBus = (data) => api.post('/transport/buses', data);
export const updateBus = (id, data) => api.patch(`/transport/buses/${id}`, data);
export const deleteBus = (id) => api.delete(`/transport/buses/${id}`);


export const createTimetableSlot = (data) => api.post('/transport/timetable/slot', data);
export const updateTimetableSlot = (id, data) => api.patch(`/transport/timetable/slot/${id}`, data);
export const deleteTimetableSlot = (id) => api.delete(`/transport/timetable/slot/${id}`);
export const getGuidelines = () => api.get('/transport/timetable/guidelines');
export const updateGuidelines = (items) => api.put('/transport/timetable/guidelines', { items });


export const getBookings = () => api.get('/transport/bookings');
export const getAnalytics = () => api.get('/transport/analytics');


export const bookTicketFromTimetable = (timetableSlotId) => api.post('/transport/book/from-timetable', { timetableSlotId });
export const bookTicketIntent = (scheduleId) => api.post('/transport/book/intent', { scheduleId });
export const confirmTicketPayment = (paymentIntentId) => api.post('/transport/book/confirm', { paymentIntentId });
export const getMyTickets = () => api.get('/transport/my-tickets');
export const getTicketById = (id) => api.get(`/transport/ticket/${id}`);
export const cancelTicket = (id) => api.delete(`/transport/ticket/${id}`);


export const getAllBuses = () => api.get('/transport/buses');
export const getSchedules = (params) => api.get('/transport/schedules', { params });
export const getScheduleById = (id) => api.get(`/transport/schedules/${id}`);
export const getTimetable = () => api.get('/transport/timetable');
