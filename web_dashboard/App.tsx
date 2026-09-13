// src/App.tsx
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "./store/authStore";
import DashboardLayout from "./components/layout/DashboardLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AccountingPage from "./pages/AccountingPage";
import InventoryPage from "./pages/InventoryPage";
import AIVerificationPage from "./pages/AIVerificationPage";
import ERPSyncPage from "./pages/ERPSyncPage";
import BankReconciliationPage from "./pages/BankReconciliationPage";

import ErrorBoundary from "./components/ErrorBoundary";

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
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="bank" element={<BankReconciliationPage />} />
            <Route path="accounting" element={<AccountingPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="ai-verification" element={<AIVerificationPage />} />
            <Route path="tally-sync" element={<ERPSyncPage />} />
            <Route path="bank-recon" element={<Navigate to="/bank" replace />} />
            <Route path="bank-reconciliation" element={<Navigate to="/bank" replace />} />
            <Route path="tally-integration" element={<Navigate to="/tally-sync" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </HashRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
