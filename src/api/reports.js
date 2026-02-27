import api from "./axios";

export const getDashboardReports = () => api.get("/reports");

export const getGlobalReports = () => api.get("/globalreports");
