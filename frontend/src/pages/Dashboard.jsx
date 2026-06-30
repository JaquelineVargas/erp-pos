import { useState, useEffect } from 'react';
import api from '../services/api';
import { formatPrice } from '../utils/format';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler);

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then(({ data }) => setData(data));
  }, []);

  if (!data) return <div className="loading"><div className="spinner"></div></div>;

  const paymentLabels = data.sales_by_payment_method.map(s => s.payment_method === 'cash' ? 'Efectivo' : s.payment_method === 'card' ? 'Tarjeta' : s.payment_method);
  const paymentData = data.sales_by_payment_method.map(s => Number(s.total));

  const monthlyLabels = data.monthly_sales.map(s => {
    const [y, m] = s.month.split('-');
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${months[parseInt(m)-1]} ${y}`;
  });
  const monthlyTotals = data.monthly_sales.map(s => Number(s.total));
  const monthlyCounts = data.monthly_sales.map(s => s.count);

  const daysLabels = data.sales_last_7_days.map(s => {
    const d = new Date(s.date);
    return d.toLocaleDateString('es-MX', { weekday: 'short' });
  });
  const daysTotals = data.sales_last_7_days.map(s => Number(s.total));

  return (
    <div className="dashboard">
      {data.expiring_soon_products > 0 && (
        <div className="alert alert-warning">
          ⚠️ {data.expiring_soon_products} producto(s) están próximos a vencer
        </div>
      )}
      {data.expired_products > 0 && (
        <div className="alert alert-danger">
          🚨 {data.expired_products} producto(s) están vencidos
        </div>
      )}

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon sales">💰</div>
          <div className="kpi-info">
            <h3>Ventas Hoy</h3>
            <p className="kpi-value" title={`Bs ${Number(data.today_sales).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}>
              Bs {Number(data.today_sales).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
            </p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon count">📋</div>
          <div className="kpi-info">
            <h3>Ticket Hoy</h3>
            <p className="kpi-value">{data.sales_count}</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon products">📦</div>
          <div className="kpi-info">
            <h3>Productos</h3>
            <p className="kpi-value">{data.total_products}</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon customers">👥</div>
          <div className="kpi-info">
            <h3>Clientes</h3>
            <p className="kpi-value">{data.total_customers}</p>
          </div>
        </div>
        <div className="kpi-card warning">
          <div className="kpi-icon stock">⚠️</div>
          <div className="kpi-info">
            <h3>Stock Bajo</h3>
            <p className="kpi-value">{data.low_stock_products}</p>
          </div>
        </div>
      </div>

      {data.expiring_soon_products > 0 || data.expired_products > 0 ? (
        <div className="expiration-summary">
          <div className="mini-card warning">
            <span>Próximos a vencer</span>
            <strong>{data.expiring_soon_products}</strong>
          </div>
          <div className="mini-card danger">
            <span>Vencidos</span>
            <strong>{data.expired_products}</strong>
          </div>
        </div>
      ) : null}

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Ventas Últimos 7 Días</h3>
          <Line data={{
            labels: daysLabels,
            datasets: [{
              label: 'Ventas',
              data: daysTotals,
              borderColor: '#6c5ce7',
              backgroundColor: 'rgba(108,92,231,0.1)',
              tension: 0.4,
              fill: true,
            }]
          }} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </div>

        <div className="chart-card">
          <h3>Ventas por Método de Pago</h3>
          <Doughnut data={{
            labels: paymentLabels,
            datasets: [{
              data: paymentData,
              backgroundColor: ['#6c5ce7', '#00b894', '#fdcb6e'],
            }]
          }} />
        </div>

        <div className="chart-card full-width">
          <h3>Ventas Mensuales</h3>
          <Bar data={{
            labels: monthlyLabels,
            datasets: [
              {
                label: 'Total',
                data: monthlyTotals,
                backgroundColor: '#6c5ce7',
                borderRadius: 8,
                yAxisID: 'y',
              },
              {
                label: 'Cantidad',
                data: monthlyCounts,
                backgroundColor: '#00b894',
                borderRadius: 8,
                yAxisID: 'y1',
              }
            ]
          }} options={{
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true, position: 'left' }, y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false } } }
          }} />
        </div>
      </div>

      <div className="dashboard-bottom">
        <div className="card">
          <h3>Productos Más Vendidos</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Producto</th><th>Cant.</th><th>Total</th></tr>
              </thead>
              <tbody>
                {data.top_products.map((p, i) => (
                  <tr key={i}><td>{p.name}</td><td>{p.total_qty}</td><td>{formatPrice(p.total_sales)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3>Ventas Recientes</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Folio</th><th>Cliente</th><th>Total</th></tr>
              </thead>
              <tbody>
                {data.recent_sales.map((s) => (
                  <tr key={s.id}><td>{s.folio}</td><td>{s.customer?.name || 'Mostrador'}</td><td>{formatPrice(s.total)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
