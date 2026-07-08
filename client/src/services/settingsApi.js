import api from './api';

export const getSettings = () => api.get('/settings/me').then((res) => res.data.data);

export const updateSettings = (patch) =>
  api.patch('/settings/me', patch).then((res) => res.data.data);

export const updateProfile = (patch) =>
  api.patch('/settings/me/profile', patch).then((res) => res.data.data);
