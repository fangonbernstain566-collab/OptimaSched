import api from './api';

export const getPaymentStats = () => api.get('/payments/stats').then((res) => res.data.data);

export const listPayments = (params = {}) =>
  api.get('/payments', { params }).then((res) => res.data);

export const createPayment = (payload) =>
  api.post('/payments', payload).then((res) => res.data.data);

export const updatePaymentStatus = (id, status) =>
  api.patch(`/payments/${id}/status`, { status }).then((res) => res.data.data);

export const deletePayment = (id) => api.delete(`/payments/${id}`);

export const restorePayment = (id) => api.patch(`/payments/${id}/restore`).then((res) => res.data.data);

export const permanentDeletePayment = (id) => api.delete(`/payments/${id}/permanent`);

export const listDeletedPayments = () => api.get('/payments/recently-deleted').then((res) => res.data.data);
