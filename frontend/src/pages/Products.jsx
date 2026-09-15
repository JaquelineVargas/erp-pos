import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatPrice } from '../utils/format';

const STOCK_TYPES = [
  { value: 'unit', label: 'Unidad', symbol: 'ud.' },
  { value: 'weight', label: 'Peso (kg)', symbol: 'kg' },
  { value: 'volume', label: 'Volumen (L)', symbol: 'L' },
];

const TYPE_UNITS = { unit: 'ud.', weight: 'kg', volume: 'L' };

const formatStock = (value, inventoryType) => {
  const num = Number(value);
  if (isNaN(num)) return '0';
  if (inventoryType === 'unit') return Math.round(num).toString();
  return num.toFixed(3).replace(/\.?0+$/, '');
};

const emptyForm = () => ({
  name: '', sku: '', barcode: '', brand: '', description: '',
  category_id: '', inventory_type: 'unit', base_unit: 'ud.',
  purchase_price: '', selling_price: '',
  current_stock: '0', min_stock: '0',
  track_stock: true, track_batches: false,
  track_conversions: false,
  batch_generation: '', expiration_alert_days: '30',
  is_active: true, image: '',
  initial_batch_code: '', initial_batch_expiration: '',
  initial_batch_cost: '', initial_batch_notes: '',
});

export default function Products() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [catFilter, setCatFilter] = useState(searchParams.get('category_id') || '');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '');
  const [lowStockFilter, setLowStockFilter] = useState(searchParams.get('low_stock') === '1');
  const [batchExpiryFilter, setBatchExpiryFilter] = useState(searchParams.get('batch_expiry') || '');
  const [form, setForm] = useState(emptyForm());
  const [conversions, setConversions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [detailProduct, setDetailProduct] = useState(null);
  const [showMovements, setShowMovements] = useState(null);
  const [movementsData, setMovementsData] = useState({ data: [], current_page: 1, last_page: 1 });
  const [movementsFilters, setMovementsFilters] = useState({ from: '', to: '' });
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ type: 'in', quantity: '', reason: '', notes: '', batch_id: '', physical_stock: '' });
  const [adjusting, setAdjusting] = useState(false);
  const [adjustBatches, setAdjustBatches] = useState([]);
  const [adjustBatchStocks, setAdjustBatchStocks] = useState({});
  const [movementsPage, setMovementsPage] = useState(1);
  const [restockProduct, setRestockProduct] = useState(null);
  const [restockForm, setRestockForm] = useState({ quantity: '', type: 'purchase', unit_cost: '', notes: '', reference: '', batch_option: 'none', batch_id: '', batch_code: '', batch_expiration: '', conversion_id: '' });
  const [restocking, setRestocking] = useState(false);
  const [restockBatches, setRestockBatches] = useState([]);
  const [restockConversions, setRestockConversions] = useState([]);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [lastPage, setLastPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [dropdownUp, setDropdownUp] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [toggling, setToggling] = useState(false);
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('products.create');
  const canEdit = hasPermission('products.edit');
  const canAdjust = hasPermission('inventory.adjust');
  const canRestock = hasPermission('inventory.restock');

  const baseStep = form.inventory_type === 'unit' ? '1' : '0.001';

  useEffect(() => {
    loadProducts();
    api.get('/categories').then(({ data }) => setCategories(data));
  }, [page, search, catFilter, typeFilter, lowStockFilter, batchExpiryFilter]);

  useEffect(() => {
    const handler = () => setOpenDropdown(null);
    const scrollHandler = () => setOpenDropdown(null);
    document.addEventListener('click', handler);
    document.addEventListener('scroll', scrollHandler, true);
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('scroll', scrollHandler, true);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (catFilter) params.set('category_id', catFilter);
    if (typeFilter) params.set('type', typeFilter);
    if (lowStockFilter) params.set('low_stock', '1');
    if (batchExpiryFilter) params.set('batch_expiry', batchExpiryFilter);
    if (page > 1) params.set('page', page.toString());
    const qs = params.toString();
    if (qs !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [search, catFilter, typeFilter, lowStockFilter, batchExpiryFilter, page]);

  const loadProducts = (p) => {
    const params = { per_page: 50, page: p || page };
    if (search) params.search = search;
    if (catFilter) params.category_id = catFilter;
    if (typeFilter) params.inventory_type = typeFilter;
    if (lowStockFilter) params.low_stock = true;
    if (batchExpiryFilter) params.batch_expiry = batchExpiryFilter;
    api.get('/products', { params }).then(({ data }) => {
      setProducts(data.data || data);
      if (data.data) {
        setPage(data.current_page);
        setLastPage(data.last_page);
        setTotalProducts(data.total);
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        current_stock: Number(form.current_stock) || 0,
        min_stock: Number(form.min_stock) || 0,
        purchase_price: Number(form.purchase_price) || 0,
        selling_price: Number(form.selling_price) || 0,
        expiration_alert_days: Number(form.expiration_alert_days) || 30,
      };
      if (!editing && payload.track_batches) {
        const initialStock = Number(payload.initial_batch_stock) || 0;
        payload.current_stock = initialStock;
        payload.initial_batch_cost = initialStock > 0
          ? Number(payload.purchase_price) / initialStock
          : 0;
      }
      delete payload.image;

      if (editing) {
        delete payload.initial_batch_code;
        delete payload.initial_batch_expiration;
        delete payload.initial_batch_stock;
        delete payload.initial_batch_cost;
        delete payload.initial_batch_notes;
        const { data } = await api.put(`/products/${editing.id}`, payload);
        setEditing(data);
        await saveConversions(data.id);
      } else {
        const { data } = await api.post('/products', payload);
        await saveConversions(data.id);
      }

      setShowForm(false);
      setEditing(null);
      setForm(emptyForm());
      setConversions([]);
      loadProducts(1);
      setPage(1);
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar producto');
    } finally {
      setSubmitting(false);
    }
  };

  const saveConversions = async (productId) => {
    const existing = editing ? await api.get(`/products/${editing.id}/conversions`).then(r => r.data) : [];
    for (const c of conversions) {
      if (c.id) {
        const orig = existing.find(e => e.id === c.id);
        if (JSON.stringify(orig) !== JSON.stringify({ ...orig, ...c })) {
          await api.put(`/conversions/${c.id}`, c);
        }
      } else {
        await api.post(`/products/${productId}/conversions`, c);
      }
    }
    for (const e of existing) {
      if (!conversions.find(c => c.id === e.id)) {
        await api.delete(`/conversions/${e.id}`);
      }
    }
  };

  const editProduct = async (p) => {
    if (!canEdit) return;
    const res = await api.get(`/products/${p.id}`);
    const product = res.data;
    setForm({
      name: product.name, sku: product.sku || '', barcode: product.barcode || '',
      brand: product.brand || '', description: product.description || '',
      category_id: product.category_id || '', inventory_type: product.inventory_type || 'unit',
      base_unit: product.base_unit || TYPE_UNITS[product.inventory_type] || 'ud.',
      purchase_price: product.purchase_price || '', selling_price: product.selling_price,
      current_stock: product.current_stock, min_stock: product.min_stock,
      track_stock: product.track_stock !== false,
      track_batches: !!product.track_batches,
      track_conversions: !!product.track_conversions,
      batch_generation: product.batch_generation || '',
      expiration_alert_days: product.expiration_alert_days || '30',
      is_active: product.is_active !== false, image: product.image || '',
      initial_batch_code: '', initial_batch_expiration: '', initial_batch_stock: '0',
      initial_batch_cost: '', initial_batch_notes: '',
    });
    setConversions(product.conversions || []);
    setEditing(product);
    setShowForm(true);
  };

  const confirmToggleActive = async (p) => {
    if (!canEdit) return;
    if (toggling) return;
    const msg = p.is_active
      ? '¿Está seguro de desactivar este producto? El producto no podrá venderse mientras permanezca inactivo.'
      : '¿Desea activar nuevamente este producto?';
    if (!window.confirm(msg)) return;
    setToggling(true);
    try {
      await api.put(`/products/${p.id}`, {
        ...p,
        is_active: !p.is_active,
        current_stock: Number(p.current_stock),
        min_stock: Number(p.min_stock),
        purchase_price: Number(p.purchase_price),
        selling_price: Number(p.selling_price),
        category_id: p.category_id || null,
      });
      loadProducts();
      alert(p.is_active ? 'Producto desactivado correctamente.' : 'Producto activado correctamente.');
    } catch {
      alert('Error al cambiar estado del producto');
    } finally {
      setToggling(false);
    }
  };

  const loadMovements = async (productId, page = 1) => {
    const params = { per_page: 20, page };
    if (movementsFilters.from) params.from = movementsFilters.from;
    if (movementsFilters.to) params.to = movementsFilters.to;
    const { data } = await api.get(`/products/${productId}/movements`, { params });
    setMovementsData(data);
    setMovementsPage(page);
  };

  const openAdjustStock = async (p) => {
    setAdjustProduct(p);
    setAdjustForm({ type: 'in', quantity: '', reason: '', notes: '', batch_id: '', physical_stock: '' });
    if (p.track_batches) {
      const { data: batches } = await api.get(`/products/${p.id}/batches`);
      setAdjustBatches(batches);
      const stocks = {};
      batches.forEach(b => { stocks[b.id] = formatStock(b.current_quantity, p.inventory_type); });
      setAdjustBatchStocks(stocks);
    } else {
      setAdjustBatches([]);
      setAdjustBatchStocks({});
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!adjustProduct || adjusting) return;
    setAdjusting(true);
    try {
      const payload = adjustForm.reason === 'Conteo físico' && adjustProduct.track_batches
        ? {
            reason: adjustForm.reason,
            notes: adjustForm.notes,
            batches: Object.entries(adjustBatchStocks).map(([id, stock]) => ({
              id: Number(id),
              physical_stock: Number(stock),
            })),
          }
        : adjustForm.reason === 'Conteo físico'
        ? {
            reason: adjustForm.reason,
            physical_stock: Number(adjustForm.physical_stock),
            notes: adjustForm.notes,
          }
        : {
            type: adjustForm.type,
            quantity: Number(adjustForm.quantity),
            reason: adjustForm.reason,
            notes: adjustForm.notes,
            batch_id: adjustForm.batch_id || undefined,
          };
      await api.post(`/products/${adjustProduct.id}/adjust-stock`, payload);
      setAdjustProduct(null);
      loadProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al ajustar stock');
    } finally {
      setAdjusting(false);
    }
  };

  const openRestock = async (p) => {
    setRestockProduct(p);
    setRestockForm({ quantity: '', type: 'purchase', unit_cost: '', purchase_price: '', notes: '', reference: '', batch_option: p.track_batches ? 'existing' : 'none', batch_id: '', batch_code: '', batch_expiration: '', conversion_id: '' });
    if (p.track_batches) {
      const { data: batches } = await api.get(`/products/${p.id}/batches`);
      setRestockBatches(batches);
    } else {
      setRestockBatches([]);
    }
    if (p.track_conversions) {
      const { data: convs } = await api.get(`/products/${p.id}/conversions`);
      setRestockConversions(convs);
    } else {
      setRestockConversions([]);
    }
  };

  const handleRestock = async (e) => {
    e.preventDefault();
    if (!restockProduct) return;
    if (restocking) return;
    setRestocking(true);
    try {
      const payload = {
        quantity: Number(restockForm.quantity),
        type: restockForm.type,
        notes: restockForm.notes || undefined,
        reference: restockForm.reference || undefined,
        conversion_id: restockForm.conversion_id ? Number(restockForm.conversion_id) : undefined,
        batch_option: restockProduct.track_batches ? restockForm.batch_option : 'none',
      };
      payload.purchase_price = restockForm.purchase_price ? Number(restockForm.purchase_price) : undefined;
      if (restockForm.batch_option === 'existing') payload.batch_id = Number(restockForm.batch_id);
      if (restockForm.batch_option === 'new') {
        payload.batch_code = restockForm.batch_code;
        payload.batch_expiration = restockForm.batch_expiration;
      }
      await api.post(`/products/${restockProduct.id}/restock`, payload);
      setRestockProduct(null);
      loadProducts();
      alert('Producto reabastecido correctamente.');
    } catch (err) {
      alert(err.response?.data?.message || 'Error al reabastecer producto');
    } finally {
      setRestocking(false);
    }
  };

  const setInventoryType = (type) => {
    setForm(f => ({ ...f, inventory_type: type, base_unit: TYPE_UNITS[type] }));
  };

  const addConversion = () => {
    setConversions(c => [...c, { name: '', factor: '', is_purchase_unit: false, is_sale_unit: false }]);
  };

  const updateConversion = (idx, field, value) => {
    setConversions(c => c.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const removeConversion = (idx) => {
    setConversions(c => c.filter((_, i) => i !== idx));
  };

  const productTypeLabel = (type) => {
    const t = STOCK_TYPES.find(t => t.value === type);
    return t ? t.label : type;
  };

  const stockStatus = (p) => {
    const stock = Number(p.current_stock);
    const min = Number(p.min_stock);
    if (stock <= 0) return { label: 'Sin Stock', cls: 'badge-danger' };
    if (stock <= min) return { label: 'Stock Bajo', cls: 'badge-warning' };
    return { label: 'Disponible', cls: 'badge-success' };
  };

  const todayStr = () => new Date().toISOString().split('T')[0];

  const adjustStockActual = adjustProduct ? Number(adjustProduct.current_stock) : 0;
  const adjustCantidad = Number(adjustForm.quantity || 0);
  const adjustResultante = adjustForm.type === 'in'
    ? adjustStockActual + adjustCantidad
    : adjustStockActual - adjustCantidad;
  const adjustPhysicalDiff = adjustProduct
    ? Number(adjustForm.physical_stock || 0) - adjustStockActual
    : 0;

  const TYPE_LABELS = {
    sale: 'Venta', purchase: 'Compra', adjustment: 'Ajuste',
    return: 'Devolución', manual_in: 'Entrada Manual', manual_out: 'Salida Manual',
    transfer: 'Transferencia',
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Productos</h2>
        {canCreate && (
          <button className="btn-primary" onClick={() => { setShowForm(true); setEditing(null); setForm(emptyForm()); setConversions([]); }}>
            + Nuevo Producto
          </button>
        )}
      </div>

      <div className="filters">
        <input type="text" placeholder="Buscar producto..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="input" />
        <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }} className="input">
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className="input">
          <option value="">Todos los tipos</option>
          {STOCK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <label className="checkbox-label">
          <input type="checkbox" checked={lowStockFilter} onChange={e => { setLowStockFilter(e.target.checked); setPage(1); }} />
          Stock Bajo
        </label>
        <select value={batchExpiryFilter} onChange={e => { setBatchExpiryFilter(e.target.value); setPage(1); }} className="input">
          <option value="">Todos los lotes</option>
          <option value="expired">Vencidos</option>
          <option value="expiring_soon">Por vencer (30 días)</option>
        </select>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()} style={{ maxWidth: 800, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>{editing ? 'Editar' : 'Nuevo'} Producto</h3>
            <form onSubmit={handleSubmit}>
              {/* DATOS GENERALES */}
              <fieldset className="form-section">
                <legend>Datos Generales</legend>
                <div className="form-row">
                  <div className="form-group">
                    <label>Código Interno</label>
                    <input type="text" value={form.internal_code || '(Autogenerado)'} disabled className="input" style={{ color: '#999' }} />
                  </div>
                  <div className="form-group">
                    <label>SKU</label>
                    <input type="text" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Código de Barras</label>
                    <input type="text" value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Marca</label>
                    <input type="text" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Nombre *</label>
                  <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Categoría</label>
                    <select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}>
                      <option value="">Sin categoría</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Descripción</label>
                    <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows="2" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Precio de Compra</label>
                    <input type="number" step="0.01" min="0" value={form.purchase_price} onChange={e => setForm({...form, purchase_price: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Precio de Venta *</label>
                    <input type="number" step="0.01" min="0" value={form.selling_price} onChange={e => setForm({...form, selling_price: e.target.value})} required />
                  </div>
                </div>
                  <label className="checkbox-label" style={{ marginBottom: 12 }}>
                    <input type="checkbox" checked={form.track_batches}
                      onChange={e => setForm({...form, track_batches: e.target.checked})} />
                    Este producto maneja lotes
                  </label>
                <div className="form-row">
                  <div className="form-group">
                    <label>Stock Mínimo (punto de reorden)</label>
                    <input type="number" step={baseStep} min="0" value={form.min_stock} onChange={e => setForm({...form, min_stock: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Stock Actual</label>
                    <input type="number" step={baseStep} min="0" value={form.current_stock}
                      readOnly={form.track_batches}
                      onChange={e => setForm({...form, current_stock: e.target.value})}
                      className={`input ${form.track_batches ? 'input-readonly' : ''}`} />
                    {form.track_batches && <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>Calculado de la suma de lotes</small>}
                  </div>
                </div>
              </fieldset>

              {/* CLASIFICACIÓN PRINCIPAL */}
              <fieldset className="form-section">
                <legend>Clasificación Principal</legend>
                <div className="form-row" style={{ alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ flex: 2 }}>
                    <label>Tipo de Inventario *</label>
                    <div className="radio-group">
                      {STOCK_TYPES.map(t => (
                        <label key={t.value} className="radio-label">
                          <input type="radio" name="inventory_type" value={t.value}
                            checked={form.inventory_type === t.value}
                            onChange={() => setInventoryType(t.value)} />
                          {t.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Ud. Base</label>
                    <input type="text" value={form.base_unit} disabled className="input" style={{ color: '#999', fontWeight: 700 }} />
                  </div>
                </div>
              </fieldset>

              {/* CARACTERÍSTICAS OPCIONALES */}
              <fieldset className="form-section">
                <legend>Características Opcionales</legend>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={form.track_stock} onChange={e => setForm({...form, track_stock: e.target.checked})} />
                    Controlar Stock
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={form.track_conversions} onChange={e => setForm({...form, track_conversions: e.target.checked})} />
                    Manejar Conversiones de ud.
                  </label>
                </div>
              </fieldset>

              {/* SECCIÓN LOTES */}
              {form.track_batches && !editing && (
                <fieldset className="form-section">
                  <legend>Información del Lote</legend>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Número de Lote *</label>
                      <input type="text" value={form.initial_batch_code}
                        onChange={e => setForm({...form, initial_batch_code: e.target.value})}
                        required={form.track_batches} placeholder="LOTE-001" />
                    </div>
                    <div className="form-group">
                      <label>Fecha de Vencimiento *</label>
                      <input type="date" value={form.initial_batch_expiration}
                        onChange={e => setForm({...form, initial_batch_expiration: e.target.value})}
                        required={form.track_batches}
                        min={todayStr()} />
                    </div>
                    <div className="form-group">
                      <label>Stock Inicial *</label>
                      <input type="number" step="1" min="1" value={form.initial_batch_stock}
                        onChange={e => setForm({...form, initial_batch_stock: e.target.value})}
                        required={form.track_batches} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Notas</label>
                    <textarea rows="2" value={form.initial_batch_notes}
                      onChange={e => setForm({...form, initial_batch_notes: e.target.value})} />
                  </div>
                </fieldset>
              )}
              {form.track_batches && editing && (
                <fieldset className="form-section">
                  <legend>Información del Lote</legend>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Los lotes se gestionan desde el módulo de compras o en la página de lotes del producto.
                  </p>
                  <button type="button" className="btn-sm btn-info" style={{ marginTop: 8 }}
                    onClick={() => navigate(`/products/${editing.id}/batches`)}>
                    Ver Historial de Lotes
                  </button>
                </fieldset>
              )}

              {/* SECCIÓN CONVERSIONES */}
              {form.track_conversions && (
                <fieldset className="form-section">
                  <legend>Conversiones de ud.</legend>
                  <p>Ud. Base: <strong>{form.base_unit}</strong></p>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ minWidth: 400 }}>
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Factor (1 {form.base_unit} = ?)</th>
                          <th>Compra</th>
                          <th>Venta</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {conversions.map((c, i) => (
                          <tr key={i}>
                            <td><input type="text" value={c.name} onChange={e => updateConversion(i, 'name', e.target.value)} placeholder="Ej: Libra" className="input compact" /></td>
                            <td><input type="number" step="0.0001" min="0.0001" value={c.factor} onChange={e => updateConversion(i, 'factor', e.target.value)} className="input compact" /></td>
                            <td style={{ textAlign: 'center' }}>
                              <input type="checkbox" checked={c.is_purchase_unit} onChange={e => updateConversion(i, 'is_purchase_unit', e.target.checked)} />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input type="checkbox" checked={c.is_sale_unit} onChange={e => updateConversion(i, 'is_sale_unit', e.target.checked)} />
                            </td>
                            <td><button type="button" className="btn-sm btn-delete" onClick={() => removeConversion(i)}>🗑️</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button type="button" className="btn-secondary btn-sm" onClick={addConversion} style={{ marginTop: 8 }}>+ Agregar Conversión</button>
                </fieldset>
              )}

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
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Tipo</th>
              <th>P. Venta</th>
              <th>Stock</th>
              <th>Estado Stock</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => {
              const st = stockStatus(p);
              return (
                <tr key={p.id} className={p.is_low_stock ? 'row-warning' : ''}>
                  <td style={{ fontSize: '0.85rem' }}>{p.internal_code || p.sku || '—'}</td>
                  <td>
                    {p.name}
                    {p.brand && <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.brand}</span>}
                  </td>
                  <td>{p.category?.name || '—'}</td>
                  <td><span className="badge badge-info">{productTypeLabel(p.inventory_type)}</span></td>
                  <td>{formatPrice(p.selling_price)}</td>
                  <td>
                    <span style={{ fontWeight: p.is_low_stock ? 700 : 400 }}>
                      {formatStock(p.current_stock, p.inventory_type)} {p.base_unit}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${st.cls}`}>{st.label}</span>
                  </td>
                  <td>
                    <span className={`badge ${p.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {p.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="action-dropdown">
                      <button className="btn-sm btn-dropdown" onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.closest('td').getBoundingClientRect(); const openUp = window.innerHeight - rect.bottom < 270; const style = { position: 'fixed', right: (window.innerWidth - rect.right) + 'px' }; if (openUp) style.bottom = (window.innerHeight - rect.top + 4) + 'px'; else style.top = (rect.bottom - 4) + 'px'; setDropdownStyle(style); setDropdownUp(openUp); setOpenDropdown(openDropdown === p.id ? null : p.id); }}>⋯</button>
                      {openDropdown === p.id && (
                        <div className={`dropdown-menu${dropdownUp ? ' up' : ''}`} style={dropdownStyle} onClick={e => e.stopPropagation()}>
                          <button onClick={() => { setOpenDropdown(null); setDetailProduct(p); }}>👁️ Ver detalle</button>
                          <button onClick={() => { setOpenDropdown(null); if (canEdit) editProduct(p); }}>✏️ Editar</button>
                          <button onClick={() => { setOpenDropdown(null); setShowMovements(p); setMovementsFilters({ from: '', to: '' }); loadMovements(p.id); }}>📦 Ver movimientos</button>
                          {p.track_batches && <button onClick={() => { setOpenDropdown(null); navigate(`/products/${p.id}/batches`); }}>📦 Ver lotes</button>}
                          {canAdjust && <button onClick={() => { setOpenDropdown(null); openAdjustStock(p); }}>⚖️ Ajustar stock</button>}
                          {canRestock && <button onClick={() => { setOpenDropdown(null); openRestock(p); }}>📦 Reabastecer</button>}
                          <button onClick={() => { setOpenDropdown(null); confirmToggleActive(p); }}>
                            {p.is_active ? '🔴 Desactivar' : '🟢 Activar'}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {products.length === 0 && (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Sin productos registrados</p>
        )}
      </div>

      {(lastPage || 1) > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
          <button className="btn-sm btn-secondary" disabled={page <= 1}
            onClick={() => loadProducts(page - 1)}>← Anterior</button>
          <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Pág. {page} de {lastPage} ({totalProducts} productos)
          </span>
          <button className="btn-sm btn-secondary" disabled={page >= lastPage}
            onClick={() => loadProducts(page + 1)}>Siguiente →</button>
        </div>
      )}

      {/* Modal Detalle */}
      {detailProduct && (
        <div className="modal-overlay" onClick={() => setDetailProduct(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <h3>Detalle del Producto</h3>
            <div className="detail-grid">
              <div className="detail-item"><label>Nombre</label><span>{detailProduct.name}</span></div>
              <div className="detail-item"><label>SKU</label><span>{detailProduct.sku || '—'}</span></div>
              <div className="detail-item"><label>Categoría</label><span>{detailProduct.category?.name || '—'}</span></div>
              <div className="detail-item"><label>Tipo</label><span>{productTypeLabel(detailProduct.inventory_type)}</span></div>
              <div className="detail-item"><label>Ud. Base</label><span>{detailProduct.base_unit || '—'}</span></div>
              <div className="detail-item"><label>Precio Compra</label><span>{formatPrice(detailProduct.purchase_price ?? 0)}</span></div>
              <div className="detail-item"><label>Precio Venta</label><span>{formatPrice(detailProduct.selling_price)}</span></div>
              <div className="detail-item"><label>Stock Actual</label><span>{formatStock(detailProduct.current_stock, detailProduct.inventory_type)} {detailProduct.base_unit}</span></div>
              <div className="detail-item"><label>Stock Mínimo</label><span>{formatStock(detailProduct.min_stock, detailProduct.inventory_type)} {detailProduct.base_unit}</span></div>
              <div className="detail-item"><label>Estado</label><span className={`badge ${detailProduct.is_active ? 'badge-success' : 'badge-danger'}`}>{detailProduct.is_active ? 'Activo' : 'Inactivo'}</span></div>
              <div className="detail-item"><label>Creado</label><span>{new Date(detailProduct.created_at).toLocaleDateString('es-MX')}</span></div>
              <div className="detail-item"><label>Actualizado</label><span>{new Date(detailProduct.updated_at).toLocaleDateString('es-MX')}</span></div>
            </div>
            {detailProduct.track_batches && (
              <div style={{ marginTop: 8 }}>
                <button className="btn-sm btn-info" onClick={() => navigate(`/products/${detailProduct.id}/batches`)}>
                  Ver lotes
                </button>
              </div>
            )}
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setDetailProduct(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Movimientos */}
      {showMovements && (
        <div className="modal-overlay" onClick={() => setShowMovements(null)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()} style={{ maxWidth: 1050, maxHeight: '85vh', overflowY: 'auto' }}>
            <h3>Movimientos: {showMovements.name}</h3>
            <div className="filters" style={{ marginBottom: 12 }}>
              <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Desde</span>
              <input type="date" value={movementsFilters.from} onChange={e => setMovementsFilters(f => ({ ...f, from: e.target.value }))} className="input" />
              <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Hasta</span>
              <input type="date" value={movementsFilters.to} onChange={e => setMovementsFilters(f => ({ ...f, to: e.target.value }))} className="input" />
              <button className="btn-primary btn-sm" onClick={() => loadMovements(showMovements.id)}>Buscar</button>
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
                  {(movementsData.data || []).map(m => (
                    <tr key={m.id}>
                      <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {new Date(m.created_at).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <span className={`badge ${m.type === 'sale' ? 'badge-info' : m.type === 'purchase' ? 'badge-success' : m.type === 'adjustment' ? 'badge-warning' : 'badge-secondary'}`}>
                          {TYPE_LABELS[m.type] || m.type}
                        </span>
                      </td>
                      <td style={{ color: m.quantity < 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>
                        {m.quantity > 0 ? '+' : ''}{Number(m.quantity).toFixed(3).replace(/\.?0+$/, '')}
                      </td>
                      <td>{Number(m.stock_before).toFixed(3).replace(/\.?0+$/, '')}</td>
                      <td>{Number(m.stock_after).toFixed(3).replace(/\.?0+$/, '')}</td>
                      <td style={{ fontSize: '0.85rem' }}>{m.user?.name || '—'}</td>
                      <td style={{ fontSize: '0.85rem', wordBreak: 'break-word' }}>{m.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(movementsData.data || []).length === 0 && (
                <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Sin movimientos registrados</p>
              )}
            </div>
            {(movementsData.last_page || 1) > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                <button className="btn-sm btn-secondary" disabled={movementsPage <= 1}
                  onClick={() => loadMovements(showMovements.id, movementsPage - 1)}>← Anterior</button>
                <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Pág. {movementsData.current_page} de {movementsData.last_page}
                </span>
                <button className="btn-sm btn-secondary" disabled={movementsPage >= (movementsData.last_page || 1)}
                  onClick={() => loadMovements(showMovements.id, movementsPage + 1)}>Siguiente →</button>
              </div>
            )}
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowMovements(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajustar Stock */}
      {adjustProduct && (
        <div className="modal-overlay" onClick={() => setAdjustProduct(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h3>Ajustar Stock: {adjustProduct.name}</h3>
            <form onSubmit={handleAdjustStock}>
              {adjustProduct.track_batches && adjustBatches.length > 0 && adjustForm.reason !== 'Conteo físico' && (
                <fieldset className="form-section">
                  <legend>Lotes Disponibles</legend>
                  <div style={{ overflowX: 'auto', marginBottom: 8 }}>
                    <table className="table" style={{ minWidth: 300 }}>
                      <thead>
                        <tr>
                          <th>Lote</th>
                          <th>Vencimiento</th>
                          <th>Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adjustBatches.filter(b => adjustForm.type === 'out' ? Number(b.current_quantity) > 0 : true).map(b => (
                          <tr key={b.id}
                            style={{ cursor: 'pointer', background: adjustForm.batch_id === String(b.id) ? 'var(--bg-hover)' : '' }}
                            onClick={() => setAdjustForm(f => ({ ...f, batch_id: String(b.id) }))}>
                            <td>{b.batch_code}</td>
                            <td>{b.expiration_date || '—'}</td>
                            <td>{formatStock(b.current_quantity, adjustProduct.inventory_type)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="form-group">
                    <label>Lote seleccionado *</label>
                    <select value={adjustForm.batch_id}
                      onChange={e => setAdjustForm(f => ({ ...f, batch_id: e.target.value }))}
                      required>
                      <option value="">Seleccionar lote...</option>
                      {adjustBatches.filter(b => adjustForm.type === 'out' ? Number(b.current_quantity) > 0 : true).map(b => (
                        <option key={b.id} value={b.id}>
                          {b.batch_code} — {b.expiration_date || 'S/V'} — Stock: {formatStock(b.current_quantity, adjustProduct.inventory_type)}
                        </option>
                      ))}
                    </select>
                    {adjustForm.batch_id && (
                      <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                        Stock del lote: {formatStock(adjustBatches.find(b => b.id === Number(adjustForm.batch_id))?.current_quantity || 0, adjustProduct.inventory_type)} {adjustProduct.base_unit}
                      </small>
                    )}
                  </div>
                </fieldset>
              )}
              {adjustProduct.track_batches && adjustBatches.length === 0 && (
                <p style={{ color: 'var(--warning)', marginBottom: 12, fontSize: '0.9rem' }}>
                  Este producto no tiene lotes registrados. Cree un lote antes de ajustar stock.
                </p>
              )}

              <div className="form-group">
                <label>Stock Actual</label>
                <input type="text" value={formatStock(adjustProduct.current_stock, adjustProduct.inventory_type) + ' ' + adjustProduct.base_unit} disabled className="input input-readonly" />
              </div>

              <div className="form-group">
                <label>Motivo del Ajuste *</label>
                <select value={adjustForm.reason} onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))} required>
                  <option value="">Seleccionar motivo</option>
                  <option value="Conteo físico">Conteo físico</option>
                  <option value="Robo">Robo</option>
                  <option value="Producto dañado">Producto dañado</option>
                  <option value="Producto vencido">Producto vencido</option>
                  <option value="Donación">Donación</option>
                  <option value="Consumo interno">Consumo interno</option>
                  <option value="Corrección administrativa">Corrección administrativa</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              {adjustForm.reason === 'Conteo físico' && adjustProduct.track_batches && adjustBatches.length > 0 ? (
                <>
                  <fieldset className="form-section">
                    <legend>Conteo Físico por Lote</legend>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table" style={{ minWidth: 400 }}>
                        <thead>
                          <tr>
                            <th>Lote</th>
                            <th>Vencimiento</th>
                            <th>Stock actual</th>
                            <th>Stock contado *</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adjustBatches.map(b => {
                            const entered = Number(adjustBatchStocks[b.id] ?? b.current_quantity);
                            const diff = entered - Number(b.current_quantity);
                            return (
                              <tr key={b.id}>
                                <td>{b.batch_code}</td>
                                <td>{b.expiration_date || '—'}</td>
                                <td>{formatStock(b.current_quantity, adjustProduct.inventory_type)}</td>
                                <td>
                                  <input type="number"
                                    step={adjustProduct.inventory_type === 'unit' ? '1' : '0.001'}
                                    min="0"
                                    value={adjustBatchStocks[b.id] ?? ''}
                                    onChange={e => setAdjustBatchStocks(s => ({ ...s, [b.id]: e.target.value }))}
                                    style={{ width: 100 }}
                                    required />
                                  {diff !== 0 && (
                                    <span style={{ marginLeft: 8, fontSize: '0.8rem', color: diff > 0 ? 'var(--success)' : 'var(--danger)' }}>
                                      {diff > 0 ? '+' : ''}{formatStock(diff, adjustProduct.inventory_type)}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ marginTop: 8, textAlign: 'right' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Total sistema: {formatStock(adjustStockActual, adjustProduct.inventory_type)}
                        {' — '}
                        Total contado: {formatStock(Object.values(adjustBatchStocks).reduce((a, v) => a + Number(v || 0), 0), adjustProduct.inventory_type)}
                        {' — '}
                      </span>
                      <span className={`adjust-diff ${(() => { const d = Object.values(adjustBatchStocks).reduce((a, v) => a + Number(v || 0), 0) - adjustStockActual; return d > 0 ? 'positive' : d < 0 ? 'negative' : 'zero'; })()}`}>
                        Diferencia: {(() => { const d = Object.values(adjustBatchStocks).reduce((a, v) => a + Number(v || 0), 0) - adjustStockActual; return (d > 0 ? '+' : '') + formatStock(d, adjustProduct.inventory_type) + ' ' + adjustProduct.base_unit; })()}
                      </span>
                    </div>
                  </fieldset>
                </>
              ) : adjustForm.reason === 'Conteo físico' ? (
                <>
                  <div className="form-group">
                    <label>Stock según sistema</label>
                    <input type="text" value={formatStock(adjustProduct.current_stock, adjustProduct.inventory_type) + ' ' + adjustProduct.base_unit} disabled className="input input-readonly" />
                  </div>
                  <div className="form-group">
                    <label>Stock contado físicamente *</label>
                    <input type="number"
                      step={adjustProduct.inventory_type === 'unit' ? '1' : '0.001'}
                      min="0"
                      value={adjustForm.physical_stock}
                      onChange={e => setAdjustForm(f => ({ ...f, physical_stock: e.target.value }))}
                      placeholder="0"
                      required />
                  </div>
                  <div className={`adjust-diff ${adjustPhysicalDiff > 0 ? 'positive' : adjustPhysicalDiff < 0 ? 'negative' : 'zero'}`}>
                    Diferencia: {adjustPhysicalDiff > 0 ? '+' : ''}{formatStock(adjustPhysicalDiff, adjustProduct.inventory_type)} {adjustProduct.base_unit}
                  </div>
                </>
              ) : adjustForm.reason && adjustForm.reason !== '' ? (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Tipo de movimiento *</label>
                      <div className="radio-group">
                        <label className="radio-label">
                          <input type="radio" name="adjust-type" value="in"
                            checked={adjustForm.type === 'in'}
                            onChange={() => setAdjustForm(f => ({ ...f, type: 'in' }))} />
                          Entrada
                        </label>
                        <label className="radio-label">
                          <input type="radio" name="adjust-type" value="out"
                            checked={adjustForm.type === 'out'}
                            onChange={() => setAdjustForm(f => ({ ...f, type: 'out' }))} />
                          Salida
                        </label>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Cantidad *</label>
                      <input type="number"
                        step={adjustProduct.inventory_type === 'unit' ? '1' : '0.001'}
                        min={adjustProduct.inventory_type === 'unit' ? '1' : '0.001'}
                        value={adjustForm.quantity}
                        onChange={e => setAdjustForm(f => ({ ...f, quantity: e.target.value }))}
                        placeholder="0"
                        required />
                      <small style={{ color: 'var(--text-muted)' }}>{adjustProduct.base_unit}</small>
                    </div>
                  </div>
                  {adjustForm.type === 'out' && adjustCantidad > adjustStockActual && (
                    <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 4 }}>
                      Stock insuficiente. Stock actual: {formatStock(adjustStockActual, adjustProduct.inventory_type)} {adjustProduct.base_unit}
                    </p>
                  )}
                  <div className={`adjust-diff ${adjustResultante > adjustStockActual ? 'positive' : adjustResultante < adjustStockActual ? 'negative' : 'zero'}`}>
                    Stock Resultante: {formatStock(adjustResultante, adjustProduct.inventory_type)} {adjustProduct.base_unit}
                    {adjustCantidad > 0 && (
                      <span style={{ fontSize: '0.8rem', opacity: 0.7, marginLeft: 8 }}>
                        ({adjustForm.type === 'in' ? '+' : '-'}{formatStock(adjustCantidad, adjustProduct.inventory_type)})
                      </span>
                    )}
                  </div>
                </>
              ) : null}

              <div className="form-group">
                <label>Observaciones{adjustForm.reason === 'Otro' ? ' *' : ''}</label>
                <textarea value={adjustForm.notes}
                  onChange={e => setAdjustForm(f => ({ ...f, notes: e.target.value }))}
                  rows="2"
                  required={adjustForm.reason === 'Otro'} />
                {adjustForm.reason === 'Otro' && !adjustForm.notes && (
                  <small style={{ color: 'var(--warning)' }}>Obligatorio para motivo "Otro"</small>
                )}
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={adjusting}>
                  {adjusting ? 'Ajustando...' : 'Ajustar Stock'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setAdjustProduct(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reabastecer */}
      {restockProduct && (
        <div className="modal-overlay" onClick={() => setRestockProduct(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <h3>Reabastecer: {restockProduct.name}</h3>
            <form onSubmit={handleRestock}>
              <div className="form-row">
                <div className="form-group">
                  <label>Tipo</label>
                  <input type="text" value="Compra" disabled className="input" style={{ color: '#999' }} />
                </div>
                <div className="form-group">
                  <label>Cantidad *</label>
                  <input type="number" step={restockProduct.inventory_type === 'unit' ? '1' : '0.001'}
                    min={restockProduct.inventory_type === 'unit' ? '1' : '0.001'}
                    value={restockForm.quantity}
                    onChange={e => setRestockForm(f => ({ ...f, quantity: e.target.value }))}
                    required />
                  <small style={{ color: 'var(--text-muted)' }}>{restockProduct.base_unit}</small>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Precio de Compra</label>
                  <input type="number" step="0.01" min="0" value={restockForm.purchase_price}
                    onChange={e => setRestockForm(f => ({ ...f, purchase_price: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Referencia</label>
                  <input type="text" value={restockForm.reference}
                    onChange={e => setRestockForm(f => ({ ...f, reference: e.target.value }))}
                    placeholder="Factura/OC" />
                </div>
              </div>
              {restockConversions.length > 0 && (
                <div className="form-group">
                  <label>Ud. de Compra</label>
                  <select value={restockForm.conversion_id} onChange={e => setRestockForm(f => ({ ...f, conversion_id: e.target.value }))}>
                    <option value="">{restockProduct.base_unit} (base)</option>
                    {restockConversions.map(c => (
                      <option key={c.id} value={c.id}>1 {c.name} = {c.factor} {restockProduct.base_unit}</option>
                    ))}
                  </select>
                </div>
              )}
              {restockProduct.track_batches && (
                <fieldset className="form-section">
                  <legend>Lote</legend>
                  <div className="form-group">
                    <select value={restockForm.batch_option} onChange={e => setRestockForm(f => ({ ...f, batch_option: e.target.value }))}>
                      <option value="existing">Lote existente</option>
                      <option value="new">Nuevo lote</option>
                    </select>
                  </div>
                  {restockForm.batch_option === 'existing' && restockBatches.length > 0 && (
                    <div className="form-group">
                      <label>Seleccionar Lote</label>
                      <select value={restockForm.batch_id} onChange={e => setRestockForm(f => ({ ...f, batch_id: e.target.value }))} required>
                        <option value="">Seleccionar...</option>
                        {restockBatches.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.batch_code} — {b.expiration_date || 'S/V'} — Stock: {formatStock(b.current_quantity, restockProduct.inventory_type)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {restockForm.batch_option === 'new' && (
                    <div className="form-row">
                      <div className="form-group">
                        <label>Código de Lote *</label>
                        <input type="text" value={restockForm.batch_code}
                          onChange={e => setRestockForm(f => ({ ...f, batch_code: e.target.value }))}
                          required placeholder="LOTE-001" />
                      </div>
                      <div className="form-group">
                        <label>Fecha Vencimiento *</label>
                        <input type="date" value={restockForm.batch_expiration}
                          onChange={e => setRestockForm(f => ({ ...f, batch_expiration: e.target.value }))}
                          required />
                      </div>
                    </div>
                  )}
                </fieldset>
              )}
              {!restockProduct.track_batches && (
                <fieldset className="form-section">
                  <legend>Lote</legend>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Stock general (sin lotes)</p>
                </fieldset>
              )}
              <div className="form-group">
                <label>Notas</label>
                <textarea value={restockForm.notes} onChange={e => setRestockForm(f => ({ ...f, notes: e.target.value }))} rows="2" />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={restocking}>{restocking ? 'Reabasteciendo...' : 'Reabastecer'}</button>
                <button type="button" className="btn-secondary" onClick={() => setRestockProduct(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
