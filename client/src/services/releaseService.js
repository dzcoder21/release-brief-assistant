import api from './api';

const data = (res) => res.data;

export const authService = {
  register: (body) => api.post('/auth/register', body).then(data),
  login: (body) => api.post('/auth/login', body).then(data),
  me: () => api.get('/auth/me').then(data),
  updateMe: (body) => api.put('/auth/me', body).then(data),
  logout: () => api.post('/auth/logout').then(data),
};

export const releaseService = {
  list: (params) => api.get('/releases', { params }).then(data),
  create: (body) => api.post('/releases', body).then(data),
  get: (id) => api.get(`/releases/${id}`).then(data),
  update: (id, body) => api.put(`/releases/${id}`, body).then(data),
  remove: (id) => api.delete(`/releases/${id}`).then(data),
};

export const versionService = {
  listAll: () => api.get('/versions').then(data),
  forRelease: (releaseId) => api.get(`/releases/${releaseId}/versions`).then(data),
  create: (releaseId, body) => api.post(`/releases/${releaseId}/versions`, body).then(data),
  get: (id) => api.get(`/versions/${id}`).then(data),
  update: (id, body) => api.put(`/versions/${id}`, body).then(data),
  validate: (id) => api.post(`/versions/${id}/validate`).then(data),
  analyze: (id, force = false) => api.post(`/versions/${id}/analyze`, { force }).then(data),
  analysis: (id) => api.get(`/versions/${id}/analysis`).then(data),
  statements: (id) => api.get(`/versions/${id}/statements`).then(data),
  compare: (left, right) => api.get('/versions/compare', { params: { left, right } }).then(data),
  finalizationCheck: (id) => api.get(`/versions/${id}/finalization`).then(data),
  finalize: (id) => api.post(`/versions/${id}/finalize`, { confirm: true }).then(data),
  brief: (id) => api.get(`/versions/${id}/brief`).then(data),
};

export const statementService = {
  update: (id, body) => api.put(`/statements/${id}`, body).then(data),
  approve: (id, body = {}) => api.post(`/statements/${id}/approve`, body).then(data),
  reject: (id, body = {}) => api.post(`/statements/${id}/reject`, body).then(data),
  reset: (id) => api.post(`/statements/${id}/reset`).then(data),
};

export const dashboardService = {
  summary: () => api.get('/dashboard').then(data),
  analytics: () => api.get('/dashboard/analytics').then(data),
  attention: () => api.get('/dashboard/attention').then(data),
  activity: (params) => api.get('/activity', { params }).then(data),
  aiSettings: () => api.get('/settings/ai').then(data),
};
