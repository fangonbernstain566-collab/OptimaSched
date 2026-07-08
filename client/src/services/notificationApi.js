import api from './api';

export const getMyNotifications = () => api.get('/notifications/mine').then((res) => res.data.data);

export const getUnreadCount = () =>
  api.get('/notifications/unread-count').then((res) => res.data.data.count);

export const markNotificationRead = (id) =>
  api.patch(`/notifications/${id}/read`).then((res) => res.data.data);

export const markAllNotificationsRead = () => api.patch('/notifications/read-all');
