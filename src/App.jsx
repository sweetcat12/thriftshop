import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { StoreProvider, useStore } from "./context/Store";
import Layout from "./layouts/Layout";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Product from "./pages/Product";
import {
  AuthPage,
  Account,
  Orders,
  Addresses,
  Favorites,
} from "./pages/Account";
import { Cart, Checkout, Order } from "./pages/Checkout";
import {
  AdminLayout,
  Dashboard,
  AdminProducts,
  ProductEditor,
  AdminOrders,
  Customers,
} from "./pages/Admin";
import { About, NotFound } from "./pages/About";
import { Loading } from "./components/UI";
function Protected({ admin = false }) {
  const { user, ready } = useStore(),
    location = useLocation();
  if (!ready) return <Loading />;
  if (!user)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  if (admin && user.role !== "admin") return <Navigate to="/account" replace />;
  return <Outlet />;
}
export default function App() {
  return (
    <StoreProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="category/:category" element={<Shop />} />
          <Route path="search" element={<Shop />} />
          <Route path="product/:id" element={<Product />} />
          <Route path="about" element={<About />} />
          <Route path="login" element={<AuthPage />} />
          <Route path="register" element={<AuthPage register />} />
          <Route path="cart" element={<Cart />} />
          <Route element={<Protected />}>
            <Route path="checkout" element={<Checkout />} />
            <Route path="order/:id" element={<Order />} />
            <Route path="favorites" element={<Favorites />} />
            <Route path="account" element={<Account />} />
            <Route path="account/orders" element={<Orders />} />
            <Route path="account/addresses" element={<Addresses />} />
          </Route>
          <Route element={<Protected admin />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="products/new" element={<ProductEditor />} />
              <Route path="products/:id/edit" element={<ProductEditor />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="customers" element={<Customers />} />
              <Route path="inventory" element={<AdminProducts inventory />} />
              <Route path="analytics" element={<Dashboard analytics />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </StoreProvider>
  );
}
