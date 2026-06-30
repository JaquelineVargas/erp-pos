import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatPrice } from '../utils/format';

export default function ProductBatches() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [batches, setBatches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ batch_code: '', expiration_date: '', current_quantity: '0', purchase_price: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('products.edit');

  useEffect(() => {
    api.get(`/products/${id}`).then(({ data }) => setProduct(data));
    api.get(`/products/${id}/batches`).then(({ data }) => setBatches(data));
  }, [id]);

  const loadProduct = () => {
    api.get(`/products/${id}`).then(({ data }) => setProduct(data));
  };

  const loadBatches = () => {
    api.get(`/products/${id}/batches`).then(({ data }) => setBatches(data));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const qty = Number(form.current_quantity) || 0;
      const total = Number(form.purchase_price) || 0;
      const unitCost = (total > 0 && qty > 0) ? total / qty : 0;
      const payload = {
        ...form,
        current_quantity: qty,
        unit_cost: unitCost,
        product_id: Number(id),
      };
      delete payload.purchase_price;
      if (editing) {
        await api.put(`/product-batches/${editing.id}`, payload);
      }
      setShowForm(false);
      setEditing(null);
      setForm({ batch_code: '', expiration_date: '', current_quantity: '0', purchase_price: '', notes: '' });
      loadBatches();
      loadProduct();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar lote');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteBatch = async (batch) => {
    if (!window.confirm('¿Eliminar lote?')) return;
    if (deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/product-batches/${batch.id}`);
      loadBatches();
      loadProduct();
    } finally {
      setDeleting(false);
    }
  };

  const todayStr = () => new Date().toISOString().split('T')[0];
  const isExpired = (b) => b.expiration_date && b.expiration_date < todayStr();
  const isExpiringSoon = (b) => {
    if (!b.expiration_date) return false;
    const soon = new Date(); soon.setDate(soon.getDate() + (product?.expiration_alert_days || 30));
    return b.expiration_date >= todayStr() && b.expiration_date <= soon.toISOString().split('T')[0];
  };

  const formatStock = (value) => {
    const num = Number(value);
    if (isNaN(num)) return '0';
    return num.toFixed(3).replace(/\.?0+$/, '');
  };

  const baseStep = product?.inventory_type === 'unit' ? '1' : '0.001';

  const editBatch = (b) => {
    const qty = Number(b.current_quantity) || 0;
    const uc = Number(b.unit_cost) || 0;
    setForm({
      batch_code: b.batch_code,
      expiration_date: b.expiration_date || '',
      current_quantity: b.current_quantity.toString(),
      purchase_price: (uc > 0 && qty > 0) ? (uc * qty).toString() : '',
      notes: b.notes || '',
    });
    setEditing(b);
    setShowForm(true);
  };

  if (!product) return <div className="page"><p>Cargando...</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-secondary btn-sm" onClick={() => navigate('/products')}>← Volver</button>
        <h2>Lotes: {product.name}</h2>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          <div className="kpi-card"><h3>Stock</h3><p className="kpi-value">{formatStock(product.current_stock)} {product.base_unit}</p></div>
          <div className="kpi-card"><h3>Stock Mín</h3><p className="kpi-value">{formatStock(product.min_stock)}</p></div>
          <div className="kpi-card"><h3>P. Venta</h3><p className="kpi-value">{formatPrice(product.selling_price)}</p></div>
          <div className="kpi-card"><h3>Lotes</h3><p className="kpi-value">{batches.length}</p></div>
          <div className="kpi-card"><h3>Tipo</h3><p className="kpi-value" style={{ fontSize: '0.85rem' }}>{product.inventory_type === 'weight' ? 'Peso' : product.inventory_type === 'volume' ? 'Vol.' : 'ud.'}</p></div>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Editar Lote</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Código de Lote *</label>
                <input type="text" value={form.batch_code} onChange={e => setForm({...form, batch_code: e.target.value})} required placeholder="LOTE-0001" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Fecha de Caducidad {product.track_expiration ? '*' : ''}</label>
                  <input type="date" value={form.expiration_date}
                    onChange={e => setForm({...form, expiration_date: e.target.value})}
                    required={product.track_expiration} />
                </div>
                <div className="form-group">
                  <label>Cantidad *</label>
                  <input type="number" step={baseStep} min="0" value={form.current_quantity}
                    onChange={e => setForm({...form, current_quantity: e.target.value})} required />
                </div>
              </div>
              <div className="form-group">
                <label>Precio de Compra (total)</label>
                <input type="number" step="0.01" min="0" value={form.purchase_price} onChange={e => setForm({...form, purchase_price: e.target.value})} />
                <small style={{ color: 'var(--text-muted)' }}>Se divide entre la cantidad para obtener el costo unitario</small>
              </div>
              <div className="form-group">
                <label>Notas</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows="2" />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Guardando...' : 'Actualizar'}</button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr><th>Lote</th><th>Vencimiento</th><th>Cantidad</th><th>Costo Unit.</th><th>Notas</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {batches.map(b => (
              <tr key={b.id} className={isExpired(b) ? 'row-danger' : isExpiringSoon(b) ? 'row-warning' : ''}>
                <td style={{ fontFamily: 'monospace' }}>{b.batch_code}</td>
                <td>
                  {b.expiration_date || '—'}
                  {isExpired(b) && <span className="badge badge-danger" style={{ marginLeft: 6 }}>Vencido</span>}
                  {isExpiringSoon(b) && <span className="badge badge-warning" style={{ marginLeft: 6 }}>Próximo</span>}
                </td>
                <td>{formatStock(b.current_quantity)}</td>
                <td>{b.unit_cost ? formatPrice(b.unit_cost) : '—'}</td>
                <td style={{ fontSize: '0.85rem', maxWidth: 200, wordBreak: 'break-word' }}>{b.notes || '—'}</td>
                <td className="actions">
                  {canEdit && <button className="btn-sm btn-edit" onClick={() => editBatch(b)}>✏️</button>}
                  {canEdit && <button className="btn-sm btn-delete" onClick={() => deleteBatch(b)}>🗑️</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {batches.length === 0 && (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Sin lotes registrados para este producto</p>
        )}
      </div>
    </div>
  );
}
