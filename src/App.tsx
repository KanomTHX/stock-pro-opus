import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Branches from "./pages/Branches";
import GRN from "./pages/GRN";
import GI from "./pages/GI";
import Transfer from "./pages/Transfer";
import NotFound from "./pages/NotFound";
import MovementLogs from "./pages/MovementLogs";
import SerialNumbers from "./pages/SerialNumbers";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/branches" element={<Branches />} />
            <Route path="/grn" element={<GRN />} />
            <Route path="/gi" element={<GI />} />
            <Route path="/transfer" element={<Transfer />} />
            <Route path="/serial-numbers" element={<SerialNumbers />} />
            <Route path="/movement-logs" element={<MovementLogs />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
