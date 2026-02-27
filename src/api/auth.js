import api from "./axios";

export const loginAdmin = (payload) => api.post("/auth/login", payload);

export const fetchAdminProfile = () => api.get("/auth/me");

export const logoutAdmin = () => api.post("/auth/logout");

export const registerPlatformAdmin = (payload) => api.post("/auth/admins", payload);
