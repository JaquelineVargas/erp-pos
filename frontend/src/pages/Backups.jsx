import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Backups() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [format, setFormat] = useState('sql');
  const [notes, setNotes] = useState('');

  useEffect(() => { loadBackups(); }, []);

  const loadBackups = async () => {
    try {
      const { data } = await api.get('/backups');
      setBackups(data);
    } catch {}
  };

  const createBackup = async () => {
    setLoading(true);
    try {
      await api.post('/backups', { format, notes });
      setNotes('');
      loadBackups();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al crear backup');
    } finally {
      setLoading(false);
    }
  };

  const downloadBackup = async (backup) => {
    try {
      const response = await api.get(`/backups/${backup.id}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data]);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = backup.filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      alert('Error al descargar');
    }
  };

  const deleteBackup = async (id) => {
    if (window.confirm('¿Eliminar este backup?')) {
      if (deleting) return;
      setDeleting(true);
      try {
        await api.delete(`/backups/${id}`);
        loadBackups();
      } finally {
        setDeleting(false);
      }
    }
  };

  const restoreBackup = async (backup) => {
    if (window.confirm(`¿Restaurar backup "${backup.filename}"? Esta acción puede sobrescribir datos existentes.`)) {
      if (restoring) return;
      setRestoring(true);
      try {
        const { data } = await api.post(`/backups/${backup.id}/restore`);
        alert(data.message);
        loadBackups();
      } catch (err) {
        alert(err.response?.data?.message || 'Error al restaurar');
      } finally {
        setRestoring(false);
      }
    }
  };

  const formatLabels = { sql: 'SQL', json: 'JSON', zip: 'ZIP' };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Backups</h2>
      </div>

      <div className="card">
        <h3>Crear Nuevo Backup</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Formato</label>
            <select value={format} onChange={e => setFormat(e.target.value)} className="input">
              <option value="sql">SQL</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <div className="form-group">
            <label>Notas</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Descripción opcional" className="input" />
          </div>
          <div className="form-group" style={{ alignSelf: 'flex-end' }}>
            <button className="btn-primary" onClick={createBackup} disabled={loading}>
              {loading ? 'Creando...' : '💾 Crear Backup'}
            </button>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr><th>Archivo</th><th>Formato</th><th>Tamaño</th><th>Fecha</th><th>Notas</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {backups.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No hay backups disponibles</td></tr>
            ) : backups.map(b => (
              <tr key={b.id}>
                <td>{b.filename}</td>
                <td>{formatLabels[b.format] || b.format}</td>
                <td>{b.size ? `${b.size} KB` : '—'}</td>
                <td>{new Date(b.created_at).toLocaleString('es-MX')}</td>
                <td>{b.notes || '—'}</td>
                <td className="actions">
                  <button className="btn-sm btn-view" onClick={() => downloadBackup(b)} title="Descargar">⬇️</button>
                  <button className="btn-sm" onClick={() => restoreBackup(b)} title="Restaurar" disabled={restoring}>🔄</button>
                  <button className="btn-sm btn-delete" onClick={() => deleteBackup(b.id)} title="Eliminar" disabled={deleting}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
