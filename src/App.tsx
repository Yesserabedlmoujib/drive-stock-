import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { Toaster } from "./components/ui/toaster";
import BonL from "./pages/BonL";
import BonR from "./pages/BonR";
import BonS from "./pages/BonS";
import Customer from "./pages/Customer";
import Dashboard from "./pages/Dashboard";
import HistoryL from "./pages/HistoryL";
import HistoryR from "./pages/HistoryR";
import HistoryS from "./pages/HistoryS";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Product from "./pages/Product";
import Profile from "./pages/Profile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/Profile" element={<Profile />} />
            <Route path="/customer" element={<Customer />} />
            <Route path="/products" element={<Product />} />
            <Route path="/bon-de-sortie" element={<BonS />} />
            <Route path="/bon-de-livraison" element={<BonL />} />
            <Route path="/bon-de-retour" element={<BonR />} />

            <Route path="/history" element={<HistoryS />} />
            <Route path="/historyLivraison" element={<HistoryL />} />
            <Route path="/historyRetour" element={<HistoryR />} />
            <Route path="/login" element={<Login />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />

      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;

