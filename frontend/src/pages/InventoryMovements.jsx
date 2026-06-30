import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { formatPrice } from '../utils/format';

const TYPE_LABELS = {
  sale: 'Venta', purchase: 'Compra', adjustment: 'Ajuste',
  return: 'Devolución', manual_in: 'Entrada Manual', manual_out: 'Salida Manual',
  transfer: 'Transferencia',
};

const formatStock = (value, inventoryType) => {
  const num = Number(value);
  if (isNaN(num)) return '0';
  if (inventoryType === 'unit') return Math.round(num).toString();
  return num.toFixed(3).replace(/\.?0+$/, '');
};

export default function InventoryMovements() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [movements, setMovements] = useState({ data: [], current_page: 1, last_page: 1 });
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    api.get(`/products/${id}`).then(({ data }) => setProduct(data));
  }, [id]);

  useEffect(() => {
    const params = { per_page: 20, page };
    if (from) params.from = from;
    if (to) params.to = to;
    api.get(`/products/${id}/movements`, { params }).then(({ data }) => setMovements(data));
  }, [id, page, from, to]);

  if (!product) return <div className="page"><p>Cargando...</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-secondary btn-sm" onClick={() => navigate('/products')}>← Volver</button>
        <h2>Movimientos: {product.name}</h2>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="kpi-card"><h3>Stock Actual</h3><p className="kpi-value">{formatStock(product.current_stock, product.inventory_type)} {product.base_unit}</p></div>
          <div className="kpi-card"><h3>Stock Mín</h3><p className="kpi-value">{formatStock(product.min_stock, product.inventory_type)}</p></div>
          <div className="kpi-card"><h3>P. Venta</h3><p className="kpi-value">{formatPrice(product.selling_price)}</p></div>
          <div className="kpi-card"><h3>Movimientos</h3><p className="kpi-value">{movements.total || 0}</p></div>
        </div>
      </div>

      <div className="filters" style={{ marginBottom: 16 }}>
        <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} className="input" />
        <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} className="input" />
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Fecha / Hora</th>
              <th>Tipo</th>
              <th>Cantidad</th>
              <th>Stock Anterior</th>
              <th>Stock Posterior</th>
              <th>Usuario</th>
              <th>Notas</th>
            </tr>
          </thead>
          <tbody>
            {(movements.data || []).map(m => (
              <tr key={m.id}>
                <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                  {new Date(m.created_at).toLocaleString('es-MX', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </td>
                <td>
                  <span className={`badge ${m.type === 'sale' ? 'badge-info' : m.type === 'purchase' ? 'badge-success' : m.type === 'adjustment' ? 'badge-warning' : 'badge-secondary'}`}>
                    {TYPE_LABELS[m.type] || m.type}
                  </span>
                </td>
                <td style={{ color: m.quantity < 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>
                  {m.quantity > 0 ? '+' : ''}{Number(m.quantity).toFixed(3).replace(/\.?0+$/, '')}
                </td>
                <td>{formatStock(m.stock_before, product.inventory_type)}</td>
                <td>{formatStock(m.stock_after, product.inventory_type)}</td>
                <td style={{ fontSize: '0.85rem' }}>{m.user?.name || '—'}</td>
                <td style={{ fontSize: '0.85rem', maxWidth: 200, wordBreak: 'break-word' }}>{m.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(movements.data || []).length === 0 && (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Sin movimientos registrados</p>
        )}
      </div>

      {(movements.last_page || 1) > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button className="btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Anterior</button>
          <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Pág. {movements.current_page} de {movements.last_page}
          </span>
          <button className="btn-sm btn-secondary" disabled={page >= (movements.last_page || 1)} onClick={() => setPage(page + 1)}>Siguiente →</button>
        </div>
      )}
    </div>
  );
}
