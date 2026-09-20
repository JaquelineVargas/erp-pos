import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useArqueo } from '../../contexts/ArqueoContext';

export default function Topbar() {
  const { user, logout } = useAuth();
  const { arqueo, loading } = useArqueo();

  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      if (err.response?.status === 409) {
        alert(err.response.data.message);
      } else {
        window.location.href = '/login';
      }
    } finally {
      setLoggingOut(false);
    }
  };

  const roleLabels = {
    admin: 'Administrador',
    cashier: 'Cajero',
    supervisor: 'Supervisor',
  };

  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1>Sistema ERP POS</h1>
      </div>
      <div className="topbar-user">
        {loading ? (
          <span className="badge badge-info">Cargando...</span>
        ) : arqueo ? (
          <span className="badge badge-success">Arqueo Abierto</span>
        ) : (
          <span className="badge badge-danger">Arqueo Cerrado</span>
        )}
        <span className="user-role">{roleLabels[user?.role] || user?.role}</span>
        <span className="user-name">{user?.name}</span>
        <button className="btn-logout" onClick={handleLogout}>Cerrar Sesión</button>
      </div>
    </header>
  );
}
