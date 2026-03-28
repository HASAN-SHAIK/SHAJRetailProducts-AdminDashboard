import api from "./axios";

export const getTenants = (params) => api.get("/tenants", { params });

export const getTenantById = (id) => api.get(`/tenant/${id}`);

export const createTenant = (payload) => api.post("/create-tenant", payload);

export const getCreateTenantMeta = () => api.get("/create-tenant/meta");

export const updateTenant = (id, payload) => api.patch(`/update-tenant/${id}`, payload);

export const updateTenantPlan = (id, payload) => api.patch(`/update-plan/${id}`, payload);

export const importTenantProductsFromSheet = (id, payload) =>
  api.post(`/tenants/${id}/products/import-google-sheet`, payload);

export const createTenantUser = (id, payload) => api.post(`/tenants/${id}/users`, payload);

export const getTenantUsers = (id) => api.get(`/tenants/${id}/users`);

export const getTenantBranches = (id) => api.get(`/tenants/${id}/branches`);

export const createTenantBranch = (id, payload) => api.post(`/tenants/${id}/branches`, payload);

export const updateTenantUserRole = (userId, payload) => api.patch(`/users/${userId}/role`, payload);

export const upgradeTenantPlan = (id, payload) =>
  api.post(`/tenants/${id}/upgrade-plan`, payload);

export const renewTenantPlan = (id, payload) =>
  api.post(`/tenants/${id}/renew-plan`, payload);

export const updateTenantAddons = (id, payload) =>
  api.patch(`/tenants/${id}/addons`, payload);
 
