import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'cashier' });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('users.create');
  const canEdit = hasPermission('users.edit');

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = () => {
    api.get('/users').then(({ data }) => setUsers(data.data || data));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = { ...form, email: form.username + '@erp.com' };
      delete payload.username;
      if (editing) {
        if (!payload.password) delete payload.password;
        await api.put(`/users/${editing.id}`, payload);
      } else {
        await api.post('/users', payload);
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: '', username: '', password: '', role: 'cashier' });
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar usuario');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteUser = async (id) => {
    if (window.confirm('¿Desactivar usuario?')) {
      if (deleting) return;
      setDeleting(true);
      try {
        await api.delete(`/users/${id}`);
        loadUsers();
      } finally {
        setDeleting(false);
      }
    }
  };

  const roleLabels = { admin: 'Administrador', cashier: 'Cajero', supervisor: 'Supervisor' };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Usuarios</h2>
        {canCreate && (
          <button className="btn-primary" onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', username: '', password: '', role: 'cashier' }); }}>
            + Nuevo Usuario
          </button>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editing ? 'Editar' : 'Nuevo'} Usuario</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <div className="email-domain-input">
                  <input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="usuario" required autoFocus />
                  <span className="email-domain">@erp.com</span>
                </div>
              </div>
              <div className="form-group">
                <label>Contraseña {editing && '(dejar vacío para no cambiar)'}</label>
                <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required={!editing} />
              </div>
              <div className="form-group">
                <label>Rol</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                  <option value="admin">Administrador</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="cashier">Cajero</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Guardando...' : (editing ? 'Actualizar' : 'Crear')}</button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Activo</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{roleLabels[u.role] || u.role}</td>
                <td>{u.is_active ? '✅' : '❌'}</td>
                <td className="actions">
                  {canEdit && (
                    <button className="btn-sm btn-edit" onClick={() => { const username = u.email.replace('@erp.com', ''); setEditing(u); setForm({ name: u.name, username, password: '', role: u.role }); setShowForm(true); }}>✏️</button>
                  )}
                  {canEdit && <button className="btn-sm btn-delete" onClick={() => deleteUser(u.id)}>🗑️</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
