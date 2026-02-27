import api from "./axios";

export const getPlans = () => api.get("/plans");

export const updatePlan = (id, payload) => api.patch(`/plans/${id}`, payload);
