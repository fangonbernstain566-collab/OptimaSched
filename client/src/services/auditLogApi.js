import api from './api';

export const getAuditLogStats = async () => {
  const response = await api.get('/audit-logs/stats');
  return response.data.data;
};

export const getAuditLogs = async (params) => {
  const response = await api.get('/audit-logs', { params });
  return response.data;
};

export const getAuditLogById = async (id) => {
  const response = await api.get(`/audit-logs/${id}`);
  return response.data.data;
};

export const exportAuditLogs = async (params, format = 'csv') => {
  const response = await api.get('/audit-logs/export', {
    params: { ...params, format },
    responseType: 'blob',
  });

  return response.data;
};
