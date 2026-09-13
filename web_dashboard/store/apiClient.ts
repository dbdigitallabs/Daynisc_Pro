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

import { getMockDataForUrl } from "./mockData";

// Handle responses & error fallbacks
api.interceptors.response.use(
  (res) => {
    // If Vercel SPA rewrite returned index.html for an API route:
    if (typeof res.data === "string" && (res.data.includes("<!doctype html>") || res.data.includes("<html"))) {
      const url = res.config.url || "";
      return { ...res, data: getMockDataForUrl(url, res.config.params) };
    }
    return res;
  },
  async (error) => {
    const state = useAuthStore.getState();
    const isDemo = state.token?.startsWith("demo-token") || !import.meta.env.VITE_API_URL;
    const url = error.config?.url || "";

    if (error.response?.status === 401) {
      if (isDemo) {
        return Promise.resolve({ data: getMockDataForUrl(url, error.config?.params) });
      }
      const refresh = state.refreshToken;
      if (refresh) {
        try {
          const res = await axios.post(`${BASE_URL}/auth/refresh`, {
            refresh_token: refresh,
          });
          const { access_token } = res.data;
          if (state.user && state.company) {
            state.setAuth(access_token, refresh, state.user, state.company);
          }
          error.config.headers.Authorization = `Bearer ${access_token}`;
          return api(error.config);
        } catch {
          useAuthStore.getState().logout();
          window.location.hash = "#/login";
        }
      } else {
        useAuthStore.getState().logout();
        window.location.hash = "#/login";
      }
    }

    // In demo / preview mode, if any API fails (e.g. 404 on Vercel), return mock fallback gracefully
    if (isDemo && (error.code === "ERR_NETWORK" || error.response?.status === 404 || !error.response)) {
      return Promise.resolve({ data: getMockDataForUrl(url, error.config?.params) });
    }

    return Promise.reject(error);
  }
);

export default api;
