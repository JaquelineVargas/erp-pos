import { useState, useEffect } from 'react';
import api from '../services/api';
import { formatPrice } from '../utils/format';

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [selected, setSelected] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadSales(); }, [from, to, paymentFilter, search, roleFilter]);

  const loadSales = async () => {
    setLoading(true);
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      if (paymentFilter) params.payment_method = paymentFilter;
      if (roleFilter) params.user_role = roleFilter;
      if (search) params.search = search;
      const { data } = await api.get('/sales', { params });
      setSales(data.data || data);
    } catch {} finally { setLoading(false); }
  };

  const viewSale = async (id) => {
    const { data } = await api.get(`/sales/${id}`);
    setSelected(data);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Ventas</h2>
      </div>

      <div className="filters">
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input" />
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input" />
        <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} className="input">
          <option value="">Todos los métodos</option>
          <option value="cash">Efectivo</option>
          <option value="card">Tarjeta</option>
          <option value="transfer">Transferencia</option>
          <option value="qr">QR</option>
        </select>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input">
          <option value="">Todos los vendedores</option>
          <option value="admin">Administrador</option>
          <option value="cashier">Cajero</option>
          <option value="supervisor">Supervisor</option>
        </select>
        <input type="text" placeholder="Buscar folio, cliente, producto..." value={search} onChange={e => setSearch(e.target.value)} className="input" style={{ minWidth: '250px' }} />
      </div>

      <div className="table-container">
        {loading ? <div className="loading"><div className="spinner"></div></div> : (
          <table className="table">
            <thead>
              <tr>
                <th>Folio</th><th>Fecha</th><th>Cliente</th><th>Vendedor</th><th>Método</th><th>Descuento</th><th>Total</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.id}>
                  <td>{s.folio}</td>
                  <td>{new Date(s.created_at).toLocaleString('es-MX')}</td>
                  <td>{s.customer?.name || 'Mostrador'}</td>
                  <td>{s.user?.name}</td>
                  <td>{s.payment_method === 'cash' ? 'Efectivo' : s.payment_method === 'card' ? 'Tarjeta' : s.payment_method === 'transfer' ? 'Transferencia' : s.payment_method === 'qr' ? 'QR' : s.payment_method}</td>
                  <td>{Number(s.discount_amount) > 0 ? `-${formatPrice(s.discount_amount)}` : '—'}</td>
                  <td>{formatPrice(s.total)}</td>
                  <td><button className="btn-sm btn-view" onClick={() => viewSale(s.id)}>👁️</button></td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No se encontraron ventas</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Venta {selected.folio}</h3>
            <div className="sale-detail">
              <p><strong>Fecha:</strong> {new Date(selected.created_at).toLocaleString('es-MX')}</p>
              <p><strong>Cliente:</strong> {selected.customer?.name || 'Mostrador'}</p>
              <p><strong>Vendedor:</strong> {selected.user?.name}</p>
              <p><strong>Método:</strong> {selected.payment_method}</p>
              {Number(selected.discount_amount) > 0 && (
                <p><strong>Descuento:</strong> -{formatPrice(selected.discount_amount)}</p>
              )}
              {selected.received_amount && (
                <>
                  <p><strong>Recibido:</strong> {formatPrice(selected.received_amount)}</p>
                  <p><strong>Cambio:</strong> {formatPrice(selected.change)}</p>
                </>
              )}
            </div>
            <table className="table" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '50%' }}>Producto</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>Cant.</th>
                  <th style={{ width: '15%', textAlign: 'right' }}>Precio</th>
                  <th style={{ width: '20%', textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {selected.items?.map((item, i) => (
                  <tr key={i}>
                    <td style={{ wordBreak: 'break-word' }}>{item.product?.name}</td>
                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{formatPrice(item.price)}</td>
                    <td style={{ textAlign: 'right' }}>{formatPrice(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan="3"><strong>Subtotal</strong></td><td style={{ textAlign: 'right' }}>{formatPrice(selected.subtotal)}</td></tr>
                {Number(selected.discount_amount) > 0 && (
                  <tr><td colSpan="3"><strong>Descuento</strong></td><td style={{ textAlign: 'right' }}>-{formatPrice(selected.discount_amount)}</td></tr>
                )}
                <tr><td colSpan="3"><strong>Total</strong></td><td style={{ textAlign: 'right' }}><strong>{formatPrice(selected.total)}</strong></td></tr>
              </tfoot>
            </table>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button className="btn-secondary" onClick={() => setSelected(null)}>Cerrar</button>
              <button className="btn-primary" onClick={() => window.open(`/api/sales/${selected.id}/ticket`, '_blank')}>Imprimir Ticket</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
