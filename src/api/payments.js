import api from "./axios";

export const getPayments = (params) => api.get("/subscription-payments", { params });
