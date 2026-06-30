import { useState } from 'react';
import api from '../services/api';
import { formatPrice } from '../utils/format';

export default function Reports() {
  const [type, setType] = useState('sales');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [search, setSearch] = useState('');
  const [alertDays, setAlertDays] = useState('');
  const generateReport = async () => {
    setLoading(true);
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      if (paymentMethod) params.payment_method = paymentMethod;
      if (search) params.search = search;
      if (type === 'purchases') params.type = 'purchase';
      if (type === 'expiring-batches' && alertDays) params.alert_days = alertDays;
      const { data: res } = await api.get(`/reports/${type === 'expiring-batches' ? 'expiring-batches' : type}`, { params });
      setData(res);
    } catch (err) {
      alert('Error al generar reporte');
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = async (exportType) => {
    try {
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      if (alertDays) params.append('alert_days', alertDays);
      if (search) params.append('search', search);
      const response = await api.get(`/exports/${exportType}`, {
        params: Object.fromEntries(params),
        responseType: 'blob',
      });
      const contentType = response.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const ext = contentType.includes('spreadsheetml') ? 'xlsx' : 'csv';
      const blob = new Blob([response.data], { type: contentType });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${exportType}_${new Date().toISOString().split('T')[0]}.${ext}`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      alert('Error al exportar');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Reportes</h2>
          {data && (
          <div className="header-actions">
            <button className="btn-primary btn-sm" onClick={() => exportExcel(type)}>Exportar Excel</button>
          </div>
        )}
      </div>

      <div className="card">
        <div className="filters">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Tipo</label>
            <select value={type} onChange={e => { setType(e.target.value); setData(null); }} className="input">
              <option value="sales">Ventas</option>
              <option value="products">Productos</option>
              <option value="customers">Clientes</option>
              <option value="purchases">Compras</option>
              <option value="expiring-batches">Lotes por Vencer</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Desde</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Hasta</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input" />
          </div>
          {type === 'sales' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Método</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="input">
                <option value="">Todos</option>
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
              </select>
            </div>
          )}
          {type === 'purchases' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Producto</label>
              <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="input" />
            </div>
          )}
          {type === 'expiring-batches' && (
            <>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Producto</label>
                <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="input" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Días alerta</label>
                <input type="number" placeholder="Ej: 30" value={alertDays} onChange={e => setAlertDays(e.target.value)} className="input" style={{ width: '100px' }} />
              </div>
            </>
          )}
          {type === 'customers' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Buscar</label>
              <input type="text" placeholder="Nombre" value={search} onChange={e => setSearch(e.target.value)} className="input" />
            </div>
          )}
          <div className="form-group" style={{ marginBottom: 0, alignSelf: 'flex-end' }}>
            <button className="btn-primary" onClick={generateReport} disabled={loading}>
              {loading ? 'Generando...' : 'Generar'}
            </button>
          </div>
        </div>
      </div>

      {data && type === 'sales' && (
        <div className="card">
          <h3>Resumen de Ventas</h3>
          <div className="kpi-grid">
            <div className="kpi-card"><h3>Total Ventas</h3><p className="kpi-value">{data.summary?.total_sales}</p></div>
            <div className="kpi-card"><h3>Ingresos</h3><p className="kpi-value">{formatPrice(data.summary?.total_revenue || 0)}</p></div>
            <div className="kpi-card"><h3>IVA</h3><p className="kpi-value">{formatPrice(data.summary?.total_tax || 0)}</p></div>
            <div className="kpi-card"><h3>Descuentos</h3><p className="kpi-value">-{formatPrice(data.summary?.total_discounts || 0)}</p></div>
            <div className="kpi-card"><h3>Promedio</h3><p className="kpi-value">{formatPrice(data.summary?.average_sale || 0)}</p></div>
          </div>

          {data.by_payment_method?.length > 0 && (
            <>
              <h3 style={{ marginTop: '16px' }}>Por Método de Pago</h3>
              <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                {data.by_payment_method.map((m, i) => (
                  <div key={i} className="kpi-card">
                    <h3>{m.method === 'cash' ? 'Efectivo' : m.method === 'card' ? 'Tarjeta' : m.method}</h3>
                    <p className="kpi-value" style={{ fontSize: '1rem' }}>{m.count} ventas — {formatPrice(m.total)}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="table-container" style={{ marginTop: '16px' }}>
            <table className="table">
              <thead><tr><th>Folio</th><th>Fecha</th><th>Cliente</th><th>Método</th><th>Descuento</th><th>Total</th></tr></thead>
              <tbody>
                {(data.sales || []).map(s => (
                  <tr key={s.id}>
                    <td>{s.folio}</td>
                    <td>{new Date(s.created_at).toLocaleDateString('es-MX')}</td>
                    <td>{s.customer?.name || 'Mostrador'}</td>
                    <td>{s.payment_method}</td>
                    <td>{Number(s.discount_amount) > 0 ? `-${formatPrice(s.discount_amount)}` : '—'}</td>
                    <td>{formatPrice(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && type === 'products' && (
        <div className="card">
          <h3>Productos Vendidos</h3>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Producto</th><th>Código</th><th>Stock</th><th>Vendidos</th><th>Ingresos</th></tr></thead>
              <tbody>
                {(data || []).map((p, i) => (
                  <tr key={i}>
                    <td>{p.name}</td>
                    <td>{p.barcode || '—'}</td>
                    <td>{p.stock}</td>
                    <td>{p.total_sold || 0}</td>
                    <td>{formatPrice(p.total_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && type === 'customers' && (
        <div className="card">
          <h3>Clientes</h3>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Nombre</th><th>Email</th><th>Compras</th><th>Total Gastado</th></tr></thead>
              <tbody>
                {((data.data || data) || []).map(c => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.email || '—'}</td>
                    <td>{c.sales_count || 0}</td>
                    <td>{formatPrice(c.sales_sum_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && type === 'purchases' && (
        <div className="card">
          <h3>Resumen de Compras</h3>
          <div className="kpi-grid">
            <div className="kpi-card"><h3>Compras</h3><p className="kpi-value">{data.summary?.total_purchases}</p></div>
            <div className="kpi-card"><h3>Total Udds.</h3><p className="kpi-value">{Number(data.summary?.total_quantity || 0).toFixed(3).replace(/\.?0+$/, '')}</p></div>
            <div className="kpi-card"><h3>Costo Total</h3><p className="kpi-value">{formatPrice(data.summary?.total_cost || 0)}</p></div>
          </div>
          <div className="table-container" style={{ marginTop: '16px' }}>
            <table className="table">
              <thead><tr><th>Fecha/Hora</th><th>Producto</th><th>Lote</th><th>Tipo</th><th>Cantidad</th><th>Costo Ud.</th><th>Total</th><th>Factura/OC</th><th>Usuario</th></tr></thead>
              <tbody>
                {(data.data || []).map(m => (
                  <tr key={m.id}>
                    <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                      {new Date(m.created_at).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      {m.product?.name || '—'}
                      {m.product?.barcode && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.product.barcode}</span>}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{m.batch?.batch_code || '—'}</td>
                    <td><span className="badge badge-success">Compra</span></td>
                    <td>{m.conversion ? `${(Number(m.quantity) / Number(m.conversion.factor)).toFixed(3).replace(/\.?0+$/, '')} ${m.conversion.name}` : `${Number(m.quantity).toFixed(3).replace(/\.?0+$/, '')} ${m.product?.base_unit || 'ud.'}`}</td>
                    <td>{m.unit_cost ? formatPrice(m.unit_cost) : '—'}</td>
                    <td>{m.purchase_price != null ? formatPrice(m.purchase_price) : formatPrice((Number(m.quantity) || 0) * (Number(m.unit_cost) || 0))}</td>
                    <td style={{ fontSize: '0.85rem' }}>{m.reference_id || '—'}</td>
                    <td style={{ fontSize: '0.85rem' }}>{m.user?.name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!data.data || data.data.length === 0) && (
              <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Sin compras registradas</p>
            )}
          </div>
        </div>
      )}

      {data && type === 'expiring-batches' && (
        <div className="card">
          <h3>Resumen de Lotes por Vencer</h3>
          <div className="kpi-grid">
            <div className="kpi-card"><h3>Lotes Vencidos</h3><p className="kpi-value" style={{ color: 'var(--danger)' }}>{data.summary?.total_expired}</p></div>
            <div className="kpi-card"><h3>Lotes por Vencer</h3><p className="kpi-value" style={{ color: 'var(--warning)' }}>{data.summary?.total_expiring_soon}</p></div>
            <div className="kpi-card"><h3>Productos Afectados</h3><p className="kpi-value">{data.summary?.affected_products}</p></div>
            <div className="kpi-card"><h3>Total en Riesgo</h3><p className="kpi-value">{Number(data.summary?.total_quantity_at_risk || 0).toFixed(3).replace(/\.?0+$/, '')} uds.</p></div>
          </div>

          {data.expired?.length > 0 && (
            <>
              <h4 style={{ marginTop: '16px', color: 'var(--danger)' }}>Vencidos ({data.expired.length})</h4>
              <div className="table-container">
                <table className="table">
                  <thead><tr><th>Producto</th><th>Lote</th><th>Vencimiento</th><th>Stock</th><th>Días vencido</th></tr></thead>
                  <tbody>
                    {data.expired.map(b => (
                      <tr key={b.id}>
                        <td>{b.product_name}{b.product_barcode && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.product_barcode}</span>}</td>
                        <td style={{ fontFamily: 'monospace' }}>{b.batch_code}</td>
                        <td>{b.expiration_date}</td>
                        <td>{Number(b.current_quantity).toFixed(3).replace(/\.?0+$/, '')}</td>
                        <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{Math.abs(b.days_left)} días</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {data.expiring_soon?.length > 0 && (
            <>
              <h4 style={{ marginTop: '16px', color: 'var(--warning)' }}>Próximos a Vencer ({data.expiring_soon.length})</h4>
              <div className="table-container">
                <table className="table">
                  <thead><tr><th>Producto</th><th>Lote</th><th>Vencimiento</th><th>Stock</th><th>Días restantes</th></tr></thead>
                  <tbody>
                    {data.expiring_soon.map(b => (
                      <tr key={b.id}>
                        <td>{b.product_name}{b.product_barcode && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.product_barcode}</span>}</td>
                        <td style={{ fontFamily: 'monospace' }}>{b.batch_code}</td>
                        <td>{b.expiration_date}</td>
                        <td>{Number(b.current_quantity).toFixed(3).replace(/\.?0+$/, '')}</td>
                        <td style={{ color: 'var(--warning)', fontWeight: 600 }}>{b.days_left} días</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {(!data.expired?.length && !data.expiring_soon?.length) && (
            <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No hay lotes vencidos o próximos a vencer</p>
          )}
        </div>
      )}
    </div>
  );
}
