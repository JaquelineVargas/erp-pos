import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

export default function Topbar() {
  const { user, logout } = useAuth();
  const [openRegister, setOpenRegister] = useState(false);

  useEffect(() => {
    checkArqueo();
    const interval = setInterval(checkArqueo, 15000);
    return () => clearInterval(interval);
  }, []);

  const checkArqueo = async () => {
    try {
      const { data } = await api.get('/arqueo/current');
      setOpenRegister(!!data);
    } catch { setOpenRegister(false); }
  };

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
        {openRegister && (
          <span className="badge badge-warning">Arqueo Abierto</span>
        )}
        <span className="user-role">{roleLabels[user?.role] || user?.role}</span>
        <span className="user-name">{user?.name}</span>
        <button className="btn-logout" onClick={handleLogout}>Cerrar Sesión</button>
      </div>
    </header>
  );
}
