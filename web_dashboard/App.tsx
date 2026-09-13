// src/App.tsx
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "./store/authStore";
import DashboardLayout from "./components/layout/DashboardLayout";
import LoginPage from "./pages/LoginPage";
import AIVerificationPage from "./pages/AIVerificationPage";
import ERPSyncPage from "./pages/ERPSyncPage";
import BankReconciliationPage from "./pages/BankReconciliationPage";

import ErrorBoundary from "./components/ErrorBoundary";
import DownloadLandingPage from "./pages/DownloadLandingPage";
import DashboardPage from "./pages/DashboardPage";
import ReportsPage from "./pages/ReportsPage";
import MastersPage from "./pages/MastersPage";
import SettingsPage from "./pages/SettingsPage";

const isElectron = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    window.location.protocol === "file:" ||
    navigator.userAgent.toLowerCase().includes(" electron/") ||
    Boolean((window as any).electron) ||
    Boolean((window as any).process?.versions?.electron)
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <Routes>
            {/* Landing page for web visitors; Electron loads app directly */}
            <Route
              path="/"
              element={
                isElectron() ? <Navigate to="/dashboard" replace /> : <DownloadLandingPage />
              }
            />
            <Route path="/download" element={<DownloadLandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="ai-verification" element={<AIVerificationPage />} />
              <Route path="tally-sync" element={<ERPSyncPage />} />
              <Route path="bank-recon" element={<BankReconciliationPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="masters" element={<MastersPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="bank-reconciliation" element={<Navigate to="/bank-recon" replace />} />
              <Route path="tally-integration" element={<Navigate to="/tally-sync" replace />} />
            </Route>
            <Route
              path="*"
              element={
                isElectron() ? <Navigate to="/ai-verification" replace /> : <Navigate to="/" replace />
              }
            />
          </Routes>
        </HashRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
