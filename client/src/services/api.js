const API_BASE = '/api';

export function getToken() {
  return localStorage.getItem('sicara_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('sicara_token', token);
  } else {
    localStorage.removeItem('sicara_token');
  }
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401) {
        setToken(null);
        window.dispatchEvent(new CustomEvent('sicara_unauthorized'));
      }
      const error = new Error(data.message || `Error en la solicitud (${res.status})`);
      error.status = res.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    throw err;
  }
}

export const api = {
  // Auth
  login: (correo, contrasena) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ correo, contrasena }),
    }),
  getMe: () => request('/auth/me'),
  updateProfile: (profileData) =>
    request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    }),
  logout: () =>
    request('/auth/logout', { method: 'POST' }).finally(() => setToken(null)),

  // Dashboard
  getDashboardStats: () => request('/dashboard/stats'),

  // Solicitudes
  getSolicitudes: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/solicitudes?${query}`);
  },
  getSolicitudById: (id) => request(`/solicitudes/${id}`),
  createSolicitud: (data) =>
    request('/solicitudes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  aprobarSolicitud: (id) =>
    request(`/solicitudes/${id}/aprobar`, {
      method: 'PUT',
    }),
  rechazarSolicitud: (id, motivo_rechazo) =>
    request(`/solicitudes/${id}/rechazar`, {
      method: 'PUT',
      body: JSON.stringify({ motivo_rechazo }),
    }),

  // Escuelas
  getEscuelas: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/escuelas?${query}`);
  },
  getEscuelaById: (id) => request(`/escuelas/${id}`),
  updateEstadoEscuela: (id, estado_escuela) =>
    request(`/escuelas/${id}/estado`, {
      method: 'PUT',
      body: JSON.stringify({ estado_escuela }),
    }),
  updateEscuela: (id, data) =>
    request(`/escuelas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Usuarios
  getUsuarios: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/usuarios?${query}`);
  },
  getUsuarioById: (id) => request(`/usuarios/${id}`),
  updateRolUsuario: (id, rol) =>
    request(`/usuarios/${id}/rol`, {
      method: 'PUT',
      body: JSON.stringify({ rol }),
    }),
  updateEstadoUsuario: (id, estado) =>
    request(`/usuarios/${id}/estado`, {
      method: 'PUT',
      body: JSON.stringify({ estado }),
    }),

  // Notificaciones
  getNotificaciones: () => request('/notificaciones'),
  resolverAlerta: (id) =>
    request(`/notificaciones/alerta/${id}/resolver`, {
      method: 'PUT',
    }),
};
