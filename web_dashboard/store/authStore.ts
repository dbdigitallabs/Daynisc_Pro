import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  phone: string;
  role: string;
  email?: string;
}

interface Company {
  id: string;
  name: string;
  plan: string;
  gstin?: string;
  db_schema?: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  company: Company | null;
  // Primary setter used by LoginPage
  setAuth: (token: string, refresh: string, user: User, company: Company) => void;
  // Legacy setters kept for compatibility
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      company: null,
      setAuth: (token, refreshToken, user, company) =>
        set({ token, refreshToken, user, company }),
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, refreshToken: null, user: null, company: null }),
    }),
    { name: 'erp-auth' }
  )
);
