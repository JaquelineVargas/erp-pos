import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = () => {
    api.get('/categories').then(({ data }) => setCategories(data));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/categories/${editing.id}`, form);
      } else {
        await api.post('/categories', form);
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: '', description: '' });
      loadCategories();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar categoría');
    } finally {
      setSubmitting(false);
    }
  };

  const editCategory = (c) => {
    setForm({ name: c.name, description: c.description || '' });
    setEditing(c);
    setShowForm(true);
  };

  const deleteCategory = async (id) => {
    if (window.confirm('¿Eliminar categoría?')) {
      if (deleting) return;
      setDeleting(true);
      try {
        await api.delete(`/categories/${id}`);
        loadCategories();
      } catch (err) {
        alert(err.response?.data?.message || 'Error al eliminar');
      } finally {
        setDeleting(false);
      }
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Categorías</h2>
        <button className="btn-primary" onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', description: '' }); }}>
          + Nueva Categoría
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editing ? 'Editar' : 'Nueva'} Categoría</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre *</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows="3" />
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
            <tr><th>Nombre</th><th>Descripción</th><th>Productos</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {categories.map(c => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.description || '—'}</td>
                <td>{c.products_count || 0}</td>
                <td className="actions">
                  <button className="btn-sm btn-edit" onClick={() => editCategory(c)}>✏️</button>
                  <button className="btn-sm btn-delete" onClick={() => deleteCategory(c.id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
