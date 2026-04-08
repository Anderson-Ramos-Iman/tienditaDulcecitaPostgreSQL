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
function sinTildes(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
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
const token = sessionStorage.getItem('token');
const user  = JSON.parse(sessionStorage.getItem('user') || '{}');
if (!token) { window.location.replace('/login'); }

document.getElementById('user-name').textContent    = user.nombre || 'Admin';
document.getElementById('user-initial').textContent = (user.nombre || 'A')[0].toUpperCase();

document.getElementById('btn-logout').addEventListener('click', () => {
  openModal('modal-logout-confirm');
});

document.getElementById('btn-logout-confirm').addEventListener('click', () => {
  sessionStorage.clear();
  window.location.replace('/login');
});

/* ============================================================
   NAVIGATION
   ============================================================ */
const PAGE_TITLES = {
  pos: 'Nueva Venta', ventas: 'Ventas', productos: 'Productos',
  categorias: 'Categorías', compras: 'Compras', caja: 'Caja',
  deudas: 'Deudas', prestamos: 'Préstamos', clientes: 'Clientes'
};
const PAGE_LOADERS = {};

function navigateTo(page) {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.page === page));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === `page-${page}`));
  document.getElementById('page-title').textContent = PAGE_TITLES[page] || page;
  localStorage.setItem('lastPage', page);
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
    allProductosPOS = (res.data || []).filter(p => p.activo != 0);
    renderPOSProducts(allProductosPOS);
    await loadClientesSelect();
  } catch (e) { showErr(e.message); }
};

function renderPOSProducts(list) {
  const grid = document.getElementById('pos-products');
  if (!list.length) { grid.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:16px">Sin productos</p>'; return; }
  grid.innerHTML = list.map(p => {
    const agotado = p.stock <= 0;
    const stockChip = p.stock > 5
      ? `<span style="background:#fef9c3;color:#854d0e;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600;display:inline-block">Stock: ${p.stock}</span>`
      : p.stock > 0
        ? `<span style="background:#fef3c7;color:#92400e;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600;display:inline-block">Poco: ${p.stock}</span>`
        : `<span style="background:#fee2e2;color:#b91c1c;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600;display:inline-block">Sin stock</span>`;
    const tipoLabel = p.tipo_venta === 'por_peso' ? 'Por peso / kg' : 'Por unidad';
    return `
    <div class="product-card${agotado ? ' product-card--agotado' : ''}" data-id="${p.id}"
         style="display:flex;flex-direction:column;background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;overflow:visible;cursor:${agotado?'not-allowed':'pointer'}">
      <div style="position:relative;width:100%;height:110px;flex-shrink:0;background:#f1f5f9;border-radius:9px 9px 0 0;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:28px;color:#cbd5e1">
        ${p.imagen_url ? `<img src="${p.imagen_url}" alt="${p.nombre}" style="width:100%;height:110px;object-fit:cover;display:block" onerror="this.parentElement.innerHTML='<i class=\'fa-solid fa-box\'></i>'">` : '<i class="fa-solid fa-box"></i>'}
        ${agotado ? '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35);color:#fff;font-size:11px;font-weight:700;letter-spacing:.04em">Agotado</div>' : ''}
      </div>
      <div style="padding:10px;border-top:1px solid #f1f5f9">
        <div style="font-weight:600;font-size:13px;margin-bottom:4px;line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${p.nombre}</div>
        <div style="color:var(--primary,#3b82f6);font-weight:800;font-size:15px">${fmt(p.precio_base)}</div>
        <div style="font-size:11px;color:#94a3b8;margin-top:2px">${tipoLabel}</div>
        <div style="margin-top:6px">${stockChip}</div>
      </div>
    </div>`;
  }).join('');
  grid.querySelectorAll('.product-card:not(.product-card--agotado)').forEach(card => {
    card.addEventListener('click', () => addToCart(parseInt(card.dataset.id)));
  });
}

let posSearchTimer;
document.getElementById('pos-search').addEventListener('input', e => {
  clearTimeout(posSearchTimer);
  posSearchTimer = setTimeout(() => {
    const q = sinTildes(e.target.value.trim());
    renderPOSProducts(q ? allProductosPOS.filter(p => sinTildes(p.nombre).includes(q)) : allProductosPOS);
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

let _ventaDataPendiente = null;

document.getElementById('btn-completar-venta').addEventListener('click', () => mostrarConfirmacionVenta());

function mostrarConfirmacionVenta() {
  if (!carrito.length) { showWarn('El carrito está vacío'); return; }
  const tipoPago = document.getElementById('payment-type').value;
  if (!tipoPago) { showWarn('Seleccione un tipo de pago'); return; }
  const redondeo  = parseFloat(document.getElementById('cart-redondeo').value) || 0;
  const subtotal  = carrito.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
  const total     = subtotal + redondeo;

  const ventaData = {
    tipo_pago: tipoPago, redondeo,
    productos: carrito.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad, precio_unitario: i.precio_unitario }))
  };

  if (tipoPago === 'mixto') {
    ventaData.monto_efectivo = parseFloat(document.getElementById('mixto-efectivo').value) || 0;
    ventaData.monto_yape     = parseFloat(document.getElementById('mixto-yape').value) || 0;
  } else if (tipoPago === 'deuda') {
    const clienteId = document.getElementById('select-cliente').value;
    if (!clienteId) { showWarn('Seleccione un cliente para venta a deuda'); return; }
    ventaData.cliente_id = parseInt(clienteId);
  } else if (tipoPago === 'efectivo') {
    ventaData.monto_efectivo = parseFloat(document.getElementById('monto-recibido').value) || 0;
  }

  _ventaDataPendiente = ventaData;

  const tipoLabels = { efectivo: 'Efectivo', yape: 'Yape', deuda: 'Deuda', mixto: 'Mixto (Efectivo + Yape)', cortesia: 'Cortesía (gratis)' };
  let clienteHtml = '';
  if (tipoPago === 'deuda') {
    const sel = document.getElementById('select-cliente');
    const nombre = sel.options[sel.selectedIndex]?.text || '';
    clienteHtml = `<div style="display:flex;justify-content:space-between;font-size:13px;background:#fef9c3;padding:8px 12px;border-radius:8px;margin-top:4px">
      <span style="color:var(--text-muted)">Cliente</span><strong>${nombre}</strong></div>`;
  }

  const itemsHtml = carrito.map(i => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px">
      <div><strong>${i.nombre}</strong><span style="color:var(--text-muted);margin-left:8px">x${i.cantidad} × ${fmt(i.precio_unitario)}</span></div>
      <div style="font-weight:600">${fmt(i.cantidad * i.precio_unitario)}</div>
    </div>`).join('');

  document.getElementById('confirm-venta-detalle').innerHTML = `
    <div style="max-height:220px;overflow-y:auto;margin-bottom:14px">${itemsHtml}</div>
    <div style="border-top:2px solid #e2e8f0;padding-top:12px;display:flex;flex-direction:column;gap:6px">
      <div style="display:flex;justify-content:space-between;font-size:13px"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
      ${redondeo !== 0 ? `<div style="display:flex;justify-content:space-between;font-size:13px"><span>Redondeo</span><span>${redondeo > 0 ? '+' : ''}${fmt(redondeo)}</span></div>` : ''}
      <div style="display:flex;justify-content:space-between;font-size:17px;font-weight:800;color:var(--primary)"><span>TOTAL</span><span>${fmt(total)}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;background:#f8fafc;padding:8px 12px;border-radius:8px;margin-top:4px">
        <span style="color:var(--text-muted)">Tipo de pago</span><strong>${tipoLabels[tipoPago] || tipoPago}</strong></div>
      ${clienteHtml}
    </div>`;

  document.getElementById('modal-confirm-venta').classList.remove('hidden');
}

function cerrarConfirmVenta() {
  document.getElementById('modal-confirm-venta').classList.add('hidden');
  _ventaDataPendiente = null;
}

async function confirmarVentaFinal() {
  if (!_ventaDataPendiente) return;
  const btn = document.getElementById('btn-confirmar-venta-final');
  btn.disabled = true;
  try {
    await ventasAPI.create(_ventaDataPendiente);
    cerrarConfirmVenta();
    showOk('✅ Venta completada correctamente');
    resetCartForm();
    await PAGE_LOADERS.pos();
  } catch (e) { showErr(e.message); }
  finally { btn.disabled = false; }
}

function resetCartForm() {
  carrito = [];
  document.getElementById('cart-redondeo').value   = '0';
  document.getElementById('monto-recibido').value   = '';
  document.getElementById('mixto-efectivo').value   = '';
  document.getElementById('mixto-yape').value       = '';
  document.getElementById('payment-type').value     = '';
  document.getElementById('select-cliente').value   = '';
  handlePaymentTypeChange();
  renderCart();
}

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

PAGE_LOADERS.ventas = async () => {
  loadVentas();
  const sel = document.getElementById('v-cliente');
  if (sel.options.length <= 1) {
    try {
      const r = await clientesAPI.getAll();
      (r.data || []).forEach(c => {
        const o = document.createElement('option'); o.value = c.id; o.textContent = c.nombre; sel.appendChild(o);
      });
    } catch {}
  }
};

async function loadVentas(params = '') {
  try {
    const res = await ventasAPI.getAll(params);
    _allVentas = res.data || [];
    renderVentas(_allVentas);
  } catch (e) { showErr(e.message); }
}

function renderTipoPagoCell(v) {
  if (v.tipo_pago === 'efectivo') return '<span class="chip chip-success">Efectivo</span>';
  if (v.tipo_pago === 'yape')     return '<span class="chip chip-primary" style="background:#cffafe;color:#0e7490">Yape</span>';
  if (v.tipo_pago === 'mixto')    return '<span class="chip chip-warning">Mixto</span>';
  if (v.tipo_pago === 'cortesia') return '<span class="chip chip-secondary">Cortesía</span>';
  if (v.tipo_pago === 'deuda') {
    const pagado   = parseFloat(v.deuda_pagado  || 0);
    const total_d  = parseFloat(v.deuda_total   || v.total || 0);
    const pendiente = Math.max(0, total_d - pagado);
    const pagada    = v.deuda_estado === 'pagada' || pendiente < 0.01;
    const sub = pagada
      ? `<div style="font-size:10px;color:var(--success);margin-top:3px"><i class="fa-solid fa-check"></i> Pagada</div>`
      : `<div style="font-size:10px;color:#f59e0b;margin-top:3px">● Pendiente (${fmt(pendiente)})</div>`;
    return `<span class="chip chip-danger">Deuda</span>${sub}`;
  }
  return `<span class="chip chip-secondary">${v.tipo_pago}</span>`;
}

function renderVentas(list) {
  const tbody = document.getElementById('table-ventas');
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)">Sin resultados</td></tr>'; return; }
  tbody.innerHTML = list.map(v => {
    const anulada = v.estado === 'anulada';
    const clienteHtml = v.cliente_nombre
      ? `<span style="color:var(--primary);font-weight:500">${v.cliente_nombre}</span>`
      : `<span style="color:var(--text-muted)">Sin cliente</span>`;
    return `<tr style="${anulada ? 'opacity:.5' : ''}">
      <td><strong style="color:var(--text)">#${v.id}</strong></td>
      <td style="white-space:nowrap;color:var(--text-muted)">${fmtDate(v.fecha)}</td>
      <td>${clienteHtml}</td>
      <td><strong>${fmt(v.total)}</strong></td>
      <td>${renderTipoPagoCell(v)}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-sm" title="Ver detalle" onclick="verDetalleVenta(${v.id})"><i class="fa-solid fa-eye"></i></button>
          ${!anulada ? `<button class="btn btn-danger btn-sm" title="Anular venta" onclick="anularVenta(${v.id})"><i class="fa-solid fa-ban"></i></button>` : `<span class="chip chip-danger" style="font-size:10px">Anulada</span>`}
        </div>
      </td>
    </tr>`;
  }).join('');
}

async function verDetalleVenta(id) {
  openModal('modal-venta-detalle');
  document.getElementById('venta-detalle-titulo').textContent = `Venta #${id}`;
  const body = document.getElementById('venta-detalle-body');
  body.innerHTML = '<p style="text-align:center;padding:24px;color:var(--text-muted)"><i class="fa-solid fa-spinner fa-spin"></i> Cargando...</p>';
  try {
    const res  = await ventasAPI.getById(id);
    const v    = res.data;
    const dets = v.detalles || [];
    body.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:20px;margin-bottom:18px;padding:14px;background:var(--bg);border-radius:10px">
        <div><div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Fecha</div><div>${fmtDate(v.fecha)}</div></div>
        <div><div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Cliente</div><div>${v.cliente_nombre || 'Sin cliente'}</div></div>
        <div><div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Tipo Pago</div><div>${TIPO_PAGO_LABELS[v.tipo_pago] || v.tipo_pago}</div></div>
        <div><div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Total</div><div style="font-weight:800;font-size:18px;color:var(--primary)">${fmt(v.total)}</div></div>
      </div>
      <div class="card" style="padding:0;overflow:hidden">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Producto</th><th style="text-align:center">Cantidad</th><th style="text-align:right">Precio Unit.</th><th style="text-align:right">Subtotal</th></tr></thead>
            <tbody>
              ${dets.length ? dets.map(d => `
                <tr>
                  <td>${d.producto_nombre}${d.es_bonificacion ? ' <span class="chip chip-warning" style="font-size:10px">Bonif.</span>' : ''}</td>
                  <td style="text-align:center">${d.cantidad}</td>
                  <td style="text-align:right">${fmt(d.precio_unitario)}</td>
                  <td style="text-align:right"><strong>${fmt(d.cantidad * parseFloat(d.precio_unitario))}</strong></td>
                </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;padding:16px;color:var(--text-muted)">Sin detalle</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch (e) {
    body.innerHTML = `<p style="color:var(--danger);text-align:center;padding:20px">${e.message}</p>`;
  }
}

async function anularVenta(id) {
  const ok = await confirm('Anular venta', `¿Seguro que deseas anular la venta #${id}? Esta acción revertirá el stock y los movimientos de caja.`);
  if (!ok) return;
  try { await ventasAPI.anular(id); showOk('Venta anulada'); loadVentas(); }
  catch (e) { showErr(e.message); }
}

document.getElementById('btn-filtrar-ventas').addEventListener('click', () => {
  const fi  = document.getElementById('v-fecha-ini').value;
  const ff  = document.getElementById('v-fecha-fin').value;
  const t   = document.getElementById('v-tipo').value;
  const cli = document.getElementById('v-cliente').value;
  const vid = document.getElementById('v-id').value;
  const p   = new URLSearchParams();
  if (fi)  p.set('fecha_inicio', fi);
  if (ff)  p.set('fecha_fin', ff);
  if (t)   p.set('tipo_pago', t);
  if (cli) p.set('cliente_id', cli);
  loadVentas(p.toString()).then(() => {
    if (vid) {
      const id = parseInt(vid);
      renderVentas(_allVentas.filter(v => v.id === id));
    }
  });
});

document.getElementById('btn-limpiar-ventas').addEventListener('click', () => {
  document.getElementById('v-id').value        = '';
  document.getElementById('v-fecha-ini').value = '';
  document.getElementById('v-fecha-fin').value = '';
  document.getElementById('v-tipo').value      = '';
  document.getElementById('v-cliente').value   = '';
  loadVentas();
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
PAGE_LOADERS.productos = () => { loadProductos(); loadCategoriasCheckboxes(); };

let _allCategorias    = [];
let _lastProductos    = [];
let _prodSort         = { field: 'nombre', dir: 'asc' };
let _prodCatFilter    = new Set();
let _prodSearchQuery  = '';

async function loadCategoriasCheckboxes(selectedIds = []) {
  try {
    const res = await categoriasAPI.getAll();
    _allCategorias = res.data || [];
    renderCategoriasCheckboxes(selectedIds);
    renderProdCatSidebar();
  } catch (e) { /* silencioso */ }
}

function renderProdCatSidebar() {
  const wrap = document.getElementById('prod-cat-sidebar');
  if (!wrap) return;
  const all = [{ id: null, nombre: 'Todas', icono: '' }, ..._allCategorias];
  wrap.innerHTML = all.map(c => {
    const isAll  = c.id === null;
    const active = isAll ? _prodCatFilter.size === 0 : _prodCatFilter.has(c.id);
    return `<div onclick="toggleProdCatFilter(${c.id === null ? 'null' : c.id})"
      style="display:flex;align-items:center;gap:8px;padding:9px 14px;cursor:pointer;
             font-size:13px;font-weight:${active ? '600' : '400'};
             color:${active ? 'var(--primary)' : 'var(--text)'};
             background:${active ? '#eff6ff' : '#fff'};
             border-bottom:1px solid #f8fafc;transition:background .1s"
      onmouseover="if(this.style.background!=='rgb(239,246,255)')this.style.background='#f8fafc'"
      onmouseout="this.style.background='${active ? '#eff6ff' : '#fff'}'">
      <span style="width:14px;flex-shrink:0">${active ? '<i class="fa-solid fa-check" style="font-size:10px;color:var(--primary)"></i>' : ''}</span>
      ${c.icono ? `<span>${c.icono}</span>` : ''}
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.nombre}</span>
    </div>`;
  }).join('');
}

function toggleProdCatFilter(id) {
  if (id === 'null' || id === null) {
    _prodCatFilter.clear();
  } else {
    const cid = parseInt(id);
    if (_prodCatFilter.has(cid)) _prodCatFilter.delete(cid);
    else                         _prodCatFilter.add(cid);
  }
  renderProdCatSidebar();
  renderProductos(_lastProductos);
}

function renderCategoriasCheckboxes(selectedIds = []) {
  const wrap = document.getElementById('prod-categorias-check');
  if (!_allCategorias.length) {
    wrap.innerHTML = '<span style="color:var(--text-muted);font-size:13px">Sin categorías — créalas primero</span>';
    return;
  }
  wrap.innerHTML = _allCategorias.map(c => {
    const checked = selectedIds.includes(c.id) ? 'checked' : '';
    return `<label style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;
      border-radius:99px;border:1.5px solid var(--border);background:#fff;
      cursor:pointer;font-size:13px;font-weight:500;user-select:none">
      <input type="checkbox" value="${c.id}" ${checked} style="accent-color:var(--primary)">
      ${c.icono} ${c.nombre}
    </label>`;
  }).join('');
}

function setSortProd(val) {
  const [field, dir] = val.split(':');
  _prodSort = { field, dir };
  updateSortIcons();
  renderProductos(_lastProductos);
}

function clickSortProd(field) {
  if (_prodSort.field === field) {
    _prodSort.dir = _prodSort.dir === 'asc' ? 'desc' : 'asc';
  } else {
    _prodSort.field = field;
    _prodSort.dir   = (field === 'stock' || field === 'precio_base') ? 'desc' : 'asc';
  }
  const sel = document.getElementById('prod-sort-select');
  if (sel) sel.value = `${_prodSort.field}:${_prodSort.dir}`;
  updateSortIcons();
  renderProductos(_lastProductos);
}

function updateSortIcons() {
  const fields = ['id', 'nombre', 'precio_base', 'stock'];
  fields.forEach(f => {
    const el = document.getElementById(`sort-icon-${f}`);
    if (!el) return;
    if (_prodSort.field === f) {
      el.textContent = _prodSort.dir === 'asc' ? '↑' : '↓';
      el.style.color = 'var(--primary)';
    } else {
      el.textContent = '';
    }
  });
}

async function loadProductos(q = '') {
  try {
    const res = q ? await productosAPI.getAll(q) : await productosAPI.getAll();
    renderProductos(res.data || []);
  } catch (e) { showErr(e.message); }
}

function renderProductos(list) {
  _lastProductos = list;
  let filtered = _prodCatFilter.size > 0
    ? list.filter(p => (p.categorias || []).some(c => _prodCatFilter.has(c.id)))
    : list;
  if (_prodSearchQuery)
    filtered = filtered.filter(p => sinTildes(p.nombre).includes(_prodSearchQuery));
  const { field, dir } = _prodSort;
  const sorted = [...filtered].sort((a, b) => {
    let va = a[field] ?? '', vb = b[field] ?? '';
    if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    else { va = parseFloat(va) || 0; vb = parseFloat(vb) || 0; }
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
  updateSortIcons();
  const tbody = document.getElementById('table-productos');
  if (!sorted.length) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted)">Sin productos</td></tr>'; return; }
  tbody.innerHTML = sorted.map(p => {
    const cats = (p.categorias || []);
    const catsHtml = cats.length
      ? cats.map(c => `<span style="display:inline-flex;align-items:center;gap:3px;background:#f1f5f9;color:var(--text);border-radius:99px;padding:2px 8px;font-size:11px;font-weight:500;white-space:nowrap">${c.icono || ''} ${c.nombre}</span>`).join(' ')
      : `<span style="color:var(--text-muted);font-size:12px">—</span>`;
    return `
    <tr>
      <td>${p.id}</td>
      <td><strong>${p.nombre}</strong></td>
      <td>${fmt(p.precio_base)}</td>
      <td><span class="chip ${p.stock > 5 ? 'chip-success' : p.stock > 0 ? 'chip-warning' : 'chip-danger'}">${p.stock}</span></td>
      <td>${p.tipo_venta === 'por_peso' ? 'Por peso' : 'Por unidad'}</td>
      <td style="max-width:200px"><div style="display:flex;flex-wrap:wrap;gap:4px">${catsHtml}</div></td>
      <td>${p.activo != 0 ? '<span class="chip chip-success">Activo</span>' : '<span class="chip chip-secondary">Inactivo</span>'}</td>
      <td style="display:flex;gap:6px">
        <button class="btn btn-outline btn-sm" onclick="editarProducto(${p.id})"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-danger btn-sm"  onclick="eliminarProducto(${p.id})"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('');
}

let prodSearchTimer;
document.getElementById('prod-search').addEventListener('input', e => {
  clearTimeout(prodSearchTimer);
  prodSearchTimer = setTimeout(() => {
    _prodSearchQuery = sinTildes(e.target.value.trim());
    renderProductos(_lastProductos);
  }, 300);
});

function setStockLocked(locked) {
  const input = document.getElementById('prod-stock');
  const btn   = document.getElementById('btn-unlock-stock');
  const icon  = document.getElementById('lock-stock-icon');
  input.readOnly = locked;
  input.style.background = locked ? '#f1f5f9' : '';
  btn.style.display = locked ? 'flex' : 'none';
  icon.className = locked ? 'fa-solid fa-lock' : 'fa-solid fa-lock-open';
  btn.className = locked
    ? 'btn btn-outline btn-sm'
    : 'btn btn-sm' + ' ' + 'btn-success';
}

document.getElementById('btn-nuevo-producto').addEventListener('click', () => {
  document.getElementById('prod-id').value     = '';
  document.getElementById('prod-nombre').value = '';
  document.getElementById('prod-precio').value = '';
  document.getElementById('prod-stock').value  = '0';
  document.getElementById('prod-tipo').value   = 'unidad';
  document.getElementById('prod-imagen').value = '';
  setStockLocked(false);
  renderCategoriasCheckboxes([]);
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
    document.getElementById('prod-tipo').value  = p.tipo_venta;
    document.getElementById('prod-imagen').value = p.imagen_url || '';
    setStockLocked(true);
    const selectedIds = (p.categorias || []).map(c => c.id);
    renderCategoriasCheckboxes(selectedIds);
    document.getElementById('modal-producto-title').textContent = 'Editar Producto';
    openModal('modal-producto');
  } catch (e) { showErr(e.message); }
}

document.getElementById('btn-guardar-producto').addEventListener('click', async () => {
  const id     = document.getElementById('prod-id').value;
  const nombre = document.getElementById('prod-nombre').value.trim();
  const precio = parseFloat(document.getElementById('prod-precio').value);
  if (!nombre || isNaN(precio)) { showWarn('Completa los campos requeridos'); return; }

  const checkedBoxes = document.querySelectorAll('#prod-categorias-check input[type=checkbox]:checked');
  const stockLocked = document.getElementById('prod-stock').readOnly;
  const data = {
    nombre, precio_base: precio,
    tipo_venta: document.getElementById('prod-tipo').value,
    imagen_url: document.getElementById('prod-imagen').value.trim() || null,
    categorias: Array.from(checkedBoxes).map(cb => parseInt(cb.value))
  };
  if (!id || !stockLocked) {
    data.stock = parseInt(document.getElementById('prod-stock').value) || 0;
  }
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

document.getElementById('btn-unlock-stock').addEventListener('click', () => {
  document.getElementById('stock-pwd-input').value = '';
  openModal('modal-stock-pwd');
});

document.getElementById('btn-confirm-stock-pwd').addEventListener('click', async () => {
  const pwd = document.getElementById('stock-pwd-input').value;
  if (!pwd) { showWarn('Ingresa la contraseña'); return; }
  try {
    await authAPI.verifyPassword(pwd);
    setStockLocked(false);
    document.getElementById('prod-stock').focus();
    closeModal('modal-stock-pwd');
    showOk('Stock desbloqueado');
  } catch (e) {
    showErr('Contraseña incorrecta');
  }
});

/* ============================================================
   COMPRAS
   ============================================================ */
let compraItems = [];
let _allCompras = [];
let _allProductosCompra = [];

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

async function abrirModalCompra() {
  compraItems = [];
  renderCompraItemsTable();
  document.getElementById('compra-efectivo').value = '0';
  document.getElementById('compra-yape').value = '0';
  document.getElementById('compra-externo').value = '0';
  document.getElementById('compra-prestamo').value = '0';
  document.getElementById('compra-redondeo').value = '0';
  document.getElementById('compra-prestamo-desc').value = '';
  document.getElementById('compra-add-prod').value = '';
  document.getElementById('compra-prod-input').value = '';
  document.getElementById('compra-prod-input').style.borderColor = '';
  document.getElementById('compra-prod-dropdown').style.display = 'none';
  document.getElementById('compra-add-cant').value = '1';
  document.getElementById('compra-add-monto').value = '0.00';
  document.getElementById('compra-add-precio-ref').value = '';
  document.getElementById('compra-add-bonif').checked = false;
  document.getElementById('compra-total-calc').textContent = 'S/ 0.00';

  try {
    const r = await productosAPI.getAllForCompras();
    _allProductosCompra = r.data || [];
  } catch {}
  openModal('modal-compra');
}

document.getElementById('btn-nueva-compra').addEventListener('click', abrirModalCompra);

/* ── Combobox de producto para compras ── */
(function initCompraProdCombobox() {
  const input    = document.getElementById('compra-prod-input');
  const hidden   = document.getElementById('compra-add-prod');
  const dropdown = document.getElementById('compra-prod-dropdown');

  function renderDropdown(q) {
    const list = q
      ? _allProductosCompra.filter(p => sinTildes(p.nombre).includes(sinTildes(q)))
      : _allProductosCompra.slice(0, 80);
    if (!list.length) {
      dropdown.innerHTML = '<div style="padding:10px 14px;color:var(--text-muted);font-size:13px">Sin resultados</div>';
    } else {
      dropdown.innerHTML = list.map(p =>
        `<div data-id="${p.id}" data-nombre="${p.nombre.replace(/"/g,'&quot;')}"
          style="padding:9px 14px;cursor:pointer;font-size:13px;border-bottom:1px solid #f1f5f9;
                 display:flex;justify-content:space-between;align-items:center;gap:8px">
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.nombre}${p.activo==0?' <span style="color:#94a3b8;font-size:11px">(inactivo)</span>':''}</span>
          <span style="font-size:11px;color:var(--text-muted);background:#f1f5f9;padding:2px 7px;border-radius:99px;flex-shrink:0">Stock: ${p.stock}</span>
        </div>`
      ).join('');
    }
    dropdown.style.display = 'block';
    dropdown.querySelectorAll('[data-id]').forEach(el => {
      el.addEventListener('mouseenter', () => el.style.background = '#eff6ff');
      el.addEventListener('mouseleave', () => el.style.background = '');
      el.addEventListener('click', () => {
        hidden.value = el.dataset.id;
        input.value  = el.dataset.nombre;
        input.style.borderColor = 'var(--primary)';
        dropdown.style.display  = 'none';
      });
    });
  }

  input.addEventListener('input', () => {
    hidden.value = '';
    input.style.borderColor = '';
    renderDropdown(input.value.trim());
  });
  input.addEventListener('focus', () => renderDropdown(input.value.trim()));

  document.addEventListener('click', e => {
    if (!input.closest('[style*="position:relative"]').contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
})();

function calcPrecioRef() {
  const cant  = parseFloat(document.getElementById('compra-add-cant').value) || 0;
  const monto = parseFloat(document.getElementById('compra-add-monto').value) || 0;
  const ref   = document.getElementById('compra-add-precio-ref');
  const bonif = document.getElementById('compra-add-bonif').checked;
  if (bonif) { ref.value = 'Bonif.'; return; }
  ref.value = (cant > 0 && monto > 0) ? (monto / cant).toFixed(4) : '';
}

document.getElementById('compra-add-cant').addEventListener('input', calcPrecioRef);
document.getElementById('compra-add-monto').addEventListener('input', calcPrecioRef);
document.getElementById('compra-add-bonif').addEventListener('change', calcPrecioRef);

document.getElementById('btn-add-compra-item').addEventListener('click', () => {
  const prodId  = parseInt(document.getElementById('compra-add-prod').value);
  const prodNom = document.getElementById('compra-prod-input').value.trim();
  const cant    = parseFloat(document.getElementById('compra-add-cant').value) || 1;
  const monto   = parseFloat(document.getElementById('compra-add-monto').value) || 0;
  const bonif   = document.getElementById('compra-add-bonif').checked;

  if (!prodId) { showWarn('Selecciona un producto'); return; }

  const precioUnit = bonif ? 0 : (cant > 0 ? monto / cant : 0);
  const subtotal   = bonif ? 0 : parseFloat((cant * precioUnit).toFixed(2));

  compraItems.push({ producto_id: prodId, nombre: prodNom, cantidad: cant, monto_total_paquete: monto, precio_unitario: parseFloat(precioUnit.toFixed(4)), subtotal, es_bonificacion: bonif });
  renderCompraItemsTable();

  document.getElementById('compra-add-prod').value = '';
  document.getElementById('compra-prod-input').value = '';
  document.getElementById('compra-prod-input').style.borderColor = '';
  document.getElementById('compra-prod-dropdown').style.display = 'none';
  document.getElementById('compra-add-cant').value = '1';
  document.getElementById('compra-add-monto').value = '0.00';
  document.getElementById('compra-add-precio-ref').value = '';
  document.getElementById('compra-add-bonif').checked = false;
});

function renderCompraItemsTable() {
  const tbody = document.getElementById('compra-items-table');
  if (!compraItems.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted)">Sin productos agregados</td></tr>';
    document.getElementById('compra-total-calc').textContent = 'S/ 0.00';
    return;
  }
  tbody.innerHTML = compraItems.map((item, i) => `
    <tr>
      <td>
        ${item.nombre}
        ${item.es_bonificacion ? '<span class="chip chip-warning" style="margin-left:6px;font-size:10px"><i class="fa-solid fa-gift"></i> Bonif.</span>' : ''}
      </td>
      <td style="text-align:center">${item.cantidad}</td>
      <td style="text-align:right">${item.es_bonificacion ? '—' : fmt(item.precio_unitario)}</td>
      <td style="text-align:right">${item.es_bonificacion ? '<span style="color:var(--text-muted)">Gratis</span>' : fmt(item.subtotal)}</td>
      <td style="text-align:center">
        <button class="btn btn-danger btn-sm" onclick="removeCompraItem(${i})"><i class="fa-solid fa-xmark"></i></button>
      </td>
    </tr>`).join('');

  const total = compraItems.reduce((s, i) => s + (i.es_bonificacion ? 0 : i.subtotal), 0);
  const redondeo = parseFloat(document.getElementById('compra-redondeo').value) || 0;
  document.getElementById('compra-total-calc').textContent = fmt(total - redondeo);
}

function removeCompraItem(i) { compraItems.splice(i, 1); renderCompraItemsTable(); }

document.getElementById('compra-redondeo').addEventListener('input', renderCompraItemsTable);

document.getElementById('btn-guardar-compra').addEventListener('click', async () => {
  if (!compraItems.length) { showWarn('Agrega al menos un producto'); return; }
  const data = {
    productos: compraItems.map(i => ({
      producto_id:    i.producto_id,
      cantidad:       i.cantidad,
      precio_unitario:i.precio_unitario,
      es_bonificacion:i.es_bonificacion
    })),
    monto_efectivo:      parseFloat(document.getElementById('compra-efectivo').value) || 0,
    monto_yape:          parseFloat(document.getElementById('compra-yape').value) || 0,
    monto_externo:       parseFloat(document.getElementById('compra-externo').value) || 0,
    monto_prestado:      parseFloat(document.getElementById('compra-prestamo').value) || 0,
    ajuste_redondeo:     parseFloat(document.getElementById('compra-redondeo').value) || 0,
    prestado_descripcion:document.getElementById('compra-prestamo-desc').value.trim()
  };
  try {
    await comprasAPI.create(data);
    showOk('Compra registrada');
    closeModal('modal-compra');
    loadCompras();
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
PAGE_LOADERS.caja = () => { loadCaja(); loadMovimientos(); loadCajaPrestamos(); };

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

async function loadCajaPrestamos() {
  try {
    const res = await prestamosAPI.getAll();
    const list = res.data || [];
    const pendientes = list.filter(p => p.estado !== 'devuelto');
    const total = pendientes.reduce((s, p) => s + parseFloat(p.monto || 0), 0);
    document.getElementById('caja-prestado').textContent = fmt(total);
    renderCajaPrestamos(pendientes, total);
  } catch (e) { showErr(e.message); }
}

function renderCajaPrestamos(list, total) {
  const sec = document.getElementById('caja-prestamos-section');
  if (!list.length) { sec.innerHTML = ''; return; }
  sec.innerHTML = `
    <div style="background:#fffbeb;border:1.5px solid #f59e0b;border-radius:10px;padding:14px 16px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px;color:#92400e">
          <i class="fa-solid fa-hand-holding-dollar" style="color:#f59e0b"></i> Dinero Prestado
          <span style="background:#f59e0b;color:#fff;font-size:11px;font-weight:700;padding:2px 10px;border-radius:99px">${fmt(total)}</span>
        </div>
        <button class="btn btn-primary btn-sm" onclick="abrirNuevoPrestamo()">
          <i class="fa-solid fa-plus"></i> Registrar préstamo
        </button>
      </div>
      ${list.map(p => `
        <div style="background:#fff;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px">
          <div>
            <div style="font-weight:600;font-size:13px">${p.descripcion}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${fmtDate(p.fecha)}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-weight:700;font-size:14px;color:#92400e">${fmt(p.monto)}</span>
            <button class="btn btn-success btn-sm" onclick="cajaDevolverPrestamo(${p.id})"><i class="fa-solid fa-check"></i> Devuelto</button>
            <button class="btn btn-danger btn-sm"  onclick="cajaEliminarPrestamo(${p.id})"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>`).join('')}
    </div>`;
}

function abrirNuevoPrestamo() {
  document.getElementById('prestamo-desc').value = '';
  document.getElementById('prestamo-monto').value = '';
  openModal('modal-prestamo');
}

async function cajaDevolverPrestamo(id) {
  const ok = await confirm('Marcar como devuelto', '¿Confirmas que este préstamo fue devuelto?');
  if (!ok) return;
  try { await prestamosAPI.devolver(id); showOk('Marcado como devuelto'); loadCajaPrestamos(); }
  catch (e) { showErr(e.message); }
}

async function cajaEliminarPrestamo(id) {
  const ok = await confirm('Eliminar préstamo', '¿Deseas eliminar este registro?');
  if (!ok) return;
  try { await prestamosAPI.delete(id); showOk('Eliminado'); loadCajaPrestamos(); }
  catch (e) { showErr(e.message); }
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

document.getElementById('btn-cierre-caja').addEventListener('click', async () => {
  try {
    const res = await cajaAPI.cierre();
    const c = res.data || {};
    showOk(`Cierre registrado — Efectivo: ${fmt(c.saldo_efectivo)} | Yape: ${fmt(c.saldo_yape)}`);
    loadCaja(); loadMovimientos();
  } catch (e) { showErr(e.message); }
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

document.getElementById('btn-generar-reporte').addEventListener('click', () => {
  const hoy  = new Date();
  const mes1 = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
  const hoyS = hoy.toISOString().split('T')[0];
  document.getElementById('reporte-fecha-ini').value = mes1;
  document.getElementById('reporte-fecha-fin').value = hoyS;
  openModal('modal-reporte');
});

document.getElementById('btn-confirmar-reporte').addEventListener('click', async () => {
  const fi = document.getElementById('reporte-fecha-ini').value;
  const ff = document.getElementById('reporte-fecha-fin').value;
  if (!fi || !ff) { showWarn('Selecciona las fechas'); return; }
  closeModal('modal-reporte');
  await generarReporte(fi, ff);
});

async function generarReporte(fechaIni, fechaFin) {
  try {
    const params = new URLSearchParams({ fecha_inicio: fechaIni, fecha_fin: fechaFin }).toString();
    const [ventasRes, comprasRes, cajaRes, deudasRes, prestamosRes, productosRes] = await Promise.all([
      ventasAPI.getAll(params),
      comprasAPI.getAll(params),
      cajaAPI.get(),
      deudasAPI.getResumen(),
      prestamosAPI.getAll(),
      productosAPI.getAll()
    ]);

    const ventas    = (ventasRes.data    || []).filter(v => v.estado !== 'anulada');
    const compras   = comprasRes.data    || [];
    const caja      = cajaRes.data       || {};
    const deudas    = deudasRes.data     || [];
    const prestamos = (prestamosRes.data || []).filter(p => p.estado === 'pendiente');
    const productos = (productosRes.data || []).filter(p => p.activo != 0);

    const totalVentas   = ventas.reduce((s, v) => s + parseFloat(v.total || 0), 0);
    const totalCompras  = compras.reduce((s, c) => s + parseFloat(c.total || 0), 0);
    const totalDeudas   = deudas.reduce((s, d) => s + Math.max(0, parseFloat(d.deuda_total || 0) - parseFloat(d.total_pagado || 0)), 0);
    const totalPrestamo = prestamos.reduce((s, p) => s + parseFloat(p.monto || 0), 0);
    const efe = parseFloat(caja.saldo_efectivo || 0);
    const yap = parseFloat(caja.saldo_yape    || 0);

    const fR  = v => `S/ ${parseFloat(v || 0).toFixed(2)}`;
    const fDR = d => d ? new Date(d).toLocaleDateString('es-PE') : '—';

    const ventasRows = ventas.map(v => `<tr>
      <td>#${v.id}</td><td>${fDR(v.fecha)}</td><td>${v.cliente_nombre || 'Sin cliente'}</td>
      <td style="text-align:right">${fR(v.total)}</td><td>${v.metodo_pago || '—'}</td></tr>`).join('');

    const comprasRows = compras.map(c => `<tr>
      <td>#${c.id}</td><td>${fDR(c.fecha)}</td>
      <td style="text-align:right">${fR(c.total)}</td>
      <td style="text-align:right">${fR(c.monto_prestado)}</td></tr>`).join('');

    const deudasPend = deudas.filter(d => parseInt(d.deudas_pendientes) > 0);
    const deudasRows = deudasPend.map(d => {
      const sal = Math.max(0, parseFloat(d.deuda_total || 0) - parseFloat(d.total_pagado || 0));
      return `<tr><td>${d.cliente_nombre}</td><td>${d.cliente_telefono || '—'}</td>
        <td style="text-align:right">${fR(d.deuda_total)}</td>
        <td style="text-align:right">${fR(d.total_pagado)}</td>
        <td style="text-align:right;color:#dc2626;font-weight:700">${fR(sal)}</td></tr>`;
    }).join('');

    const prestamosRows = prestamos.map(p => `<tr>
      <td>${p.descripcion}</td><td>${fDR(p.fecha)}</td>
      <td style="text-align:right;color:#d97706;font-weight:700">${fR(p.monto)}</td></tr>`).join('');

    const productosRows = productos.map(p => `<tr>
      <td>${p.nombre}</td>
      <td style="text-align:center">${p.tipo_venta === 'por_peso' ? 'Peso/kg' : 'Unidad'}</td>
      <td style="text-align:right">${fR(p.precio_base)}</td>
      <td style="text-align:center;font-weight:700;color:${p.stock <= 0 ? '#dc2626' : p.stock <= 5 ? '#d97706' : '#16a34a'}">${p.stock}</td></tr>`).join('');

    const css = `*{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;color:#1e293b;padding:28px;font-size:13px}
      h1{font-size:21px;font-weight:800;color:#0f172a;margin-bottom:3px}
      .sub{color:#64748b;font-size:12px;margin-bottom:22px}
      h2{font-size:14px;font-weight:700;color:#1e293b;margin:22px 0 8px;padding-bottom:5px;border-bottom:2px solid #e2e8f0}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{background:#f8fafc;padding:6px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;border-bottom:2px solid #e2e8f0}
      td{padding:6px 10px;border-bottom:1px solid #f1f5f9}
      .sg{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:6px}
      .sc{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px}
      .sc .lb{font-size:10px;color:#64748b;margin-bottom:3px;text-transform:uppercase;letter-spacing:.04em}
      .sc .vl{font-size:16px;font-weight:800}
      .sc.gr .vl{color:#16a34a}.sc.bl .vl{color:#3b82f6}.sc.am .vl{color:#d97706}
      .tot{font-weight:700;background:#f8fafc}
      .foot{margin-top:28px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:right}
      @media print{body{padding:12px}}`;

    const s = (rows, emptyMsg) => rows || `<tr><td colspan="10" style="color:#94a3b8;font-style:italic;padding:10px">${emptyMsg}</td></tr>`;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Reporte ${fechaIni} – ${fechaFin}</title>
      <style>${css}</style></head><body>
      <h1>📊 Reporte General — Tiendita Dulcecita</h1>
      <p class="sub">Período: <strong>${fechaIni}</strong> al <strong>${fechaFin}</strong> &nbsp;|&nbsp; Generado: ${new Date().toLocaleString('es-PE')}</p>

      <h2>💰 Estado de Caja</h2>
      <div class="sg">
        <div class="sc gr"><div class="lb">Efectivo</div><div class="vl">${fR(efe)}</div></div>
        <div class="sc bl"><div class="lb">Yape</div><div class="vl">${fR(yap)}</div></div>
        <div class="sc">   <div class="lb">Total</div><div class="vl">${fR(efe+yap)}</div></div>
      </div>

      <h2>🛒 Ventas del período (${ventas.length})</h2>
      <table><thead><tr><th>#</th><th>Fecha</th><th>Cliente</th><th style="text-align:right">Total</th><th>Método</th></tr></thead>
      <tbody>${s(ventasRows,'Sin ventas en el período')}
      ${ventas.length?`<tr class="tot"><td colspan="3">Total ventas</td><td style="text-align:right;color:#16a34a">${fR(totalVentas)}</td><td></td></tr>`:''}</tbody></table>

      <h2>📦 Compras del período (${compras.length})</h2>
      <table><thead><tr><th>#</th><th>Fecha</th><th style="text-align:right">Total</th><th style="text-align:right">Prestado</th></tr></thead>
      <tbody>${s(comprasRows,'Sin compras en el período')}
      ${compras.length?`<tr class="tot"><td colspan="2">Total compras</td><td style="text-align:right;color:#dc2626">${fR(totalCompras)}</td><td></td></tr>`:''}</tbody></table>

      <h2>⚠️ Deudas pendientes por cliente (${deudasPend.length})</h2>
      <table><thead><tr><th>Cliente</th><th>Teléfono</th><th style="text-align:right">Total Deuda</th><th style="text-align:right">Pagado</th><th style="text-align:right">Saldo</th></tr></thead>
      <tbody>${s(deudasRows,'Sin deudas pendientes')}
      ${deudasPend.length?`<tr class="tot"><td colspan="4">Total pendiente</td><td style="text-align:right;color:#dc2626">${fR(totalDeudas)}</td></tr>`:''}</tbody></table>

      <h2>🤝 Préstamos pendientes (${prestamos.length})</h2>
      <table><thead><tr><th>Descripción</th><th>Fecha</th><th style="text-align:right">Monto</th></tr></thead>
      <tbody>${s(prestamosRows,'Sin préstamos pendientes')}
      ${prestamos.length?`<tr class="tot"><td colspan="2">Total prestado</td><td style="text-align:right;color:#d97706">${fR(totalPrestamo)}</td></tr>`:''}</tbody></table>

      <h2>🏷️ Inventario actual (${productos.length} productos)</h2>
      <table><thead><tr><th>Producto</th><th style="text-align:center">Tipo</th><th style="text-align:right">Precio base</th><th style="text-align:center">Stock</th></tr></thead>
      <tbody>${productosRows}</tbody></table>

      <div class="foot">Reporte generado por Tiendita Dulcecita · ${new Date().toLocaleString('es-PE')}</div>
      </body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 400);
  } catch (e) { showErr('Error generando reporte: ' + e.message); }
}

/* ============================================================
   CATEGORIAS
   ============================================================ */
PAGE_LOADERS.categorias = () => loadCategorias();

async function loadCategorias() {
  try {
    const res = await categoriasAPI.getAll();
    renderCategorias(res.data || []);
    _allCategorias = res.data || [];
  } catch (e) { showErr(e.message); }
}

async function renderCategorias(list) {
  const tbody = document.getElementById('table-categorias');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-muted)">Sin categorías</td></tr>';
    return;
  }
  const counts = await loadProductCountsByCategoria();
  tbody.innerHTML = list.map(c => `
    <tr>
      <td style="font-size:22px;text-align:center">${c.icono}</td>
      <td><strong>${c.nombre}</strong></td>
      <td><span class="chip chip-success">${counts[c.id] || 0} productos</span></td>
      <td style="display:flex;gap:6px">
        <button class="btn btn-outline btn-sm" onclick="editarCategoria(${c.id})"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-danger btn-sm"  onclick="eliminarCategoria(${c.id})"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`).join('');
}

async function loadProductCountsByCategoria() {
  try {
    const res = await productosAPI.getAll();
    const counts = {};
    (res.data || []).forEach(p => {
      (p.categorias || []).forEach(c => {
        counts[c.id] = (counts[c.id] || 0) + 1;
      });
    });
    return counts;
  } catch (e) { return {}; }
}

document.getElementById('btn-nueva-categoria').addEventListener('click', () => {
  document.getElementById('cat-id').value     = '';
  document.getElementById('cat-nombre').value = '';
  document.getElementById('cat-icono').value  = '';
  document.getElementById('modal-categoria-title').textContent = 'Nueva Categoría';
  openModal('modal-categoria');
});

async function editarCategoria(id) {
  const cat = _allCategorias.find(c => c.id === id);
  if (!cat) return;
  document.getElementById('cat-id').value     = cat.id;
  document.getElementById('cat-nombre').value = cat.nombre;
  document.getElementById('cat-icono').value  = cat.icono;
  document.getElementById('modal-categoria-title').textContent = 'Editar Categoría';
  openModal('modal-categoria');
}

document.getElementById('btn-guardar-categoria').addEventListener('click', async () => {
  const id     = document.getElementById('cat-id').value;
  const nombre = document.getElementById('cat-nombre').value.trim();
  const icono  = document.getElementById('cat-icono').value.trim() || '🏷️';
  if (!nombre) { showWarn('Ingresa un nombre para la categoría'); return; }
  try {
    if (id) await categoriasAPI.update(id, { nombre, icono });
    else    await categoriasAPI.create({ nombre, icono });
    showOk('Categoría guardada');
    closeModal('modal-categoria');
    loadCategorias();
    loadCategoriasCheckboxes();
  } catch (e) { showErr(e.message); }
});

async function eliminarCategoria(id) {
  const ok = await confirm('Eliminar categoría', '¿Deseas eliminar esta categoría? Los productos no se verán afectados.');
  if (!ok) return;
  try {
    await categoriasAPI.delete(id);
    showOk('Categoría eliminada');
    loadCategorias();
    loadCategoriasCheckboxes();
  } catch (e) { showErr(e.message); }
}

/* ============================================================
   DEUDAS
   ============================================================ */
let _currentDeudaClienteId   = null;
let _currentDeudaClienteNom  = '';
let _currentDeudaClienteTel  = '';

PAGE_LOADERS.deudas = () => loadDeudasResumen();

async function loadDeudasResumen() {
  try {
    const res = await deudasAPI.getResumen();
    renderDeudasClientes(res.data || []);
  } catch (e) { showErr(e.message); }
}

function renderDeudasClientes(list) {
  const grid = document.getElementById('deuda-cards-container');
  if (!list.length) {
    grid.innerHTML = '<p style="color:var(--text-muted);padding:20px">Sin clientes con deudas registradas.</p>';
    return;
  }
  grid.innerHTML = list.map(c => {
    const total      = parseFloat(c.deuda_total  || 0);
    const pagado     = parseFloat(c.total_pagado || 0);
    const saldo      = Math.max(0, total - pagado);
    const tieneDeuda = parseInt(c.deudas_pendientes) > 0;
    const cls  = tieneDeuda ? 'debt-client-card--red'   : 'debt-client-card--green';
    const dot  = tieneDeuda ? 'debt-dot--red'           : 'debt-dot--green';
    const nom  = (c.cliente_nombre  || '').replace(/'/g, "\\'");
    const tel  = (c.cliente_telefono|| '').replace(/'/g, "\\'");
    return `
      <div class="debt-client-card ${cls}">
        <div class="debt-client-name">
          <span class="debt-dot ${dot}"></span>${c.cliente_nombre}
        </div>
        <div class="debt-stat-row"><span>Deuda total</span><span class="val">${fmt(total)}</span></div>
        <div class="debt-stat-row"><span>Pagado</span><span class="val">${fmt(pagado)}</span></div>
        <div class="debt-stat-row"><span>Saldo</span><span class="${tieneDeuda ? 'val val-red' : 'val'}">${fmt(saldo)}</span></div>
        <div style="margin-top:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          ${parseInt(c.total_deudas) > 0
            ? `<button class="btn btn-outline btn-sm" onclick="verDetalleCliente(${c.cliente_id},'${nom}','${tel}')">→ Ver detalle</button>`
            : ''}
          ${!tieneDeuda
            ? `<span style="font-size:12px;color:var(--success)"><i class="fa-solid fa-circle-check"></i> Sin deuda pendiente</span>`
            : ''}
        </div>
      </div>`;
  }).join('');
}

async function verDetalleCliente(clienteId, nombre, telefono) {
  _currentDeudaClienteId  = clienteId;
  _currentDeudaClienteNom = nombre;
  _currentDeudaClienteTel = telefono || '';
  document.getElementById('deuda-detail-title').textContent = `Deudas del cliente - ${nombre}`;
  document.getElementById('deuda-list-view').classList.add('hidden');
  document.getElementById('deuda-detail-view').classList.remove('hidden');
  await cargarDetalleCliente(clienteId);
}

async function cargarDetalleCliente(clienteId) {
  document.getElementById('deuda-pending-list').innerHTML = '<p style="color:var(--text-muted);padding:10px">Cargando...</p>';
  document.getElementById('deuda-paid-list').innerHTML = '';
  try {
    const res       = await deudasAPI.getByCliente(clienteId);
    const deudas    = res.data || [];
    const pendientes = deudas.filter(d => d.estado === 'pendiente');
    const pagadas    = deudas.filter(d => d.estado === 'pagada');
    document.getElementById('deuda-pending-title').textContent = `DEUDAS SIN PAGAR (${pendientes.length})`;
    document.getElementById('deuda-paid-title').textContent    = `DEUDAS PAGADAS (${pagadas.length})`;
    document.getElementById('deuda-pending-list').innerHTML    = pendientes.length
      ? pendientes.map(d => renderDeudaItem(d, false)).join('')
      : '<p style="color:var(--text-muted);font-size:13px;padding:6px 0">No hay deudas pendientes.</p>';
    document.getElementById('deuda-paid-list').innerHTML = pagadas.length
      ? pagadas.map(d => renderDeudaItem(d, true)).join('')
      : '<p style="color:var(--text-muted);font-size:13px;padding:6px 0">No hay deudas pagadas.</p>';
  } catch (e) { showErr(e.message); }
}

function renderDeudaItem(d, esPagada) {
  const total   = parseFloat(d.total_pendiente || 0);
  const pagado  = parseFloat(d.total_pagado    || 0);
  const saldo   = Math.max(0, total - pagado);
  const numProd = parseInt(d.num_productos || 0);
  const fechaStr = d.venta_fecha
    ? new Date(d.venta_fecha).toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric' })
    : '';
  return `
    <div class="debt-item ${esPagada ? 'debt-item--paid' : 'debt-item--pending'}" id="debt-item-${d.id}">
      <div class="debt-item-header">
        <span class="debt-item-id">Deuda #${d.id}</span>
        <span class="chip ${esPagada ? 'chip-success' : 'chip-danger'}" style="font-size:10px">${esPagada ? 'pagado' : 'pendiente'}</span>
        ${fechaStr && esPagada ? `<span style="margin-left:auto;font-size:12px;color:var(--text-muted)"><i class="fa-regular fa-calendar"></i> ${fechaStr}</span>` : ''}
      </div>
      ${numProd > 0 ? `
        <button class="btn btn-outline btn-sm" style="margin-bottom:8px" onclick="toggleVerProductos(${d.id},${d.venta_id})">
          <i class="fa-solid fa-basket-shopping"></i> Ver productos (${numProd})
        </button>
        <div id="prods-${d.id}" class="hidden debt-products-wrap"></div>` : ''}
      <div class="debt-item-stats">
        <div class="debt-item-stat"><label>Total deuda</label><span class="val">${fmt(total)}</span></div>
        <div class="debt-item-stat"><label>Pagado</label><span class="val" style="color:var(--success)">${fmt(pagado)}</span></div>
        <div class="debt-item-stat"><label>Saldo</label><span class="val" style="color:${saldo > 0 ? 'var(--danger)' : 'var(--success)'}">${fmt(saldo)}</span></div>
      </div>
      <div style="margin-top:12px">
        ${!esPagada
          ? `<button class="btn btn-primary btn-sm" onclick="abrirPagoDeuda(${d.id},${saldo})"><i class="fa-solid fa-money-bill-wave"></i> Registrar Pago</button>`
          : `<span style="font-size:12px;color:var(--success)"><i class="fa-solid fa-circle-check"></i> Completamente pagada</span>`}
      </div>
    </div>`;
}

async function toggleVerProductos(deudaId, ventaId) {
  const box = document.getElementById(`prods-${deudaId}`);
  if (!box) return;
  if (!box.classList.contains('hidden')) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  if (box.dataset.loaded) return;
  box.innerHTML = '<p style="color:var(--text-muted);font-size:12px;padding:4px 0">Cargando productos...</p>';
  try {
    const res  = await ventasAPI.getById(ventaId);
    const dets = (res.data || {}).detalles || [];
    box.dataset.loaded = '1';
    box.innerHTML = dets.length ? `
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="background:#f8fafc">
          <th style="padding:6px 10px;text-align:left;color:var(--text-muted);font-weight:600">Producto</th>
          <th style="padding:6px 10px;text-align:center;color:var(--text-muted);font-weight:600">Cant.</th>
          <th style="padding:6px 10px;text-align:right;color:var(--text-muted);font-weight:600">Precio Unit.</th>
          <th style="padding:6px 10px;text-align:right;color:var(--text-muted);font-weight:600">Subtotal</th>
        </tr></thead>
        <tbody>${dets.map(d => `
          <tr style="border-top:1px solid var(--border)">
            <td style="padding:6px 10px">${d.producto_nombre}${d.es_bonificacion ? ' <span class="chip chip-warning" style="font-size:9px">Bonif.</span>' : ''}</td>
            <td style="padding:6px 10px;text-align:center">${d.cantidad}</td>
            <td style="padding:6px 10px;text-align:right">${fmt(d.precio_unitario)}</td>
            <td style="padding:6px 10px;text-align:right"><strong>${fmt(d.cantidad * parseFloat(d.precio_unitario))}</strong></td>
          </tr>`).join('')}
        </tbody>
      </table>`
      : '<p style="color:var(--text-muted);font-size:12px">Sin productos registrados.</p>';
  } catch (e) { box.innerHTML = `<p style="color:var(--danger);font-size:12px">${e.message}</p>`; }
}

function abrirPagoDeuda(id, saldo) {
  document.getElementById('pago-deuda-id').value = id;
  document.getElementById('pago-deuda-info').textContent = `Cliente: ${_currentDeudaClienteNom} — Saldo pendiente: ${fmt(saldo)}`;
  document.getElementById('pago-efectivo').value = '0';
  document.getElementById('pago-yape').value = '0';
  openModal('modal-pagar-deuda');
}

document.getElementById('btn-confirmar-pago').addEventListener('click', async () => {
  const id   = document.getElementById('pago-deuda-id').value;
  const data = {
    monto_efectivo: parseFloat(document.getElementById('pago-efectivo').value) || 0,
    monto_yape:     parseFloat(document.getElementById('pago-yape').value) || 0
  };
  if (!data.monto_efectivo && !data.monto_yape) { showWarn('Ingresa al menos un monto'); return; }
  try {
    await deudasAPI.pagar(id, data);
    showOk('Pago registrado');
    closeModal('modal-pagar-deuda');
    if (_currentDeudaClienteId) {
      await cargarDetalleCliente(_currentDeudaClienteId);
      loadDeudasResumen();
    }
    loadCaja();
  } catch (e) { showErr(e.message); }
});

document.getElementById('btn-volver-deudas').addEventListener('click', () => {
  document.getElementById('deuda-detail-view').classList.add('hidden');
  document.getElementById('deuda-list-view').classList.remove('hidden');
});

document.getElementById('btn-share-whatsapp').addEventListener('click', async () => {
  if (!_currentDeudaClienteId) return;
  try {
    const res        = await deudasAPI.getByCliente(_currentDeudaClienteId);
    const pendientes = (res.data || []).filter(d => d.estado === 'pendiente');
    if (!pendientes.length) { showWarn('No hay deudas pendientes para compartir'); return; }
    const totalSaldo = pendientes.reduce((s, d) => s + Math.max(0, parseFloat(d.total_pendiente) - parseFloat(d.total_pagado)), 0);
    const lines = pendientes.map(d => {
      const sal = Math.max(0, parseFloat(d.total_pendiente) - parseFloat(d.total_pagado));
      return `• Deuda #${d.id}: S/ ${sal.toFixed(2)} pendiente`;
    });
    const msg  = `*Deudas pendientes - ${_currentDeudaClienteNom}*\n\n${lines.join('\n')}\n\n*Total pendiente: S/ ${totalSaldo.toFixed(2)}*`;
    const tel  = _currentDeudaClienteTel.replace(/\D/g, '');
    const url  = tel ? `https://wa.me/51${tel}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  } catch (e) { showErr(e.message); }
});

document.getElementById('btn-share-pdf').addEventListener('click', async () => {
  if (!_currentDeudaClienteId) return;
  try {
    const res        = await deudasAPI.getByCliente(_currentDeudaClienteId);
    const pendientes = (res.data || []).filter(d => d.estado === 'pendiente');
    if (!pendientes.length) { showWarn('No hay deudas pendientes para exportar'); return; }

    const ventasDetalle = await Promise.all(
      pendientes.map(d => d.venta_id ? ventasAPI.getById(d.venta_id).catch(() => null) : Promise.resolve(null))
    );

    const totalSaldo = pendientes.reduce((s, d) => s + Math.max(0, parseFloat(d.total_pendiente) - parseFloat(d.total_pagado)), 0);

    const sections = pendientes.map((d, i) => {
      const sal   = Math.max(0, parseFloat(d.total_pendiente) - parseFloat(d.total_pagado));
      const dets  = ventasDetalle[i]?.data?.detalles || [];
      const prodsRows = dets.length
        ? dets.map(p => `<tr>
            <td style="padding:5px 10px;border-bottom:1px solid #f1f5f9">${p.producto_nombre}${p.es_bonificacion ? ' (Bonif.)' : ''}</td>
            <td style="padding:5px 10px;text-align:center;border-bottom:1px solid #f1f5f9">${p.cantidad}</td>
            <td style="padding:5px 10px;text-align:right;border-bottom:1px solid #f1f5f9">S/ ${parseFloat(p.precio_unitario).toFixed(2)}</td>
            <td style="padding:5px 10px;text-align:right;border-bottom:1px solid #f1f5f9">S/ ${(p.cantidad * parseFloat(p.precio_unitario)).toFixed(2)}</td>
          </tr>`).join('')
        : `<tr><td colspan="4" style="padding:6px 10px;color:#94a3b8;font-style:italic">Sin detalle de productos</td></tr>`;
      return `
        <div style="margin-bottom:24px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
          <div style="background:#f8fafc;padding:10px 14px;display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:700;font-size:14px">Deuda #${d.id}</span>
            <span style="color:#dc2626;font-weight:700">Saldo: S/ ${sal.toFixed(2)}</span>
          </div>
          <div style="padding:10px 14px;font-size:12px;color:#64748b;display:flex;gap:24px;border-bottom:1px solid #f1f5f9">
            <span>Total: S/ ${parseFloat(d.total_pendiente).toFixed(2)}</span>
            <span>Pagado: S/ ${parseFloat(d.total_pagado).toFixed(2)}</span>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead><tr style="background:#f8fafc">
              <th style="padding:6px 10px;text-align:left;color:#64748b;font-weight:600">Producto</th>
              <th style="padding:6px 10px;text-align:center;color:#64748b;font-weight:600">Cant.</th>
              <th style="padding:6px 10px;text-align:right;color:#64748b;font-weight:600">P. Unit.</th>
              <th style="padding:6px 10px;text-align:right;color:#64748b;font-weight:600">Subtotal</th>
            </tr></thead>
            <tbody>${prodsRows}</tbody>
          </table>
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Deudas – ${_currentDeudaClienteNom}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:30px;color:#1e293b;max-width:700px;margin:0 auto}
        h1{font-size:20px;margin-bottom:4px}
        p.sub{color:#64748b;font-size:13px;margin-bottom:20px}
        .total-box{background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:12px 16px;margin-top:20px;display:flex;justify-content:space-between;align-items:center}
        .total-box span:last-child{font-size:18px;font-weight:800;color:#dc2626}
        @media print{body{padding:15px}}
      </style></head><body>
      <h1>Deudas pendientes</h1>
      <p class="sub">Cliente: <strong>${_currentDeudaClienteNom}</strong> &nbsp;|&nbsp; Fecha: ${new Date().toLocaleDateString('es-PE')}</p>
      ${sections}
      <div class="total-box">
        <span style="font-weight:600">Total pendiente</span>
        <span>S/ ${totalSaldo.toFixed(2)}</span>
      </div>
      </body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.print();
  } catch (e) { showErr(e.message); }
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
  tbody.innerHTML = list.map(p => {
    const compraMatch = p.descripcion.match(/Compra #(\d+)/i);
    const compraId    = compraMatch ? parseInt(compraMatch[1]) : null;
    return `
    <tr id="prestamo-row-${p.id}">
      <td>${p.id}</td>
      <td>${p.descripcion}</td>
      <td><strong>${fmt(p.monto)}</strong></td>
      <td style="white-space:nowrap">${fmtDate(p.fecha)}</td>
      <td><span class="chip ${p.estado==='devuelto'?'chip-success':'chip-warning'}">${p.estado==='devuelto'?'Devuelto':'Pendiente'}</span></td>
      <td style="display:flex;gap:6px">
        ${compraId ? `<button class="btn btn-outline btn-sm" title="Ver detalle de compra" onclick="toggleCompraDetalle(${p.id},${compraId})"><i class="fa-solid fa-eye"></i></button>` : ''}
        ${p.estado!=='devuelto'?`<button class="btn btn-success btn-sm" onclick="devolverPrestamo(${p.id})"><i class="fa-solid fa-check"></i></button>`:''}
        <button class="btn btn-danger btn-sm" onclick="eliminarPrestamo(${p.id})"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
    <tr id="prestamo-detail-${p.id}" class="hidden">
      <td colspan="6" style="padding:0;background:#f8fafc;border-bottom:1px solid var(--border)">
        <div id="prestamo-detail-body-${p.id}" style="padding:14px 20px"></div>
      </td>
    </tr>`;
  }).join('');
}

async function toggleCompraDetalle(prestamoId, compraId) {
  const detailRow = document.getElementById(`prestamo-detail-${prestamoId}`);
  if (!detailRow.classList.contains('hidden')) { detailRow.classList.add('hidden'); return; }
  detailRow.classList.remove('hidden');
  const body = document.getElementById(`prestamo-detail-body-${prestamoId}`);
  if (body.dataset.loaded) return;
  body.innerHTML = '<p style="color:var(--text-muted);font-size:12px"><i class="fa-solid fa-spinner fa-spin"></i> Cargando detalle...</p>';
  try {
    const res  = await comprasAPI.getById(compraId);
    const dets = (res.data || {}).detalles || [];
    body.dataset.loaded = '1';
    body.innerHTML = `
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;letter-spacing:.04em">
        Detalle de Compra #${compraId}
      </div>` +
      (dets.length ? `
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="background:#f1f5f9">
          <th style="padding:6px 10px;text-align:left;color:var(--text-muted);font-weight:600">Producto</th>
          <th style="padding:6px 10px;text-align:center;color:var(--text-muted);font-weight:600">Cant.</th>
          <th style="padding:6px 10px;text-align:right;color:var(--text-muted);font-weight:600">Precio Unit.</th>
          <th style="padding:6px 10px;text-align:right;color:var(--text-muted);font-weight:600">Subtotal</th>
        </tr></thead>
        <tbody>${dets.map(d => `
          <tr style="border-top:1px solid var(--border)">
            <td style="padding:6px 10px">${d.producto_nombre}${d.es_bonificacion ? ' <span class="chip chip-warning" style="font-size:9px">Bonif.</span>' : ''}</td>
            <td style="padding:6px 10px;text-align:center">${d.cantidad}</td>
            <td style="padding:6px 10px;text-align:right">${fmt(d.precio_unitario)}</td>
            <td style="padding:6px 10px;text-align:right"><strong>${fmt(d.cantidad * parseFloat(d.precio_unitario))}</strong></td>
          </tr>`).join('')}
        </tbody>
      </table>`
      : '<p style="color:var(--text-muted);font-size:12px">Sin productos registrados.</p>');
  } catch (e) { body.innerHTML = `<p style="color:var(--danger);font-size:12px">${e.message}</p>`; }
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
  try { await prestamosAPI.create({ descripcion: desc, monto }); showOk('Préstamo registrado'); closeModal('modal-prestamo'); loadPrestamos(); loadCajaPrestamos(); }
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
   SIDEBAR TOGGLE (mobile)
   ============================================================ */
const sidebarToggleBtn = document.getElementById('sidebar-toggle');
const sidebarEl        = document.getElementById('sidebar');
const sidebarOverlay   = document.getElementById('sidebar-overlay');

function openSidebar()  { sidebarEl.classList.add('open'); sidebarOverlay?.classList.add('active'); }
function closeSidebar() { sidebarEl.classList.remove('open'); sidebarOverlay?.classList.remove('active'); }

sidebarToggleBtn?.addEventListener('click', () => {
  sidebarEl.classList.contains('open') ? closeSidebar() : openSidebar();
});
sidebarOverlay?.addEventListener('click', closeSidebar);

document.querySelectorAll('.nav-item[data-page]').forEach(item => {
  item.addEventListener('click', () => { if (window.innerWidth < 768) closeSidebar(); });
});

/* ============================================================
   INIT
   ============================================================ */
const _savedPage = localStorage.getItem('lastPage');
navigateTO: {
  const validPages = Object.keys(PAGE_TITLES);
  navigateTo(validPages.includes(_savedPage) ? _savedPage : 'pos');
}
