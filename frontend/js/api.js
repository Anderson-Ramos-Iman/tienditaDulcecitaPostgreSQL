const API_URL = window.APP_CONFIG?.API_URL || '/api';

const getToken = () => localStorage.getItem('token');

const api = {
  async request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
    return data;
  },
  get:    (path)        => api.request('GET',    path),
  post:   (path, body)  => api.request('POST',   path, body),
  put:    (path, body)  => api.request('PUT',    path, body),
  patch:  (path, body)  => api.request('PATCH',  path, body),
  delete: (path)        => api.request('DELETE', path)
};

const authAPI = {
  login: (data)  => api.post('/auth/login', data),
  me:    ()      => api.get('/auth/me')
};

const productosAPI = {
  getAll:          (q = '')  => api.get(`/productos${q ? '?q='+encodeURIComponent(q) : ''}`),
  getAllForCompras: ()        => api.get('/productos?all=1'),
  getById:         (id)      => api.get(`/productos/${id}`),
  create:          (data)    => api.post('/productos', data),
  update:          (id, data)=> api.put(`/productos/${id}`, data),
  delete:          (id)      => api.delete(`/productos/${id}`),
  getPromociones:  (id)      => api.get(`/productos/${id}/promociones`),
  createPromocion: (id, data)=> api.post(`/productos/${id}/promociones`, data)
};

const clientesAPI = {
  getAll:   (q = '')   => api.get(`/clientes${q ? '?q='+encodeURIComponent(q) : ''}`),
  getById:  (id)       => api.get(`/clientes/${id}`),
  create:   (data)     => api.post('/clientes', data),
  update:   (id, data) => api.put(`/clientes/${id}`, data),
  delete:   (id)       => api.delete(`/clientes/${id}`),
  getDeudas:(id)       => api.get(`/clientes/${id}/deudas`)
};

const ventasAPI = {
  getAll:  (params = '') => api.get(`/ventas?${params}`),
  getById: (id)          => api.get(`/ventas/${id}`),
  create:  (data)        => api.post('/ventas', data),
  anular:  (id)          => api.patch(`/ventas/${id}/anular`, {})
};

const comprasAPI = {
  getAll:   (params = '') => api.get(`/compras?${params}`),
  getById:  (id)          => api.get(`/compras/${id}`),
  create:   (data)        => api.post('/compras', data),
  cancelar: (id)          => api.post(`/compras/${id}/cancelar`, {})
};

const deudasAPI = {
  getAll:       (params = '') => api.get(`/deudas?${params}`),
  getById:      (id)          => api.get(`/deudas/${id}`),
  getByCliente: (clienteId)   => api.get(`/deudas/cliente/${clienteId}`),
  getResumen:   ()            => api.get('/deudas/resumen'),
  pagar:        (id, data)    => api.post(`/deudas/${id}/pagar`, data)
};

const cajaAPI = {
  get:              ()      => api.get('/caja'),
  getMovimientos:   (p='')  => api.get(`/caja/movimientos?${p}`),
  apertura:         (data)  => api.post('/caja/apertura', data),
  cierre:           ()      => api.post('/caja/cierre', {}),
  movimientoManual: (data)  => api.post('/caja/movimiento', data),
  ajuste:           (data)  => api.post('/caja/ajuste', data)
};

const prestamosAPI = {
  getAll:   ()     => api.get('/prestamos'),
  create:   (data) => api.post('/prestamos', data),
  devolver: (id)   => api.patch(`/prestamos/${id}/devolver`, {}),
  delete:   (id)   => api.delete(`/prestamos/${id}`)
};

const pedidosAPI = {
  getAll:       (p='')   => api.get(`/pedidos?${p}`),
  getById:      (id)     => api.get(`/pedidos/${id}`),
  create:       (data)   => api.post('/pedidos', data),
  updateEstado: (id, estado) => api.patch(`/pedidos/${id}/estado`, { estado }),
  delete:       (id)     => api.delete(`/pedidos/${id}`)
};
