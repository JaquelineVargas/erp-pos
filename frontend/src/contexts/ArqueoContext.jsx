import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const ArqueoContext = createContext(null);

export function ArqueoProvider({ children }) {
  const [arqueo, setArqueo] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/arqueo/current', { params: { _: Date.now() } });
      if (data?.id) {
        setArqueo(data);
        localStorage.setItem('arqueo', JSON.stringify(data));
      } else {
        setArqueo(null);
        localStorage.removeItem('arqueo');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setArqueo(null);
        localStorage.removeItem('arqueo');
      }
    }
  }, []);

  const setOpen = useCallback((data) => {
    setArqueo(data);
    localStorage.setItem('arqueo', JSON.stringify(data));
  }, []);

  const setClosed = useCallback(() => {
    setArqueo(null);
    localStorage.removeItem('arqueo');
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('arqueo');
    if (saved) {
      try {
        setArqueo(JSON.parse(saved));
      } catch {
        localStorage.removeItem('arqueo');
      }
    }
    refresh();
    setLoading(false);
  }, [refresh]);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'arqueo') {
        if (e.newValue) {
          try {
            setArqueo(JSON.parse(e.newValue));
          } catch {
            setArqueo(null);
          }
        } else {
          setArqueo(null);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const value = {
    arqueo,
    loading,
    setOpen,
    setClosed,
    refresh,
    isOpen: !!arqueo,
  };

  return (
    <ArqueoContext.Provider value={value}>
      {children}
    </ArqueoContext.Provider>
  );
}

export function useArqueo() {
  const context = useContext(ArqueoContext);
  if (!context) {
    throw new Error('useArqueo must be used within an ArqueoProvider');
  }
  return context;
}