// src/store/apiClient.ts
import axios from "axios";
import { useAuthStore } from "./authStore";

// In Electron, window.location.protocol === 'file:'
// Relative paths like /api/v1 resolve to file:///api/v1 which is invalid.
// Always fall back to http://localhost:8000/api/v1 in Electron.
function getBaseURL(): string {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  const isElectron = typeof window !== "undefined" && window.location.protocol === "file:";

  if (isElectron) {
    // In Electron: always hit the local backend directly
    return "http://localhost:8000/api/v1";
  }
  // In browser: use env var if set and absolute, otherwise use Vite proxy
  if (envUrl && (envUrl.startsWith("http://") || envUrl.startsWith("https://"))) {
    return envUrl;
  }
  return "/api/v1"; // Works via Vite dev proxy or same-origin deployment
}

const BASE_URL = getBaseURL();

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
      const state = useAuthStore.getState();
      if (state.token?.startsWith("demo-token")) {
        return Promise.resolve({ data: {} });
      }
      const refresh = state.refreshToken;
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
          // Use hash navigation — works in both browser and Electron (HashRouter)
          window.location.hash = "#/login";
        }
      } else {
        useAuthStore.getState().logout();
        window.location.hash = "#/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
