import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { formatPrice } from '../utils/format';

const formatStock = (value, inventoryType) => {
  const num = Number(value);
  if (isNaN(num)) return '0';
  if (inventoryType === 'unit') return Math.round(num).toString();
  return num.toFixed(3).replace(/\.?0+$/, '');
};

const getItemEffectiveValues = (item) => {
  if (item.conversion_id && item.conversions?.length > 0) {
    const conv = item.conversions.find(c => c.id === item.conversion_id);
    if (conv) {
      const factor = Number(conv.factor);
      return {
        unitLabel: conv.name,
        unitPrice: item.price * factor,
        subtotal: item.quantity * item.price * factor,
      };
    }
  }
  return {
    unitLabel: item.base_unit,
    unitPrice: item.price,
    subtotal: item.quantity * item.price,
  };
};

export default function POS() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [barcode, setBarcode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerId, setCustomerId] = useState('');
  const [customers, setCustomers] = useState([]);
  const [showTicket, setShowTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [discountType, setDiscountType] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [qtyInputs, setQtyInputs] = useState({});
  const [arqueo, setArqueo] = useState(null);
  const [showArqueoModal, setShowArqueoModal] = useState(false);
  const [arqueoInitialAmount, setArqueoInitialAmount] = useState('');
  const [arqueoOpening, setArqueoOpening] = useState(false);
  const [arqueoChecked, setArqueoChecked] = useState(false);
  const barcodeRef = useRef(null);

  useEffect(() => {
    api.get('/products?per_page=50&is_active=1').then(({ data }) => setProducts(data.data || data));
    api.get('/customers?per_page=100').then(({ data }) => setCustomers(data.data || data));
    api.get('/arqueo/current', { params: { _: Date.now() } })
      .then(({ data }) => { setArqueo(data?.id ? data : null); setArqueoChecked(true); })
      .catch(() => { setArqueo(null); setArqueoChecked(true); });
  }, []);

  const openArqueoFromPos = async () => {
    if (!arqueoInitialAmount) return;
    setArqueoOpening(true);
    try {
      await api.post('/arqueo/open', { initial_amount: Number(arqueoInitialAmount) });
      const { data } = await api.get('/arqueo/current', { params: { _: Date.now() } });
      setArqueo(data?.id ? data : null);
      setArqueoChecked(true);
      setShowArqueoModal(false);
      setArqueoInitialAmount('');
    } catch (err) {
      alert(err.response?.data?.message || 'Error al abrir arqueo');
    } finally {
      setArqueoOpening(false);
    }
  };

  useEffect(() => {
    if (barcode.length >= 8) {
      handleBarcodeSearch(barcode);
    }
  }, [barcode]);

  const handleBarcodeSearch = async (code) => {
    try {
      const { data } = await api.get(`/products/barcode/${code}`);
      addToCart(data);
      setBarcode('');
    } catch { setBarcode(''); }
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        const newQty = existing.is_weight_or_volume ? existing.quantity + 0.5 : existing.quantity + 1;
        return prev.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: newQty }
            : item
        );
      }
      const newItem = {
        product_id: product.id,
        name: product.name,
        price: Number(product.selling_price),
        quantity: 1,
        inventory_type: product.inventory_type || 'unit',
        base_unit: product.base_unit || 'ud.',
        is_weight_or_volume: product.inventory_type === 'weight' || product.inventory_type === 'volume',
        conversion_id: null,
        conversions: product.conversions || [],
      };
      return [...prev, newItem];
    });
  };

  const updateQty = (productId, qty) => {
    const item = cart.find(i => i.product_id === productId);
    const num = (item?.is_weight_or_volume ? parseFloat(qty) : parseInt(qty)) || 0;
    if (num <= 0) {
      setCart(prev => prev.filter(item => item.product_id !== productId));
      return;
    }
    setCart(prev => prev.map(item =>
      item.product_id === productId
        ? { ...item, quantity: num }
        : item
    ));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const handleQtyChange = (productId, rawValue) => {
    setQtyInputs(prev => ({ ...prev, [productId]: rawValue }));
  };

  const handleQtyBlur = (productId, currentQty) => {
    const raw = qtyInputs[productId];
    if (raw === undefined || raw === '') {
      setQtyInputs(prev => { const n = { ...prev }; delete n[productId]; return n; });
      return;
    }
    const item = cart.find(i => i.product_id === productId);
    const num = (item?.is_weight_or_volume ? parseFloat(raw) : parseInt(raw, 10));
    if (isNaN(num) || num <= 0) {
      setQtyInputs(prev => { const n = { ...prev }; delete n[productId]; return n; });
      return;
    }
    updateQty(productId, num);
    setQtyInputs(prev => { const n = { ...prev }; delete n[productId]; return n; });
  };

  const subtotal = cart.reduce((sum, item) => sum + getItemEffectiveValues(item).subtotal, 0);

  let discountAmount = 0;
  if (discountType === 'fixed') {
    discountAmount = Math.min(Number(discountValue) || 0, subtotal);
  } else if (discountType === 'percentage') {
    discountAmount = subtotal * ((Number(discountValue) || 0) / 100);
  }

  const total = Math.max(0, subtotal - discountAmount);

  const received = Number(receivedAmount) || 0;
  const change = received >= total ? received - total : 0;

  const handleSale = async () => {
    if (cart.length === 0 || loading) return;
    setLoading(true);
    try {
      const payload = {
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          conversion_id: item.conversion_id || null,
        })),
        payment_method: paymentMethod,
        customer_id: customerId || null,
        received_amount: received || null,
        discount_type: discountType || null,
        discount_value: discountValue ? Number(discountValue) : 0,
      };
      const { data } = await api.post('/sales', payload);
      setShowTicket(data);
      setCart([]);
      setSearch('');
      setReceivedAmount('');
      setDiscountType('');
      setDiscountValue('');
      setCustomerId('');
      api.get('/products?per_page=50').then(({ data }) => setProducts(data.data || data));
    } catch (err) {
      alert(err.response?.data?.message || 'Error al procesar venta');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!showTicket) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/sales/${showTicket.id}/ticket?format=pdf&width=80`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) { alert('Error al descargar PDF'); return; }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${showTicket.folio}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { alert('Error al descargar PDF'); }
  };

  const handlePrint = async () => {
    if (!showTicket) return;
    setPrinting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/sales/${showTicket.id}/ticket?format=html`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
      const content = `
        <html>
        <head>
          <style>
            @page { margin: 0; padding: 0; }
            body { font-family: "Courier", monospace; font-size: 12px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>${data.html}</body>
        </html>
      `;
      iframe.contentDocument.open();
      iframe.contentDocument.write(content);
      iframe.contentDocument.close();
      iframe.onload = () => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          setPrinting(false);
        }, 100);
      };
    } catch {
      alert('Error al imprimir');
      setPrinting(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode && p.barcode.includes(search)) || (p.brand && p.brand.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="pos-page">
      {arqueoChecked && !arqueo && (
        <div className="alert alert-warning" style={{ margin: '8px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gridColumn: '1 / -1', flexShrink: 0 }}>
          <span>Debes abrir un arqueo antes de realizar ventas</span>
          <button className="btn-primary btn-sm" onClick={() => setShowArqueoModal(true)}>Abrir Arqueo</button>
        </div>
      )}
      <div className="pos-left">
        <div className="pos-search">
          <input
            ref={barcodeRef}
            type="text"
            placeholder="Código de barras..."
            value={barcode}
            onChange={e => setBarcode(e.target.value)}
            className="input barcode-input"
            autoFocus
          />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input"
          />
        </div>
        <div className="product-grid">
          {filteredProducts.map(p => (
            <div key={p.id} className={`product-card ${p.current_stock <= 0 ? 'out-of-stock' : ''}`}
              onClick={() => p.current_stock > 0 && addToCart(p)}>
              <div className="product-card-body">
                <h4>{p.name}</h4>
                {p.brand && <span className="product-brand">{p.brand}</span>}
                {p.barcode && <span className="product-barcode">{p.barcode}</span>}
                <p className="product-price">{formatPrice(p.selling_price)} / <small>{p.base_unit || 'ud.'}</small></p>
                <span className={`stock-badge ${p.current_stock <= p.min_stock ? 'low' : 'ok'}`}>
                  Stock: {formatStock(p.current_stock, p.inventory_type)} {p.base_unit || ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pos-right">
        <div className="cart-header">
          <h3>Carrito ({cart.length})</h3>
          <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="input">
            <option value="">Cliente Mostrador</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="cart-items">
          <table className="cart-table">
            <thead>
              <tr>
                <th className="cart-th-prod">Producto</th>
                <th className="cart-th-qty">Cantidad</th>
                <th className="cart-th-price">P/U</th>
                <th className="cart-th-subtotal">Subtotal</th>
                <th className="cart-th-action"></th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item, i) => (
                <tr key={i}>
                  <td className="cart-td-name" title={item.name}>
                    {item.name}
                    <span className="cart-unit">{getItemEffectiveValues(item).unitLabel}</span>
                    {item.conversions?.length > 0 && (
                      <select className="input compact" style={{ display: 'block', marginTop: 4, fontSize: '0.75rem', padding: '2px 4px' }}
                        value={item.conversion_id || ''}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          setCart(prev => prev.map(it => it.product_id === item.product_id ? { ...it, conversion_id: val } : it));
                        }}>
                        <option value="">{item.base_unit}</option>
                        {item.conversions.map(c => (
                          <option key={c.id || c.name} value={c.id}>1 {c.name} = {c.factor} {item.base_unit}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="cart-td-qty">
                    <div className="cart-qty-wrapper">
                      <button className="btn-qty" onClick={() => updateQty(item.product_id, Math.max(0.001, item.quantity - (item.is_weight_or_volume ? 0.5 : 1)))}>−</button>
                      <input
                        type="number"
                        min="0.001"
                        step={item.is_weight_or_volume ? '0.5' : '1'}
                        value={qtyInputs[item.product_id] ?? item.quantity}
                        onChange={(e) => handleQtyChange(item.product_id, e.target.value)}
                        onBlur={() => handleQtyBlur(item.product_id, item.quantity)}
                        className="qty-input"
                      />
                      <button className="btn-qty" onClick={() => updateQty(item.product_id, item.quantity + (item.is_weight_or_volume ? 0.5 : 1))}>+</button>
                    </div>
                  </td>
                  <td className="cart-td-price">{formatPrice(getItemEffectiveValues(item).unitPrice)}</td>
                  <td className="cart-td-subtotal">{formatPrice(getItemEffectiveValues(item).subtotal)}</td>
                  <td className="cart-td-action">
                    <button className="btn-remove" onClick={() => removeFromCart(item.product_id)}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {cart.length === 0 && <div className="cart-empty">Agrega productos al carrito</div>}
        </div>

        <div className="cart-footer">
          <div className="cart-totals">
            {discountAmount > 0 && (
              <span className="total-row">
                <span>Desc: -{formatPrice(discountAmount)}</span>
              </span>
            )}
            <span className="total-final">Total: {formatPrice(total)}</span>
          </div>

          <div className="cart-payment">
            <div className="payment-row">
              <div className="payment-field">
                <input
                  type="number" step="0.01" min="0"
                  value={receivedAmount}
                  onChange={e => setReceivedAmount(e.target.value)}
                  placeholder="Recibido"
                  className="input compact"
                />
              </div>
              <div className="payment-change">{formatPrice(change)}</div>
              <div className="payment-field">
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="input compact">
                  <option value="cash">Efec.</option>
                  <option value="card">Tarj.</option>
                  <option value="transfer">Transf.</option>
                  <option value="qr">QR</option>
                </select>
              </div>
            </div>

            <div className="discount-section">
              <select value={discountType} onChange={e => { setDiscountType(e.target.value); setDiscountValue(''); }} className="input compact">
                <option value="">Sin desc.</option>
                <option value="fixed">Bs fijo</option>
                <option value="percentage">%</option>
              </select>
              {discountType && (
                <input
                  type="number" step={discountType === 'fixed' ? '0.01' : '1'}
                  min="0" max={discountType === 'percentage' ? '100' : ''}
                  value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                  placeholder={discountType === 'fixed' ? 'Monto' : '%'}
                  className="input compact"
                />
              )}
            </div>

            <div className="cart-actions">
              <button className="btn-primary btn-pay" onClick={handleSale} disabled={cart.length === 0 || loading || !arqueo}>
                {loading ? '...' : !arqueo ? 'Abrir arqueo primero' : `Cobrar ${formatPrice(total)}`}
              </button>
              <button className="btn-secondary btn-sm" onClick={() => { setCart([]); setReceivedAmount(''); setDiscountType(''); setDiscountValue(''); setPromoDiscount(0); setActivePromos([]); }} disabled={cart.length === 0}>
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      {showArqueoModal && (
        <div className="modal-overlay" onClick={() => setShowArqueoModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3>Abrir Arqueo</h3>
            <div className="form-group">
              <label>Monto Inicial en Efectivo</label>
              <input type="number" step="0.01" value={arqueoInitialAmount}
                onChange={e => setArqueoInitialAmount(e.target.value)}
                placeholder="0.00" autoFocus />
            </div>
            <button className="btn-primary btn-full" onClick={openArqueoFromPos}
              disabled={!arqueoInitialAmount || arqueoOpening}>
              {arqueoOpening ? 'Abriendo...' : 'Abrir Arqueo'}
            </button>
            <button className="btn-secondary btn-full" onClick={() => setShowArqueoModal(false)}
              style={{ marginTop: '8px' }}>Cancelar</button>
          </div>
        </div>
      )}

      {showTicket && (
        <div className="modal-overlay" onClick={() => setShowTicket(null)}>
          <div className="modal ticket-modal" onClick={e => e.stopPropagation()}>
            <div className="ticket">
              <h2>ERP POS</h2>
              <p className="ticket-folio">{showTicket.folio}</p>
              <p className="ticket-date">{new Date(showTicket.created_at).toLocaleString('es-MX')}</p>
              <hr />
              <div className="ticket-items-header">
                <span className="ticket-th-prod">Producto</span>
                <span className="ticket-th-qty">Cant</span>
                <span className="ticket-th-total">Total</span>
              </div>
              <hr />
              {showTicket.items?.map((item, i) => (
                <div key={i} className="ticket-item">
                  <span className="ticket-td-prod">{item.product?.name}</span>
                  <span className="ticket-td-qty">{item.quantity}</span>
                  <span className="ticket-td-total">{formatPrice(item.subtotal)}</span>
                </div>
              ))}
              <hr />
              <div className="ticket-totals">
                {Number(showTicket.discount_amount) > 0 && (
                  <p>Descuento: -{formatPrice(showTicket.discount_amount)}</p>
                )}
                <p className="ticket-total">Total: {formatPrice(showTicket.total)}</p>
                {showTicket.received_amount && (
                  <>
                    <p>Recibido: {formatPrice(showTicket.received_amount)}</p>
                    <p>Cambio: {formatPrice(showTicket.change)}</p>
                  </>
                )}
              </div>
              <p className="ticket-footer">¡Gracias por su compra!</p>
            </div>
            <div className="ticket-actions">
              <button className="btn-secondary btn-sm" onClick={handleDownloadPdf}>PDF</button>
              <button className="btn-secondary btn-sm" onClick={handlePrint} disabled={printing}>{printing ? 'Imprimiendo...' : 'Imprimir'}</button>
              <button className="btn-primary" onClick={() => setShowTicket(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
