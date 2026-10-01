import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import { AuthGate } from "./components/AuthGate";
import { Layout } from "./components/Layout";
import { ToastProvider } from "./components/Toast";
import { AccountingPage } from "./features/accounting/AccountingPage";
import { AgendaPage } from "./features/agenda/AgendaPage";
import { ClientPage } from "./features/clients/ClientPage";
import { ClientsPage } from "./features/clients/ClientsPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { NewDocumentPage } from "./features/documents";
import { InvoicePage } from "./features/invoices/InvoicePage";
import { InvoicesPage } from "./features/invoices/InvoicesPage";
import { PartsPage } from "./features/parts/PartsPage";
import { PrintPage } from "./features/print/PrintPage";
import { ProfitabilityPage } from "./features/profitability/ProfitabilityPage";
import { QuotePage } from "./features/quotes/QuotePage";
import { QuotesPage } from "./features/quotes/QuotesPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { VehiclePage } from "./features/vehicles/VehiclePage";
import { VehiclesPage } from "./features/vehicles/VehiclesPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5000, refetchOnWindowFocus: true, retry: 1 },
  },
});

function NotFound() {
  return <div className="py-20 text-center text-slate-500">Page introuvable</div>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AuthGate>
            <Routes>
              <Route path="/imprimer/devis/:id" element={<PrintPage kind="quote" />} />
              <Route path="/imprimer/facture/:id" element={<PrintPage kind="invoice" />} />
              <Route element={<Layout />}>
                <Route index element={<DashboardPage />} />
                <Route path="agenda" element={<AgendaPage />} />
                <Route path="clients" element={<ClientsPage />} />
                <Route path="clients/:id" element={<ClientPage />} />
                <Route path="vehicules" element={<VehiclesPage />} />
                <Route path="vehicules/:id" element={<VehiclePage />} />
                <Route path="devis" element={<QuotesPage />} />
                <Route path="devis/nouveau" element={<NewDocumentPage kind="quote" />} />
                <Route path="devis/:id" element={<QuotePage />} />
                <Route path="factures" element={<InvoicesPage />} />
                <Route path="factures/nouvelle" element={<NewDocumentPage kind="invoice" />} />
                <Route path="factures/:id" element={<InvoicePage />} />
                <Route path="pieces" element={<PartsPage />} />
                <Route path="comptabilite" element={<AccountingPage />} />
                <Route path="charges" element={<Navigate to="/comptabilite" replace />} />
                <Route path="investissements" element={<Navigate to="/comptabilite?onglet=investissements" replace />} />
                <Route path="rentabilite" element={<ProfitabilityPage />} />
                <Route path="parametres" element={<SettingsPage />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </AuthGate>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
