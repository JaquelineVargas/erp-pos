import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, permission }) {
  const { user, loading, hasPermission } = useAuth();

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" replace />;

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
