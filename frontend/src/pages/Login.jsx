import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(email, password) {
  const errors = {};
  if (!email.trim()) {
    errors.email = 'El correo electrónico es obligatorio.';
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = 'Ingresa un correo electrónico válido.';
  }
  if (!password) {
    errors.password = 'La contraseña es obligatoria.';
  } else if (password.length < 1) {
    errors.password = 'La contraseña no puede estar vacía.';
  }
  return errors;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setErrors({});

    const trimmedEmail = email.trim();
    const validationErrors = validate(trimmedEmail, password);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await login(trimmedEmail, password);
      navigate('/');
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) {
        setErrors(data.errors);
        setServerError(data.message || '');
      } else {
        setServerError(data?.message || 'Error al iniciar sesión. Verifica tu conexión.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>ERP POS</h1>
          <p>Sistema de Gestión Empresarial</p>
        </div>
        {serverError && <div className="alert alert-error">{serverError}</div>}
        <form onSubmit={handleSubmit} noValidate>
          <div className={`form-group ${errors.email ? 'has-error' : ''}`}>
            <label htmlFor="login-email">Correo Electrónico</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((prev) => ({ ...prev, email: '' })); }}
              onBlur={() => setEmail((prev) => prev.trim())}
              placeholder="admin@erp.com"
              autoFocus
              autoComplete="email"
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>
          <div className={`form-group ${errors.password ? 'has-error' : ''}`}>
            <label htmlFor="login-password">Contraseña</label>
            <div className="password-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((prev) => ({ ...prev, password: '' })); }}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>
          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
