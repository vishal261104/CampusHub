import api from './axios';

// ─── Fee Structures ────────────────────────────────────────────────────────────
export const getAllFeeStructures  = (params)     => api.get('/fees', { params });
export const getAcademicYears     = ()           => api.get('/fees/years');
export const getFeeStructureById  = (id)         => api.get(`/fees/${id}`);
export const createFeeStructure   = (data)       => api.post('/fees', data);
export const updateFeeStructure   = (id, data)   => api.put(`/fees/${id}`, data);
export const archiveFeeStructure  = (id)         => api.delete(`/fees/${id}`);
export const restoreFeeStructure  = (id)         => api.patch(`/fees/${id}/restore`);

// ─── Semester Management (Admin) ──────────────────────────────────────────────
export const getActiveSemester    = ()           => api.get('/fees/semester/active');
export const getAllSemesters       = ()           => api.get('/fees/semester');
export const activateSemester     = (data)       => api.post('/fees/semester/activate', data);
export const deactivateSemester   = ()           => api.patch('/fees/semester/deactivate');
export const updateActiveDueDate  = (data)       => api.patch('/fees/semester/due-date', data);

// ─── Fee Records (Admin) ──────────────────────────────────────────────────────
export const getAllFeeRecords      = (params)     => api.get('/fees/records', { params });
export const updatePayment        = (id, data)   => api.patch(`/fees/records/${id}/pay`, data);
export const syncFeeRecords       = ()           => api.post('/fees/records/sync');

// ─── Student Fee Dashboard ────────────────────────────────────────────────────
export const getMyFeeDashboard    = ()           => api.get('/fees/my-fees');

// ─── Stripe Payment (Student) ─────────────────────────────────────────────────
export const createPaymentIntent  = (data)       => api.post('/payments/intent', data);
export const confirmPayment       = (data)       => api.post('/payments/confirm', data);
export const getPaymentHistory    = (feeRecordId) => api.get(`/payments/history/${feeRecordId}`);
