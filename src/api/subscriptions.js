import api from "./axios";

export const getSubscriptions = () => api.get("/subscriptions/summary");
