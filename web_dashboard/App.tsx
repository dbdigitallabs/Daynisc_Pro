// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "./store/authStore";
import DashboardLayout from "./components/layout/DashboardLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AccountingPage from "./pages/AccountingPage";
import InventoryPage from "./pages/InventoryPage";
import ProductionPage from "./pages/ProductionPage";
import SalesPage from "./pages/SalesPage";
import PurchasePage from "./pages/PurchasePage";
import TransportPage from "./pages/TransportPage";
import GSTPage from "./pages/GSTPage";
import AIVerificationPage from "./pages/AIVerificationPage";
import ERPSyncPage from "./pages/ERPSyncPage";
import SettingsPage from "./pages/SettingsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
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
            <Route path="accounting/*" element={<AccountingPage />} />
            <Route path="inventory/*" element={<InventoryPage />} />
            <Route path="production/*" element={<ProductionPage />} />
            <Route path="sales/*" element={<SalesPage />} />
            <Route path="purchase/*" element={<PurchasePage />} />
            <Route path="transport/*" element={<TransportPage />} />
            <Route path="gst/*" element={<GSTPage />} />
            <Route path="ai-verification" element={<AIVerificationPage />} />
            <Route path="erp-sync" element={<ERPSyncPage />} />
            <Route path="settings/*" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
