'use strict';

/* ============================================================
   UTILS
   ============================================================ */
function toast(msg, type = 'success') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3400);
}
const showOk  = m => toast(m, 'success');
const showErr = m => toast(m, 'error');
const showWarn= m => toast(m, 'warning');

function fmt(n) { return 'S/ ' + parseFloat(n || 0).toFixed(2); }
function fmtDate(s) {
  if (!s) return '—';
  return new Date(s).toLocaleString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function openModal(id)  { document.getElementById(id)?.classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

function confirm(title, msg) {
  return new Promise(resolve => {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-msg').textContent = msg;
    openModal('confirm-dialog');
    const btn = document.getElementById('btn-confirm-ok');
    const handler = () => { closeModal('confirm-dialog'); btn.removeEventListener('click', handler); resolve(true); };
    btn.addEventListener('click', handler);
  });
}

document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.close));
});
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.add('hidden'); });
});

/* ============================================================
   AUTH GUARD
   ============================================================ */
const token = localStorage.getItem('token');
const user  = JSON.parse(localStorage.getItem('user') || '{}');
if (!token) { window.location.href = '/login'; }

document.getElementById('user-name').textContent    = user.nombre || 'Admin';
document.getElementById('user-initial').textContent = (user.nombre || 'A')[0].toUpperCase();

document.getElementById('btn-logout').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = '/login';
});

/* ============================================================
   NAVIGATION
   ============================================================ */
const PAGE_TITLES = {
  pos: 'Nueva Venta', ventas: 'Ventas', productos: 'Productos',
  compras: 'Compras', caja: 'Caja', deudas: 'Deudas',
  prestamos: 'Préstamos', clientes: 'Clientes'
};
const PAGE_LOADERS = {};

function navigateTo(page) {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.page === page));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === `page-${page}`));
  document.getElementById('page-title').textContent = PAGE_TITLES[page] || page;
  if (PAGE_LOADERS[page]) PAGE_LOADERS[page]();
}

document.querySelectorAll('.nav-item[data-page]').forEach(item => {
  item.addEventListener('click', () => navigateTo(item.dataset.page));
});

/* ============================================================
   POS
   ============================================================ */
let carrito = [];
let allProductosPOS = [];

PAGE_LOADERS.pos = async () => {
  try {
    const res = await productosAPI.getAll();
    allProductosPOS = (res.data || []).filter(p => p.activo != 0 && p.stock > 0);
    renderPOSProducts(allProductosPOS);
    await loadClientesSelect();
  } catch (e) { showErr(e.message); }
};

function renderPOSProducts(list) {
  const grid = document.getElementById('pos-products');
  if (!list.length) { grid.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:16px">Sin productos</p>'; return; }
  grid.innerHTML = list.map(p => `
    <div class="product-card" data-id="${p.id}">
      <div class="product-img">
        ${p.imagen_url ? `<img src="${p.imagen_url}" alt="${p.nombre}" onerror="this.parentElement.innerHTML='<i class=\\'fa-solid fa-box\\'></i>'">` : '<i class="fa-solid fa-box"></i>'}
      </div>
      <div class="product-info">
        <div class="product-name">${p.nombre}</div>
        <div class="product-price">${fmt(p.precio_base)}</div>
        <div class="product-stock">Stock: ${p.stock}</div>
      </div>
    </div>`).join('');
  grid.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => addToCart(parseInt(card.dataset.id)));
  });
}

let posSearchTimer;
document.getElementById('pos-search').addEventListener('input', e => {
  clearTimeout(posSearchTimer);
  posSearchTimer = setTimeout(() => {
    const q = e.target.value.trim().toLowerCase();
    renderPOSProducts(q ? allProductosPOS.filter(p => p.nombre.toLowerCase().includes(q)) : allProductosPOS);
  }, 200);
});

function addToCart(productoId) {
  const prod = allProductosPOS.find(p => p.id === productoId);
  if (!prod) return;
  const existing = carrito.find(i => i.producto_id === productoId);
  if (existing) {
    if (existing.cantidad >= prod.stock) { showWarn('No hay más stock disponible'); return; }
    existing.cantidad++;
  } else {
    carrito.push({ producto_id: productoId, nombre: prod.nombre, precio_unitario: parseFloat(prod.precio_base), cantidad: 1, stock: prod.stock });
  }
  renderCart();
}

function removeFromCart(idx) { carrito.splice(idx, 1); renderCart(); }

function renderCart() {
  const itemsEl = document.getElementById('cart-items');
  const countEl = document.getElementById('cart-count');

  if (!carrito.length) {
    itemsEl.innerHTML = '<div style="text-align:center;padding:32px 16px;color:var(--text-muted);font-size:13px"><i class="fa-solid fa-cart-shopping" style="font-size:28px;opacity:.3;display:block;margin-bottom:8px"></i>Agrega productos al carrito</div>';
    countEl.textContent = '(0)';
    updateCartTotals();
    return;
  }
  countEl.textContent = `(${carrito.length})`;
  itemsEl.innerHTML = carrito.map((item, i) => `
    <div class="cart-item">
      <div class="cart-item-name">${item.nombre}</div>
      <div class="cart-item-controls">
        <button class="qty-btn" onclick="changeQty(${i},-1)">−</button>
        <input class="qty-input" type="number" value="${item.cantidad}" min="1" max="${item.stock}"
               onchange="setQty(${i},this.value)" style="width:40px">
        <button class="qty-btn" onclick="changeQty(${i},1)">+</button>
      </div>
      <div class="cart-item-total">${fmt(item.cantidad * item.precio_unitario)}</div>
      <button class="cart-remove" onclick="removeFromCart(${i})"><i class="fa-solid fa-xmark"></i></button>
    </div>`).join('');
  updateCartTotals();
}

function changeQty(idx, delta) {
  carrito[idx].cantidad = Math.max(1, Math.min(carrito[idx].stock, carrito[idx].cantidad + delta));
  renderCart();
}
function setQty(idx, val) {
  carrito[idx].cantidad = Math.max(1, Math.min(carrito[idx].stock, parseInt(val) || 1));
  renderCart();
}

function updateCartTotals() {
  const subtotal = carrito.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
  const redondeo = parseFloat(document.getElementById('cart-redondeo').value) || 0;
  const total    = subtotal + redondeo;
  document.getElementById('cart-subtotal').textContent = fmt(subtotal);
  document.getElementById('cart-total').textContent    = fmt(total);
  updateVuelto();
}

document.getElementById('cart-redondeo').addEventListener('input', updateCartTotals);

function updateVuelto() {
  const tipo = document.getElementById('payment-type').value;
  if (tipo !== 'efectivo') { document.getElementById('vuelto').textContent = ''; return; }
  const total    = parseFloat(document.getElementById('cart-total').textContent.replace('S/ ','')) || 0;
  const recibido = parseFloat(document.getElementById('monto-recibido').value) || 0;
  const vuelto   = recibido - total;
  const el = document.getElementById('vuelto');
  el.textContent = vuelto >= 0 ? `Vuelto: ${fmt(vuelto)}` : `Faltan: ${fmt(Math.abs(vuelto))}`;
  el.style.color = vuelto >= 0 ? 'var(--success)' : 'var(--danger)';
}

document.getElementById('monto-recibido').addEventListener('input', updateVuelto);

function handlePaymentTypeChange() {
  const tipo = document.getElementById('payment-type').value;
  document.querySelectorAll('.payment-field').forEach(el => el.classList.add('hidden'));
  if (tipo === 'efectivo') document.getElementById('field-efectivo').classList.remove('hidden');
  else if (tipo === 'deuda')  document.getElementById('field-cliente').classList.remove('hidden');
  else if (tipo === 'mixto') {
    document.getElementById('field-mixto-efectivo').classList.remove('hidden');
    document.getElementById('field-mixto-yape').classList.remove('hidden');
  }
}
document.getElementById('payment-type').addEventListener('change', handlePaymentTypeChange);
handlePaymentTypeChange();

document.getElementById('btn-limpiar-carrito').addEventListener('click', () => { carrito = []; renderCart(); });

document.getElementById('btn-completar-venta').addEventListener('click', async () => {
  if (!carrito.length) { showWarn('El carrito está vacío'); return; }
  const tipoPago = document.getElementById('payment-type').value;
  const redondeo = parseFloat(document.getElementById('cart-redondeo').value) || 0;

  const ventaData = {
    tipo_pago: tipoPago,
    redondeo,
    productos: carrito.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad, precio_unitario: i.precio_unitario }))
  };

  if (tipoPago === 'mixto') {
    ventaData.monto_efectivo = parseFloat(document.getElementById('mixto-efectivo').value) || 0;
    ventaData.monto_yape     = parseFloat(document.getElementById('mixto-yape').value) || 0;
  } else if (tipoPago === 'deuda') {
    const clienteId = document.getElementById('select-cliente').value;
    if (!clienteId) { showWarn('Seleccione un cliente para venta a deuda'); return; }
    ventaData.cliente_id = parseInt(clienteId);
  }

  const btn = document.getElementById('btn-completar-venta');
  btn.disabled = true;
  try {
    await ventasAPI.create(ventaData);
    showOk('✅ Venta completada correctamente');
    carrito = [];
    document.getElementById('cart-redondeo').value = '0';
    document.getElementById('monto-recibido').value = '';
    renderCart();
    await PAGE_LOADERS.pos();
  } catch (e) { showErr(e.message); }
  finally { btn.disabled = false; }
});

async function loadClientesSelect() {
  try {
    const res = await clientesAPI.getAll();
    const sel = document.getElementById('select-cliente');
    const prev = sel.value;
    sel.innerHTML = '<option value="">Seleccionar cliente...</option>';
    (res.data || []).filter(c => c.tiene_cuenta).forEach(c => {
      const o = document.createElement('option');
      o.value = c.id; o.textContent = c.nombre;
      sel.appendChild(o);
    });
    if (prev) sel.value = prev;
  } catch {}
}

/* ============================================================
   VENTAS
   ============================================================ */
const TIPO_PAGO_LABELS = { efectivo:'Efectivo', yape:'Yape', mixto:'Mixto', deuda:'Deuda', cortesia:'Cortesía' };
let _allVentas = [];

PAGE_LOADERS.ventas = () => loadVentas();

async function loadVentas(params = '') {
  try {
    const res = await ventasAPI.getAll(params);
    _allVentas = res.data || [];
    renderVentas(_allVentas);
  } catch (e) { showErr(e.message); }
}

function renderVentas(list) {
  const tbody = document.getElementById('table-ventas');
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--text-muted)">Sin resultados</td></tr>'; return; }
  tbody.innerHTML = list.map(v => {
    const anulada = v.estado === 'anulada';
    const tipoBadge = { efectivo:'chip-success', yape:'chip-primary', mixto:'chip-warning', deuda:'chip-danger', cortesia:'chip-secondary' }[v.tipo_pago] || 'chip-secondary';
    return `<tr style="${anulada ? 'opacity:.5;text-decoration:line-through' : ''}">
      <td>${v.id}</td>
      <td style="white-space:nowrap">${fmtDate(v.fecha)}</td>
      <td>${v.cliente_nombre || 'Público'}</td>
      <td><span class="chip ${tipoBadge}">${TIPO_PAGO_LABELS[v.tipo_pago] || v.tipo_pago}</span></td>
      <td>${fmt(v.monto_efectivo)}</td>
      <td>${fmt(v.monto_yape)}</td>
      <td><strong>${fmt(v.total)}</strong></td>
      <td>${anulada ? '<span class="chip chip-danger">Anulada</span>' : '<span class="chip chip-success">Activa</span>'}</td>
      <td>${!anulada ? `<button class="btn btn-danger btn-sm" onclick="anularVenta(${v.id})"><i class="fa-solid fa-ban"></i></button>` : ''}</td>
    </tr>`;
  }).join('');
}

async function anularVenta(id) {
  const ok = await confirm('Anular venta', `¿Seguro que deseas anular la venta #${id}? Esta acción revertirá el stock y los movimientos de caja.`);
  if (!ok) return;
  try { await ventasAPI.anular(id); showOk('Venta anulada'); loadVentas(); }
  catch (e) { showErr(e.message); }
}

document.getElementById('btn-filtrar-ventas').addEventListener('click', () => {
  const fi = document.getElementById('v-fecha-ini').value;
  const ff = document.getElementById('v-fecha-fin').value;
  const t  = document.getElementById('v-tipo').value;
  const p  = new URLSearchParams();
  if (fi) p.set('fecha_inicio', fi);
  if (ff) p.set('fecha_fin', ff);
  if (t)  p.set('tipo_pago', t);
  loadVentas(p.toString());
});

document.getElementById('btn-export-ventas').addEventListener('click', () => exportVentasExcel());

function exportVentasExcel() {
  if (!_allVentas.length) { showWarn('No hay datos para exportar'); return; }
  const headers = ['#', 'Fecha', 'Cliente', 'Tipo Pago', 'Efectivo', 'Yape', 'Total', 'Estado'];
  const rows = _allVentas.map(v => [
    v.id, v.fecha ? new Date(v.fecha).toLocaleString('es-PE') : '',
    v.cliente_nombre || 'Público general',
    TIPO_PAGO_LABELS[v.tipo_pago] || v.tipo_pago,
    parseFloat(v.monto_efectivo || 0), parseFloat(v.monto_yape || 0),
    parseFloat(v.total || 0), v.estado || 'activa'
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [5,16,18,10,10,10,10,10].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
  XLSX.writeFile(wb, `ventas_${new Date().toISOString().slice(0,10)}.xlsx`);
}

/* ============================================================
   PRODUCTOS
   ============================================================ */
PAGE_LOADERS.productos = () => loadProductos();

async function loadProductos(q = '') {
  try {
    const res = q ? await productosAPI.getAll(q) : await productosAPI.getAll();
    renderProductos(res.data || []);
  } catch (e) { showErr(e.message); }
}

function renderProductos(list) {
  const tbody = document.getElementById('table-productos');
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted)">Sin productos</td></tr>'; return; }
  tbody.innerHTML = list.map(p => `
    <tr>
      <td>${p.id}</td>
      <td><strong>${p.nombre}</strong></td>
      <td>${fmt(p.precio_base)}</td>
      <td><span class="chip ${p.stock > 5 ? 'chip-success' : p.stock > 0 ? 'chip-warning' : 'chip-danger'}">${p.stock}</span></td>
      <td>${p.tipo_venta === 'por_peso' ? 'Por peso' : 'Por unidad'}</td>
      <td>${p.activo != 0 ? '<span class="chip chip-success">Activo</span>' : '<span class="chip chip-secondary">Inactivo</span>'}</td>
      <td style="display:flex;gap:6px">
        <button class="btn btn-outline btn-sm" onclick="editarProducto(${p.id})"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-danger btn-sm"  onclick="eliminarProducto(${p.id})"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`).join('');
}

let prodSearchTimer;
document.getElementById('prod-search').addEventListener('input', e => {
  clearTimeout(prodSearchTimer);
  prodSearchTimer = setTimeout(() => loadProductos(e.target.value.trim()), 300);
});

document.getElementById('btn-nuevo-producto').addEventListener('click', () => {
  document.getElementById('prod-id').value = '';
  document.getElementById('prod-nombre').value = '';
  document.getElementById('prod-precio').value = '';
  document.getElementById('prod-stock').value = '0';
  document.getElementById('prod-tipo').value = 'unidad';
  document.getElementById('prod-imagen').value = '';
  document.getElementById('modal-producto-title').textContent = 'Nuevo Producto';
  openModal('modal-producto');
});

async function editarProducto(id) {
  try {
    const res = await productosAPI.getById(id);
    const p = res.data;
    document.getElementById('prod-id').value     = p.id;
    document.getElementById('prod-nombre').value = p.nombre;
    document.getElementById('prod-precio').value = p.precio_base;
    document.getElementById('prod-stock').value  = p.stock;
    document.getElementById('prod-tipo').value   = p.tipo_venta;
    document.getElementById('prod-imagen').value = p.imagen_url || '';
    document.getElementById('modal-producto-title').textContent = 'Editar Producto';
    openModal('modal-producto');
  } catch (e) { showErr(e.message); }
}

document.getElementById('btn-guardar-producto').addEventListener('click', async () => {
  const id     = document.getElementById('prod-id').value;
  const nombre = document.getElementById('prod-nombre').value.trim();
  const precio = parseFloat(document.getElementById('prod-precio').value);
  if (!nombre || isNaN(precio)) { showWarn('Completa los campos requeridos'); return; }

  const data = {
    nombre, precio_base: precio,
    stock:     parseInt(document.getElementById('prod-stock').value) || 0,
    tipo_venta:document.getElementById('prod-tipo').value,
    imagen_url:document.getElementById('prod-imagen').value.trim() || null
  };
  try {
    if (id) await productosAPI.update(id, data);
    else    await productosAPI.create(data);
    showOk('Producto guardado');
    closeModal('modal-producto');
    loadProductos();
    if (PAGE_LOADERS.pos) PAGE_LOADERS.pos();
  } catch (e) { showErr(e.message); }
});

async function eliminarProducto(id) {
  const ok = await confirm('Eliminar producto', '¿Deseas desactivar este producto del catálogo?');
  if (!ok) return;
  try { await productosAPI.delete(id); showOk('Producto desactivado'); loadProductos(); }
  catch (e) { showErr(e.message); }
}

/* ============================================================
   COMPRAS
   ============================================================ */
let compraItems = [];
let _allCompras = [];

PAGE_LOADERS.compras = () => loadCompras();

async function loadCompras(params = '') {
  try {
    const res = await comprasAPI.getAll(params);
    _allCompras = res.data || [];
    renderCompras(_allCompras);
  } catch (e) { showErr(e.message); }
}

function renderCompras(list) {
  const tbody = document.getElementById('table-compras');
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted)">Sin compras</td></tr>'; return; }
  tbody.innerHTML = list.map(c => `
    <tr>
      <td>${c.id}</td>
      <td style="white-space:nowrap">${fmtDate(c.fecha)}</td>
      <td><strong>${fmt(c.total)}</strong></td>
      <td>${fmt(c.monto_efectivo)}</td>
      <td>${fmt(c.monto_yape)}</td>
      <td>${fmt(c.monto_externo)}</td>
      <td>${fmt(c.monto_prestado)}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="cancelarCompra(${c.id})"><i class="fa-solid fa-ban"></i></button>
      </td>
    </tr>`).join('');
}

document.getElementById('btn-filtrar-compras').addEventListener('click', () => {
  const p = new URLSearchParams();
  const fi = document.getElementById('c-fecha-ini').value;
  const ff = document.getElementById('c-fecha-fin').value;
  if (fi) p.set('fecha_inicio', fi);
  if (ff) p.set('fecha_fin', ff);
  loadCompras(p.toString());
});

document.getElementById('btn-export-compras').addEventListener('click', () => {
  if (!_allCompras.length) { showWarn('No hay datos para exportar'); return; }
  const headers = ['#','Fecha','Total','Efectivo','Yape','Externo','Préstamo','Redondeo'];
  const rows = _allCompras.map(c => [c.id, c.fecha ? new Date(c.fecha).toLocaleString('es-PE') : '', parseFloat(c.total||0), parseFloat(c.monto_efectivo||0), parseFloat(c.monto_yape||0), parseFloat(c.monto_externo||0), parseFloat(c.monto_prestado||0), parseFloat(c.ajuste_redondeo||0)]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [5,16,10,10,10,10,10,10].map(w=>({wch:w}));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Compras');
  XLSX.writeFile(wb, `compras_${new Date().toISOString().slice(0,10)}.xlsx`);
});

document.getElementById('btn-nueva-compra').addEventListener('click', async () => {
  compraItems = [];
  renderCompraItems();
  document.getElementById('compra-efectivo').value = '0';
  document.getElementById('compra-yape').value = '0';
  document.getElementById('compra-externo').value = '0';
  document.getElementById('compra-prestamo').value = '0';
  document.getElementById('compra-redondeo').value = '0';
  document.getElementById('compra-prestamo-desc').value = '';
  openModal('modal-compra');
});

function renderCompraItems() {
  const cont = document.getElementById('compra-items');
  if (!compraItems.length) { cont.innerHTML = '<p style="color:var(--text-muted);font-size:13px;margin-bottom:8px">Sin productos aún</p>'; updateCompraTotalCalc(); return; }
  cont.innerHTML = compraItems.map((item, i) => `
    <div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:8px;margin-bottom:8px;align-items:end">
      <div class="form-group" style="margin:0"><label>Producto</label>
        <select class="form-control" onchange="setCompraItemProd(${i},this.value)">
          <option value="">Seleccionar...</option>
          ${(window._productosList||[]).map(p=>`<option value="${p.id}" ${p.id==item.producto_id?'selected':''}>${p.nombre}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" style="margin:0"><label>Cantidad</label>
        <input type="number" min="1" value="${item.cantidad}" class="form-control" onchange="setCompraItemCantidad(${i},this.value)">
      </div>
      <div class="form-group" style="margin:0"><label>Precio unit.</label>
        <input type="number" step="0.01" min="0" value="${item.precio_unitario}" class="form-control" onchange="setCompraItemPrecio(${i},this.value)">
      </div>
      <button class="btn btn-danger btn-sm" style="margin-bottom:0;align-self:flex-end" onclick="removeCompraItem(${i})"><i class="fa-solid fa-xmark"></i></button>
    </div>`).join('');
  updateCompraTotalCalc();
}

function updateCompraTotalCalc() {
  let sub = 0;
  compraItems.forEach(i => { sub += (i.cantidad || 0) * (i.precio_unitario || 0); });
  const redondeo = parseFloat(document.getElementById('compra-redondeo').value) || 0;
  document.getElementById('compra-total-calc').textContent = fmt(sub - redondeo);
}
document.getElementById('compra-redondeo').addEventListener('input', updateCompraTotalCalc);

function setCompraItemProd(i, val) { compraItems[i].producto_id = parseInt(val) || null; }
function setCompraItemCantidad(i, val) { compraItems[i].cantidad = parseInt(val) || 1; updateCompraTotalCalc(); }
function setCompraItemPrecio(i, val) { compraItems[i].precio_unitario = parseFloat(val) || 0; updateCompraTotalCalc(); }
function removeCompraItem(i) { compraItems.splice(i, 1); renderCompraItems(); }

document.getElementById('btn-add-compra-item').addEventListener('click', async () => {
  if (!window._productosList) {
    const r = await productosAPI.getAll();
    window._productosList = r.data || [];
  }
  compraItems.push({ producto_id: null, cantidad: 1, precio_unitario: 0, es_bonificacion: false });
  renderCompraItems();
});

document.getElementById('btn-guardar-compra').addEventListener('click', async () => {
  const prods = compraItems.filter(i => i.producto_id);
  if (!prods.length) { showWarn('Agrega al menos un producto'); return; }
  const data = {
    productos:     prods,
    monto_efectivo:parseFloat(document.getElementById('compra-efectivo').value) || 0,
    monto_yape:    parseFloat(document.getElementById('compra-yape').value) || 0,
    monto_externo: parseFloat(document.getElementById('compra-externo').value) || 0,
    monto_prestado:parseFloat(document.getElementById('compra-prestamo').value) || 0,
    ajuste_redondeo: parseFloat(document.getElementById('compra-redondeo').value) || 0,
    prestado_descripcion: document.getElementById('compra-prestamo-desc').value.trim()
  };
  try {
    await comprasAPI.create(data);
    showOk('Compra registrada');
    closeModal('modal-compra');
    loadCompras();
    if (window._productosList) window._productosList = null;
  } catch (e) { showErr(e.message); }
});

async function cancelarCompra(id) {
  const ok = await confirm('Cancelar compra', `¿Deseas cancelar la compra #${id}? Se revertirá el stock.`);
  if (!ok) return;
  try { await comprasAPI.cancelar(id); showOk('Compra cancelada'); loadCompras(); }
  catch (e) { showErr(e.message); }
}

/* ============================================================
   CAJA
   ============================================================ */
PAGE_LOADERS.caja = () => { loadCaja(); loadMovimientos(); };

async function loadCaja() {
  try {
    const res = await cajaAPI.get();
    const c = res.data || {};
    const efe = parseFloat(c.saldo_efectivo || 0);
    const yap = parseFloat(c.saldo_yape || 0);
    document.getElementById('caja-efectivo').textContent = fmt(efe);
    document.getElementById('caja-yape').textContent     = fmt(yap);
    document.getElementById('caja-total').textContent    = fmt(efe + yap);
  } catch (e) { showErr(e.message); }
}

async function loadMovimientos(params = '') {
  try {
    const res = await cajaAPI.getMovimientos(params);
    const tbody = document.getElementById('table-movimientos');
    const list = res.data || [];
    if (!list.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)">Sin movimientos</td></tr>'; return; }
    tbody.innerHTML = list.map(m => `
      <tr>
        <td style="white-space:nowrap">${fmtDate(m.fecha)}</td>
        <td><span class="chip ${m.tipo==='entrada'?'chip-success':'chip-danger'}">${m.tipo==='entrada'?'Entrada':'Salida'}</span></td>
        <td>${m.origen || '—'}</td>
        <td>${m.metodo || '—'}</td>
        <td><strong ${m.tipo==='entrada'?'style="color:var(--success)"':'style="color:var(--danger)"'}>${m.tipo==='entrada'?'+':'−'}${fmt(m.monto)}</strong></td>
        <td>${m.descripcion || '—'}</td>
      </tr>`).join('');
  } catch (e) { showErr(e.message); }
}

document.getElementById('btn-filtrar-caja').addEventListener('click', () => {
  const p = new URLSearchParams();
  const fi = document.getElementById('caja-fecha-ini').value;
  const ff = document.getElementById('caja-fecha-fin').value;
  if (fi) p.set('fecha_inicio', fi);
  if (ff) p.set('fecha_fin', ff);
  loadMovimientos(p.toString());
});

document.getElementById('btn-apertura-caja').addEventListener('click', async () => {
  const m = prompt('Monto inicial de efectivo (S/):');
  if (m === null) return;
  const monto = parseFloat(m);
  if (isNaN(monto) || monto < 0) { showWarn('Monto inválido'); return; }
  try { await cajaAPI.apertura({ monto_inicial_efectivo: monto }); showOk('Apertura registrada'); loadCaja(); loadMovimientos(); }
  catch (e) { showErr(e.message); }
});

document.getElementById('btn-movimiento-manual').addEventListener('click', () => {
  document.getElementById('mov-monto').value = '';
  document.getElementById('mov-descripcion').value = '';
  openModal('modal-movimiento');
});
document.getElementById('btn-guardar-movimiento').addEventListener('click', async () => {
  const data = {
    tipo:       document.getElementById('mov-tipo').value,
    metodo:     document.getElementById('mov-metodo').value,
    monto:      parseFloat(document.getElementById('mov-monto').value) || 0,
    descripcion:document.getElementById('mov-descripcion').value.trim()
  };
  if (!data.monto) { showWarn('Ingresa un monto'); return; }
  try { await cajaAPI.movimientoManual(data); showOk('Movimiento registrado'); closeModal('modal-movimiento'); loadCaja(); loadMovimientos(); }
  catch (e) { showErr(e.message); }
});

document.getElementById('btn-ajuste-saldo').addEventListener('click', async () => {
  const res = await cajaAPI.get();
  const c = res.data || {};
  document.getElementById('ajuste-efectivo').value = parseFloat(c.saldo_efectivo || 0).toFixed(2);
  document.getElementById('ajuste-yape').value     = parseFloat(c.saldo_yape || 0).toFixed(2);
  openModal('modal-ajuste');
});
document.getElementById('btn-confirmar-ajuste').addEventListener('click', async () => {
  const data = {
    nuevo_saldo_efectivo: parseFloat(document.getElementById('ajuste-efectivo').value) || 0,
    nuevo_saldo_yape:     parseFloat(document.getElementById('ajuste-yape').value) || 0
  };
  try { await cajaAPI.ajuste(data); showOk('Saldo ajustado'); closeModal('modal-ajuste'); loadCaja(); }
  catch (e) { showErr(e.message); }
});

/* ============================================================
   DEUDAS
   ============================================================ */
PAGE_LOADERS.deudas = () => loadDeudas();

async function loadDeudas(params = '') {
  try {
    const res = await deudasAPI.getAll(params);
    renderDeudas(res.data || []);
  } catch (e) { showErr(e.message); }
}

function renderDeudas(list) {
  const tbody = document.getElementById('table-deudas');
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted)">Sin deudas</td></tr>'; return; }
  tbody.innerHTML = list.map(d => {
    const pagado  = parseFloat(d.total_pagado || 0);
    const total   = parseFloat(d.total_pendiente || 0);
    const saldo   = total - pagado;
    return `<tr>
      <td>${d.id}</td>
      <td><strong>${d.cliente_nombre}</strong><br><small style="color:var(--text-muted)">${d.cliente_telefono||''}</small></td>
      <td>${fmt(total)}</td>
      <td>${fmt(pagado)}</td>
      <td><strong ${saldo > 0 ? 'style="color:var(--danger)"' : ''}>${fmt(saldo)}</strong></td>
      <td><span class="chip ${d.estado==='pagada'?'chip-success':'chip-warning'}">${d.estado==='pagada'?'Pagada':'Pendiente'}</span></td>
      <td>${d.estado!=='pagada'?`<button class="btn btn-primary btn-sm" onclick="abrirPagoDeuda(${d.id},'${d.cliente_nombre}',${saldo})"><i class="fa-solid fa-money-bill"></i> Pagar</button>`:''}</td>
    </tr>`;
  }).join('');
}

document.getElementById('btn-filtrar-deudas').addEventListener('click', () => {
  const p = new URLSearchParams();
  const e = document.getElementById('d-estado').value;
  if (e) p.set('estado', e);
  loadDeudas(p.toString());
});

function abrirPagoDeuda(id, nombre, saldo) {
  document.getElementById('pago-deuda-id').value = id;
  document.getElementById('pago-deuda-info').textContent = `Cliente: ${nombre} — Saldo pendiente: ${fmt(saldo)}`;
  document.getElementById('pago-efectivo').value = '0';
  document.getElementById('pago-yape').value = '0';
  openModal('modal-pagar-deuda');
}

document.getElementById('btn-confirmar-pago').addEventListener('click', async () => {
  const id = document.getElementById('pago-deuda-id').value;
  const data = {
    monto_efectivo: parseFloat(document.getElementById('pago-efectivo').value) || 0,
    monto_yape:     parseFloat(document.getElementById('pago-yape').value) || 0
  };
  if (!data.monto_efectivo && !data.monto_yape) { showWarn('Ingresa al menos un monto'); return; }
  try { await deudasAPI.pagar(id, data); showOk('Pago registrado'); closeModal('modal-pagar-deuda'); loadDeudas(); loadCaja(); }
  catch (e) { showErr(e.message); }
});

/* ============================================================
   PRÉSTAMOS
   ============================================================ */
PAGE_LOADERS.prestamos = () => loadPrestamos();

async function loadPrestamos() {
  try {
    const res = await prestamosAPI.getAll();
    renderPrestamos(res.data || []);
  } catch (e) { showErr(e.message); }
}

function renderPrestamos(list) {
  const tbody = document.getElementById('table-prestamos');
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)">Sin préstamos</td></tr>'; return; }
  tbody.innerHTML = list.map(p => `
    <tr>
      <td>${p.id}</td>
      <td>${p.descripcion}</td>
      <td><strong>${fmt(p.monto)}</strong></td>
      <td style="white-space:nowrap">${fmtDate(p.fecha)}</td>
      <td><span class="chip ${p.estado==='devuelto'?'chip-success':'chip-warning'}">${p.estado==='devuelto'?'Devuelto':'Pendiente'}</span></td>
      <td style="display:flex;gap:6px">
        ${p.estado!=='devuelto'?`<button class="btn btn-success btn-sm" onclick="devolverPrestamo(${p.id})"><i class="fa-solid fa-check"></i></button>`:''}
        <button class="btn btn-danger btn-sm" onclick="eliminarPrestamo(${p.id})"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`).join('');
}

document.getElementById('btn-nuevo-prestamo').addEventListener('click', () => {
  document.getElementById('prestamo-desc').value = '';
  document.getElementById('prestamo-monto').value = '';
  openModal('modal-prestamo');
});
document.getElementById('btn-guardar-prestamo').addEventListener('click', async () => {
  const desc  = document.getElementById('prestamo-desc').value.trim();
  const monto = parseFloat(document.getElementById('prestamo-monto').value);
  if (!desc || isNaN(monto) || monto <= 0) { showWarn('Completa los campos'); return; }
  try { await prestamosAPI.create({ descripcion: desc, monto }); showOk('Préstamo registrado'); closeModal('modal-prestamo'); loadPrestamos(); }
  catch (e) { showErr(e.message); }
});

async function devolverPrestamo(id) {
  const ok = await confirm('Marcar como devuelto', '¿Confirmas que este préstamo fue devuelto?');
  if (!ok) return;
  try { await prestamosAPI.devolver(id); showOk('Marcado como devuelto'); loadPrestamos(); }
  catch (e) { showErr(e.message); }
}

async function eliminarPrestamo(id) {
  const ok = await confirm('Eliminar préstamo', '¿Deseas eliminar este registro?');
  if (!ok) return;
  try { await prestamosAPI.delete(id); showOk('Eliminado'); loadPrestamos(); }
  catch (e) { showErr(e.message); }
}

/* ============================================================
   CLIENTES
   ============================================================ */
PAGE_LOADERS.clientes = () => loadClientes();

async function loadClientes(q = '') {
  try {
    const res = q ? await clientesAPI.getAll(q) : await clientesAPI.getAll();
    renderClientes(res.data || []);
  } catch (e) { showErr(e.message); }
}

function renderClientes(list) {
  const tbody = document.getElementById('table-clientes');
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted)">Sin clientes</td></tr>'; return; }
  tbody.innerHTML = list.map(c => `
    <tr>
      <td>${c.id}</td>
      <td><strong>${c.nombre}</strong></td>
      <td>${c.telefono || '—'}</td>
      <td>${c.tiene_cuenta ? '<span class="chip chip-success">Sí</span>' : '<span class="chip chip-secondary">No</span>'}</td>
      <td style="display:flex;gap:6px">
        <button class="btn btn-outline btn-sm" onclick="editarCliente(${c.id})"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-danger btn-sm"  onclick="eliminarCliente(${c.id})"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`).join('');
}

let cliSearchTimer;
document.getElementById('cli-search').addEventListener('input', e => {
  clearTimeout(cliSearchTimer);
  cliSearchTimer = setTimeout(() => loadClientes(e.target.value.trim()), 300);
});

document.getElementById('btn-nuevo-cliente').addEventListener('click', () => {
  document.getElementById('cliente-id').value = '';
  document.getElementById('cliente-nombre').value = '';
  document.getElementById('cliente-telefono').value = '';
  document.getElementById('cliente-cuenta').checked = false;
  document.getElementById('modal-cliente-title').textContent = 'Nuevo Cliente';
  openModal('modal-cliente');
});

async function editarCliente(id) {
  try {
    const res = await clientesAPI.getById(id);
    const c = res.data;
    document.getElementById('cliente-id').value       = c.id;
    document.getElementById('cliente-nombre').value   = c.nombre;
    document.getElementById('cliente-telefono').value = c.telefono || '';
    document.getElementById('cliente-cuenta').checked = !!c.tiene_cuenta;
    document.getElementById('modal-cliente-title').textContent = 'Editar Cliente';
    openModal('modal-cliente');
  } catch (e) { showErr(e.message); }
}

document.getElementById('btn-guardar-cliente').addEventListener('click', async () => {
  const id     = document.getElementById('cliente-id').value;
  const nombre = document.getElementById('cliente-nombre').value.trim();
  if (!nombre) { showWarn('El nombre es requerido'); return; }
  const data = {
    nombre,
    telefono:    document.getElementById('cliente-telefono').value.trim() || null,
    tiene_cuenta:document.getElementById('cliente-cuenta').checked
  };
  try {
    if (id) await clientesAPI.update(id, data);
    else    await clientesAPI.create(data);
    showOk('Cliente guardado');
    closeModal('modal-cliente');
    loadClientes();
    loadClientesSelect();
  } catch (e) { showErr(e.message); }
});

async function eliminarCliente(id) {
  const ok = await confirm('Eliminar cliente', '¿Deseas eliminar este cliente?');
  if (!ok) return;
  try { await clientesAPI.delete(id); showOk('Cliente eliminado'); loadClientes(); }
  catch (e) { showErr(e.message); }
}

/* ============================================================
   INIT
   ============================================================ */
PAGE_LOADERS.pos();
