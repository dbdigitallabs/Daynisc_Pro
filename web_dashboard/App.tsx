// src/App.tsx
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "./store/authStore";
import DashboardLayout from "./components/layout/DashboardLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import MastersPage from "./pages/MastersPage";
import AccountingPage from "./pages/AccountingPage";
import BankingPage from "./pages/BankingPage";
import SalesPage from "./pages/SalesPage";
import CRMPage from "./pages/CRMPage";
import PurchasePage from "./pages/PurchasePage";
import InventoryPage from "./pages/InventoryPage";
import AssetsPage from "./pages/AssetsPage";
import ProductionPage from "./pages/ProductionPage";
import TransportPage from "./pages/TransportPage";
import GSTPage from "./pages/GSTPage";
import ReportsPage from "./pages/ReportsPage";
import AICenterPage from "./pages/AICenterPage";
import AIVerificationPage from "./pages/AIVerificationPage";
import DocumentHubPage from "./pages/DocumentHubPage";
import WorkflowEnginePage from "./pages/WorkflowEnginePage";
import AutomationBuilderPage from "./pages/AutomationBuilderPage";
import VendorPortalPage from "./pages/VendorPortalPage";
import CustomerPortalPage from "./pages/CustomerPortalPage";
import CalendarPage from "./pages/CalendarPage";
import MarketplacePage from "./pages/MarketplacePage";
import NotificationCenterPage from "./pages/NotificationCenterPage";
import ERPSyncPage from "./pages/ERPSyncPage";
import AdministrationPage from "./pages/AdministrationPage";
import PresentationPage from "./pages/PresentationPage";

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
            <Route path="masters" element={<MastersPage />} />
            <Route path="accounting/*" element={<AccountingPage />} />
            <Route path="banking" element={<BankingPage />} />
            <Route path="sales/*" element={<SalesPage />} />
            <Route path="crm" element={<CRMPage />} />
            <Route path="purchase/*" element={<PurchasePage />} />
            <Route path="inventory/*" element={<InventoryPage />} />
            <Route path="assets" element={<AssetsPage />} />
            <Route path="production/*" element={<ProductionPage />} />
            <Route path="transport/*" element={<TransportPage />} />
            <Route path="gst/*" element={<GSTPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="ai-center" element={<AICenterPage />} />
            <Route path="ai-verification" element={<AIVerificationPage />} />
            <Route path="presentation" element={<PresentationPage />} />
            <Route path="document-hub" element={<DocumentHubPage />} />
            <Route path="workflow" element={<WorkflowEnginePage />} />
            <Route path="automation-builder" element={<AutomationBuilderPage />} />
            <Route path="vendor-portal" element={<VendorPortalPage />} />
            <Route path="customer-portal" element={<CustomerPortalPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="marketplace" element={<MarketplacePage />} />
            <Route path="tally-integration" element={<ERPSyncPage />} />
            <Route path="notifications" element={<NotificationCenterPage />} />
            <Route path="administration" element={<AdministrationPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  );
}
