import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("shaj_admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      localStorage.removeItem("shaj_admin_token");
      localStorage.removeItem("shaj_admin_profile");
      window.location.href = "/admin/login";
    }
    return Promise.reject(error);
  }
);

export default api;
