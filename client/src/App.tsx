import { useEffect } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { LoginPage } from "./features/auth/LoginPage";
import { RegisterPage } from "./features/auth/RegisterPage";
import { AdminDashboard } from "./features/admin/AdminDashboard";
import { CartPage } from "./features/cart/CartPage";
import { CategoriesPage } from "./features/categories/CategoriesPage";
import { PlannedModulePage } from "./features/common/PlannedModulePage";
import { HomePage } from "./features/home/HomePage";
import { ProductsPage } from "./features/products/ProductsPage";
import { SellerDashboard } from "./features/seller/SellerDashboard";
import { SellerEnquiryPage } from "./features/seller/SellerEnquiryPage";
import { SellerHubPage } from "./features/seller/SellerHubPage";
import { StoresPage } from "./features/stores/StoresPage";
import { initMobileApp } from "./lib/mobile";

export default function App() {
  const navigate = useNavigate();

  useEffect(() => {
    initMobileApp(() => navigate(-1));
  }, [navigate]);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="stores" element={<StoresPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="orders" element={<PlannedModulePage title="Orders" />} />
        <Route path="checkout" element={<PlannedModulePage title="Checkout" />} />
        <Route path="customer" element={<PlannedModulePage title="Customer Account" />} />
        <Route path="seller-hub" element={<SellerHubPage />} />
        <Route path="seller-enquiry" element={<SellerHubPage />} />
        <Route path="seller" element={<SellerDashboard />} />
        <Route path="admin" element={<AdminDashboard />} />
        <Route path="rentals" element={<PlannedModulePage title="Rentals" />} />
        <Route path="real-estate" element={<PlannedModulePage title="Real Estate" />} />
        <Route path="designs" element={<PlannedModulePage title="Designs and Professionals" />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
