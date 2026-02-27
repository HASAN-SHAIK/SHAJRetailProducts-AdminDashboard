import api from "./axios";

export const getSupportCases = (params) => api.get("/support/cases", { params });

export const getSupportCaseById = (id) => api.get(`/support/cases/${id}`);

export const updateSupportCaseStatus = (id, payload) =>
  api.patch(`/support/cases/${id}/status`, payload);

export const updateSupportCasePriority = (id, payload) =>
  api.patch(`/support/cases/${id}/priority`, payload);

export const assignSupportCase = (id, payload) =>
  api.patch(`/support/cases/${id}/assign`, payload);

export const replyToSupportCase = (id, payload) =>
  api.post(`/support/cases/${id}/reply`, payload);
