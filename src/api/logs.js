import api from "./axios";

export const getActivityLogs = (params) =>
  api.get("/activity-logs", { params });
