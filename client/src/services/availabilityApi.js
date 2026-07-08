import api from './api';

export const getMyAvailability = () => api.get('/availability/me').then((res) => res.data.data);

export const addAvailability = (payload) =>
  api.post('/availability', payload).then((res) => res.data.data);

export const deleteAvailability = (id) => api.delete(`/availability/${id}`);
