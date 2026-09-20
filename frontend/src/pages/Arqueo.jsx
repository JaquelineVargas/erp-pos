import { useState, useEffect } from 'react';
import { useArqueo } from '../contexts/ArqueoContext';
import api from '../services/api';
import { formatPrice } from '../utils/format';

export default function Arqueo() {
  const { arqueo, setOpen, setClosed, refresh } = useArqueo();
  const [initialAmount, setInitialAmount] = useState('');
  const [finalAmount, setFinalAmount] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [movementForm, setMovementForm] = useState({ type: 'manual_income', description: '', amount: '' });
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [movementError, setMovementError] = useState('');
  const [addingMovement, setAddingMovement] = useState(false);
  const [loading, setLoading] = useState(true);
  const [closeError, setCloseError] = useState('');
  const [openError, setOpenError] = useState('');
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => { refresh(); }, [refresh]);

  const loadHistory = async () => {
    try {
      const { data } = await api.get('/arqueos');
      setHistory(data.data || data);
    } catch {}
  };

  const openArqueo = async () => {
    if (!initialAmount) return alert('Ingresa el monto inicial');
    if (opening) return;
    setOpening(true);
    setOpenError('');
    try {
      const { data } = await api.post('/arqueo/open', { initial_amount: Number(initialAmount) });
      setInitialAmount('');
      setOpen(data);
    } catch (err) {
      setOpenError(err.response?.data?.message || 'Error al abrir arqueo');
    } finally {
      setOpening(false);
    }
  };

  const closeArqueo = async () => {
    if (closing) return;
    if (!finalAmount) return alert('⚠️ Ingresa el monto final antes de cerrar el arqueo');
    setClosing(true);
    setCloseError('');
    try {
      await api.post('/arqueo/close', { final_amount: Number(finalAmount), notes: closeNotes });
      setClosed();
      setFinalAmount('');
      setCloseNotes('');
    } catch (err) {
      setCloseError(err.response?.data?.message || 'Error al cerrar arqueo');
    } finally {
      setClosing(false);
    }
  };

  const addMovement = async (e) => {
    e.preventDefault();
    if (addingMovement) return;
    setAddingMovement(true);
    setMovementError('');
    try {
      await api.post('/arqueo/movement', {
        type: movementForm.type,
        description: movementForm.description,
        amount: Number(movementForm.amount),
      });
      setMovementForm({ type: 'manual_income', description: '', amount: '' });
      refresh();
    } catch (err) {
      setMovementError(err.response?.data?.message || 'Error al registrar movimiento');
    } finally {
      setAddingMovement(false);
    }
  };

  const viewHistory = () => {
    loadHistory();
    setShowHistory(true);
  };

  const stateLabel = (state) => {
    const labels = { pending: 'Pendiente', cuadrado: 'Cuadrado', sobrante: 'Sobrante', faltante: 'Faltante' };
    return labels[state] || state;
  };

  if (loading) {
    return <div className="page"><p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando...</p></div>;
  }

  if (!arqueo) {
    return (
      <div className="page">
        <div className="page-header">
          <h2>Arqueo</h2>
          <button className="btn-secondary" onClick={viewHistory}>Historial</button>
        </div>
        <div className="card center-card">
          <h3>Abrir Arqueo</h3>
          {openError && <div className="alert alert-danger">{openError}</div>}
          <div className="form-group">
            <label>Monto Inicial en Efectivo</label>
            <input type="number" step="0.01" value={initialAmount} onChange={e => setInitialAmount(e.target.value)} placeholder="0.00" autoFocus />
          </div>
          <button className="btn-primary btn-full" onClick={openArqueo} disabled={!initialAmount || opening}>{opening ? 'Abriendo...' : 'Abrir Arqueo'}</button>
        </div>

        {showHistory && (
          <div className="modal-overlay" onClick={() => setShowHistory(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px' }}>
              <h3>Historial de Arqueos</h3>
              <div className="table-container">
                <table className="table">
                  <thead><tr><th>Usuario</th><th>Apertura</th><th>Cierre</th><th>Inicial</th><th>V. Efectivo</th><th>V. Digital</th><th>Esperado</th><th>Final</th><th>Diferencia</th><th>Estado</th></tr></thead>
                  <tbody>
                    {history.map(r => (
                      <tr key={r.id}>
                        <td>{r.user?.name}</td>
                        <td>{r.opened_at ? new Date(r.opened_at).toLocaleString('es-MX') : '—'}</td>
                        <td>{r.closed_at ? new Date(r.closed_at).toLocaleString('es-MX') : '—'}</td>
                        <td>{formatPrice(r.initial_amount)}</td>
                        <td>{formatPrice(r.cash_sales)}</td>
                        <td>{formatPrice((Number(r.card_sales || 0) + Number(r.transfer_sales || 0) + Number(r.qr_sales || 0)))}</td>
                        <td>{formatPrice(r.expected_cash)}</td>
                        <td>{formatPrice(r.final_amount)}</td>
                        <td className={
                          r.cash_difference < 0 ? 'text-danger' : r.cash_difference > 0 ? 'text-success' : ''
                        }>
                          {formatPrice(r.cash_difference)}
                        </td>
                        <td>{stateLabel(r.state)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="btn-secondary" onClick={() => setShowHistory(false)}>Cerrar</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const live = arqueo.live_breakdown || {};
  const movements = arqueo.movements || [];
  const expectedCash = Number(arqueo.initial_amount || 0) + Number(live.cash_sales || 0) + Number(live.manual_income || 0) - Number(live.expenses || 0) - Number(live.returns || 0);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Arqueo — Abierto</h2>
        <button className="btn-danger" onClick={() => document.getElementById('close-section').scrollIntoView({ behavior: 'smooth' })}>
          Cerrar Arqueo
        </button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <h3>Inicial</h3>
          <p className="kpi-value">{formatPrice(arqueo.initial_amount)}</p>
        </div>
        <div className="kpi-card">
          <h3>Ventas Efectivo</h3>
          <p className="kpi-value">{formatPrice(live.cash_sales)}</p>
        </div>
        <div className="kpi-card">
          <h3>Ventas Digital</h3>
          <p className="kpi-value">{formatPrice((Number(live.card_sales || 0) + Number(live.transfer_sales || 0) + Number(live.qr_sales || 0)))}</p>
        </div>
        <div className="kpi-card">
          <h3>Ingresos Manuales</h3>
          <p className="kpi-value text-success">+{formatPrice(live.manual_income)}</p>
        </div>
        <div className="kpi-card">
          <h3>Gastos</h3>
          <p className="kpi-value text-danger">-{formatPrice(live.expenses)}</p>
        </div>
        <div className="kpi-card">
          <h3>Efectivo Esperado</h3>
          <p className="kpi-value">{formatPrice(expectedCash)}</p>
        </div>
        <div className="kpi-card">
          <h3>Ventas Realizadas</h3>
          <p className="kpi-value">{live.total_sales_count || 0}</p>
        </div>
      </div>

      {arqueo.state && arqueo.state !== 'pending' && (
        <div className={`alert alert-${arqueo.state === 'cuadrado' ? 'success' : arqueo.state === 'sobrante' ? 'warning' : 'danger'}`}>
          Arqueo {stateLabel(arqueo.state)} — Diferencia: {formatPrice(arqueo.cash_difference)}
        </div>
      )}

      <div className="card">
        <h3>Ventas por Método de Pago</h3>
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          {[['cash_sales', 'Efectivo'], ['card_sales', 'Tarjeta'], ['transfer_sales', 'Transferencia'], ['qr_sales', 'QR']].map(([key, label]) => (
            <div key={key} className="kpi-card" style={{ padding: '12px' }}>
              <h3>{label}</h3>
              <p style={{ color: 'var(--success)', fontWeight: 600 }}>{formatPrice(live[key])}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Agregar Movimiento</h3>
        {movementError && <div className="alert alert-danger">{movementError}</div>}
        <form onSubmit={addMovement} className="form-row">
          <select value={movementForm.type} onChange={e => setMovementForm({...movementForm, type: e.target.value})} className="input">
            <option value="manual_income">Ingreso Manual</option>
            <option value="expense">Gasto</option>
            <option value="withdrawal">Retiro</option>
          </select>
          <input type="text" placeholder="Descripción" value={movementForm.description} onChange={e => setMovementForm({...movementForm, description: e.target.value})} className="input" required />
          <input type="number" step="0.01" placeholder="Monto" value={movementForm.amount} onChange={e => setMovementForm({...movementForm, amount: e.target.value})} className="input" required />
          <button type="submit" className="btn-primary" disabled={addingMovement}>{addingMovement ? 'Guardando...' : 'Agregar'}</button>
        </form>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr><th>Tipo</th><th>Descripción</th><th>Monto</th><th>Fecha</th></tr></thead>
          <tbody>
            {movements.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Sin movimientos</td></tr>
            ) : movements.map(m => (
              <tr key={m.id} className={['expense', 'withdrawal'].includes(m.type) ? 'row-danger' : 'row-success'}>
                <td>{m.type === 'manual_income' ? 'Ingreso' : m.type === 'expense' ? 'Gasto' : m.type === 'withdrawal' ? 'Retiro' : m.type}</td>
                <td>{m.description || '—'}</td>
                <td>{formatPrice(m.amount)}</td>
                <td>{new Date(m.created_at).toLocaleString('es-MX')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div id="close-section" className="card" style={{ border: '2px solid var(--danger)' }}>
        <h3 style={{ color: 'var(--danger)' }}>Cerrar Arqueo</h3>
        {closeError && <div className="alert alert-danger">{closeError}</div>}
        <div className="kpi-grid" style={{ marginBottom: '16px' }}>
          <div className="kpi-card" style={{ padding: '12px' }}><h3>Total Ventas</h3><p className="kpi-value">{formatPrice((Number(live.cash_sales || 0) + Number(live.card_sales || 0) + Number(live.transfer_sales || 0) + Number(live.qr_sales || 0)))}</p></div>
          <div className="kpi-card" style={{ padding: '12px' }}><h3>Efectivo Esperado</h3><p className="kpi-value">{formatPrice(expectedCash)}</p></div>
          <div className="kpi-card" style={{ padding: '12px' }}><h3>Ventas Realizadas</h3><p className="kpi-value">{live.total_sales_count || 0}</p></div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Monto Final en Efectivo</label>
            <input type="number" step="0.01" value={finalAmount} onChange={e => setFinalAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="form-group">
            <label>Notas</label>
            <textarea value={closeNotes} onChange={e => setCloseNotes(e.target.value)} rows="2" placeholder="Observaciones..." />
          </div>
        </div>
        <button className="btn-danger btn-full" onClick={closeArqueo} disabled={closing}>
          Confirmar Cierre de Arqueo
        </button>
      </div>
    </div>
  );
}
