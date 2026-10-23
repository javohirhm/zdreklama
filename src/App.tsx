import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Compass } from "lucide-react";
import { Layout } from "./components/Layout";
import { ToastProvider } from "./components/ToastProvider";
import { QuickTransactionProvider } from "./components/QuickTransaction";
import { EmptyState } from "./components/EmptyState";
import { t } from "./i18n";
import { DashboardPage } from "./pages/Dashboard";
import { MoneyPage } from "./pages/Money";
import { OrdersPage } from "./pages/Orders";
import { ProductsPage } from "./pages/Products";
import { MaterialsPage } from "./pages/Materials";
import { TeamPage } from "./pages/Team";
import { ClientsPage } from "./pages/Clients";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="card" style={{ marginTop: 30 }}>
      <EmptyState
        icon={<Compass size={21} />}
        title={t("This page is off the production board")}
        description={t("The route you followed does not exist. Head back to the workshop overview to find your way.")}
        action={
          <button type="button" className="btn btn-primary" onClick={() => navigate("/")}>
            {t("Back to overview")}
          </button>
        }
      />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <QuickTransactionProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/money" element={<MoneyPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/materials" element={<MaterialsPage />} />
                <Route path="/team" element={<TeamPage />} />
                <Route path="/clients" element={<ClientsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </QuickTransactionProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
