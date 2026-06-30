import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';

export default function Sidebar() {
  const { user, hasPermission } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: '📊', permission: null },
    { path: '/pos', label: 'Punto de Venta', icon: '🛒', permission: 'sales.create' },
    { path: '/products', label: 'Productos', icon: '📦', permission: 'products.view' },
    { path: '/categories', label: 'Categorías', icon: '📁', permission: 'categories.view' },
    { path: '/customers', label: 'Clientes', icon: '👥', permission: null },
    { path: '/sales', label: 'Ventas', icon: '💰', permission: 'sales.view' },
    { path: '/arqueo', label: 'Arqueo', icon: '💵', permission: 'cash-register.view' },
    { path: '/reports', label: 'Reportes', icon: '📈', permission: 'reports.view' },
  ];

  const visibleItems = menuItems.filter(item =>
    !item.permission || hasPermission(item.permission)
  );

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <h2>{collapsed ? 'EP' : 'ERP POS'}</h2>
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? '→' : '←'}
        </button>
      </div>
      <nav className="sidebar-nav">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {!collapsed && <span className="nav-label">{item.label}</span>}
          </NavLink>
        ))}
        {hasPermission('users.view') && (
          <NavLink
            to="/users"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">👤</span>
            {!collapsed && <span className="nav-label">Usuarios</span>}
          </NavLink>
        )}
        {hasPermission('backups.create') && (
          <NavLink
            to="/backups"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">💾</span>
            {!collapsed && <span className="nav-label">Backups</span>}
          </NavLink>
        )}
      </nav>
    </aside>
  );
}
