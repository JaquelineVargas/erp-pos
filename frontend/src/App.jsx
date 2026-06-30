import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import ProductBatches from './pages/ProductBatches';
import InventoryMovements from './pages/InventoryMovements';
import Categories from './pages/Categories';
import Customers from './pages/Customers';
import Sales from './pages/Sales';
import Arqueo from './pages/Arqueo';
import Users from './pages/Users';
import Reports from './pages/Reports';
import Backups from './pages/Backups';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
          } />
          <Route path="/pos" element={
            <ProtectedRoute permission="sales.create"><Layout><POS /></Layout></ProtectedRoute>
          } />
          <Route path="/products" element={
            <ProtectedRoute permission="products.view"><Layout><Products /></Layout></ProtectedRoute>
          } />
          <Route path="/products/:id/batches" element={
            <ProtectedRoute permission="products.view"><Layout><ProductBatches /></Layout></ProtectedRoute>
          } />
          <Route path="/products/:id/movements" element={
            <ProtectedRoute permission="inventory.view"><Layout><InventoryMovements /></Layout></ProtectedRoute>
          } />
          <Route path="/categories" element={
            <ProtectedRoute permission="categories.view"><Layout><Categories /></Layout></ProtectedRoute>
          } />
          <Route path="/customers" element={
            <ProtectedRoute><Layout><Customers /></Layout></ProtectedRoute>
          } />
          <Route path="/sales" element={
            <ProtectedRoute permission="sales.view"><Layout><Sales /></Layout></ProtectedRoute>
          } />
          <Route path="/arqueo" element={
            <ProtectedRoute permission="cash-register.view"><Layout><Arqueo /></Layout></ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute permission="users.view"><Layout><Users /></Layout></ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute permission="reports.view"><Layout><Reports /></Layout></ProtectedRoute>
          } />
          <Route path="/backups" element={
            <ProtectedRoute permission="backups.create"><Layout><Backups /></Layout></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
