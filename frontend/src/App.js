import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./lib/auth";
import { CartProvider } from "./lib/cart";
import Header from "./components/Header";
import Footer from "./components/Footer";
import CartDrawer from "./components/CartDrawer";
import AuthModalHost from "./components/AuthModalHost";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import AuthCallback from "./pages/AuthCallback";
import Legal from "./pages/Legal";
import NotFound from "./pages/NotFound";

function Protected({ children, adminOnly = false }) {
  const { user, checking } = useAuth();
  const location = useLocation();
  if (checking) return <div className="min-h-screen flex items-center justify-center text-ink-500">Loading…</div>;
  if (!user) return <Navigate to="/" replace state={{ from: location.pathname, requireAuth: true }} />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

function Shell() {
  const location = useLocation();
  if (typeof window !== "undefined" && window.location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  const isAdmin = location.pathname.startsWith("/admin");
  return (
    <div className="min-h-screen flex flex-col bg-bone-50">
      {!isAdmin && <Header />}
      <main className="flex-1">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/shop/:category" element={<Shop />} />
            <Route path="/product/:productId" element={<ProductDetail />} />
            <Route path="/legal/:slug" element={<Legal />} />
            <Route path="/checkout" element={<Protected><Checkout /></Protected>} />
            <Route path="/order/:orderId" element={<Protected><OrderSuccess /></Protected>} />
            <Route path="/account" element={<Protected><Account /></Protected>} />
            <Route path="/admin/*" element={<Protected adminOnly><Admin /></Protected>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </main>
      {!isAdmin && <Footer />}
      <CartDrawer />
      <AuthModalHost />
      <Toaster position="top-center" richColors />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Shell />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
