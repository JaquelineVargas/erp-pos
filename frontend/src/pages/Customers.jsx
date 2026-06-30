import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadCustomers(); }, [search]);

  const loadCustomers = () => {
    const params = {};
    if (search) params.search = search;
    api.get('/customers', { params }).then(({ data }) => setCustomers(data.data || data));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/customers/${editing.id}`, form);
      } else {
        await api.post('/customers', form);
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: '', email: '', phone: '', address: '' });
      loadCustomers();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar cliente');
    } finally {
      setSubmitting(false);
    }
  };

  const editCustomer = (c) => {
    setForm({ name: c.name, email: c.email || '', phone: c.phone || '', address: c.address || '' });
    setEditing(c);
    setShowForm(true);
  };

  const deleteCustomer = async (id) => {
    if (window.confirm('¿Eliminar cliente?')) {
      if (deleting) return;
      setDeleting(true);
      try {
        await api.delete(`/customers/${id}`);
        loadCustomers();
      } finally {
        setDeleting(false);
      }
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Clientes</h2>
        <button className="btn-primary" onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', email: '', phone: '', address: '' }); }}>
          + Nuevo Cliente
        </button>
      </div>
      <div className="filters">
        <input type="text" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} className="input" />
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editing ? 'Editar' : 'Nuevo'} Cliente</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre *</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>Dirección</label>
                <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} rows="3" />
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
            <tr><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Compras</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.email || '—'}</td>
                <td>{c.phone || '—'}</td>
                <td>{c.sales_count || 0}</td>
                <td className="actions">
                  <button className="btn-sm btn-edit" onClick={() => editCustomer(c)}>✏️</button>
                  <button className="btn-sm btn-delete" onClick={() => deleteCustomer(c.id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
