// src/store/apiClient.ts
import axios from "axios";
import { useAuthStore } from "./authStore";

const BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
});

// Inject token from Zustand store on every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  const company = useAuthStore.getState().company;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (company) config.headers["X-Company-ID"] = company.id;
  return config;
});

// Handle 401 — attempt token refresh then logout
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const refresh = useAuthStore.getState().refreshToken;
      if (refresh) {
        try {
          const res = await axios.post(`${BASE_URL}/auth/refresh`, {
            refresh_token: refresh,
          });
          const { access_token } = res.data;
          const state = useAuthStore.getState();
          if (state.user && state.company) {
            state.setAuth(access_token, refresh, state.user, state.company);
          }
          error.config.headers.Authorization = `Bearer ${access_token}`;
          return api(error.config);
        } catch {
          useAuthStore.getState().logout();
          window.location.href = "/login";
        }
      } else {
        useAuthStore.getState().logout();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
