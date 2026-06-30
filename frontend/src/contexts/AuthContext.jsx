import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/user')
        .then(({ data }) => {
          setUser(data.user);
          setPermissions(data.permissions || []);
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('permissions');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const payload = { email: email.trim(), password };
    if (import.meta.env.DEV) {
      console.debug('[Auth] login payload:', { email: payload.email, password: '***' });
    }
    await axios.get('/sanctum/csrf-cookie', { withCredentials: true });
    const { data } = await api.post('/login', payload);
    if (import.meta.env.DEV) {
      console.debug('[Auth] login response:', data);
    }
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('permissions', JSON.stringify(data.permissions || []));
    setUser(data.user);
    setPermissions(data.permissions || []);
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch (err) {
      if (err.response?.status === 409) {
        throw err;
      }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
    setUser(null);
    setPermissions([]);
  };

  const hasPermission = (permission) => {
    if (user?.role === 'admin') return true;
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permArray) => {
    if (user?.role === 'admin') return true;
    return permArray.some(p => permissions.includes(p));
  };

  return (
    <AuthContext.Provider value={{ user, permissions, login, logout, loading, hasPermission, hasAnyPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
