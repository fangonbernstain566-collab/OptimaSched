import api from './api';

export const getMyRequests = () => api.get('/schedule-requests/mine').then((res) => res.data.data);

export const createRequest = (payload) =>
  api.post('/schedule-requests', payload).then((res) => res.data.data);

export const cancelRequest = (id) => api.delete(`/schedule-requests/${id}`);

export const listAllRequests = (status) =>
  api.get('/schedule-requests', { params: status ? { status } : {} }).then((res) => res.data.data);

export const approveRequest = (id, roomId) =>
  api.patch(`/schedule-requests/${id}/approve`, roomId ? { roomId } : {}).then((res) => res.data.data);

export const rejectRequest = (id, reviewNotes) =>
  api.patch(`/schedule-requests/${id}/reject`, { reviewNotes }).then((res) => res.data.data);

export const getMyDeletedRequests = () =>
  api.get('/schedule-requests/mine/recently-deleted').then((res) => res.data.data);

export const restoreRequest = (id) =>
  api.patch(`/schedule-requests/${id}/restore`).then((res) => res.data.data);

export const permanentDeleteRequest = (id) => api.delete(`/schedule-requests/${id}/permanent`);
