import api from './api';

export const getTimmyRecommendations = (scheduleId) =>
  api.post('/timmy/recommend', { scheduleId }).then((res) => res.data);

export const getTimmyPaymentInsights = () =>
  api.get('/timmy/payments/insights').then((res) => res.data.data);

export const getTimmyInstructorInsights = () =>
  api.get('/timmy/instructor/insights').then((res) => res.data.data);
