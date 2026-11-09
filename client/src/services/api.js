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
  // Autenticación
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
    request('/auth/logout', {
      method: 'POST',
    }),
  verificarTokenActivacion: (token) => request(`/auth/activacion/verificar/${encodeURIComponent(token)}`),
  completarActivacion: (data) =>
    request('/auth/activacion/completar', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  solicitarNuevoEnlaceActivacion: (correo) =>
    request('/auth/activacion/solicitar-nuevo', {
      method: 'POST',
      body: JSON.stringify({ correo }),
    }),

  // Dashboard Administrador General
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
  getColoniasPorCP: (cp) => request(`/solicitudes/cp/${encodeURIComponent(cp)}`),
  aprobarSolicitud: (id) =>
    request(`/solicitudes/${id}/aprobar`, {
      method: 'PUT',
    }),
  rechazarSolicitud: (id, motivo_rechazo) =>
    request(`/solicitudes/${id}/rechazar`, {
      method: 'PUT',
      body: JSON.stringify({ motivo_rechazo }),
    }),
  reenviarCorreoAprobacion: (id) =>
    request(`/solicitudes/${id}/reenviar-correo`, {
      method: 'POST',
    }),
  checkSMTPStatus: () => request('/solicitudes/smtp/status'),

  // Escuelas (Admin General)
  getEscuelas: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/escuelas?${query}`);
  },
  getEscuelaById: (id) => request(`/escuelas/${id}`),
  updateEscuela: (id, data) =>
    request(`/escuelas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updateEstadoEscuela: (id, estado_escuela) =>
    request(`/escuelas/${id}/estado`, {
      method: 'PUT',
      body: JSON.stringify({ estado_escuela }),
    }),

  // Usuarios (Admin General)
  getUsuarios: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/usuarios?${query}`);
  },
  getUsuariosPorEscuela: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/usuarios/por-escuela?${query}`);
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
  reenviarActivacionUsuario: (id) =>
    request(`/usuarios/${id}/reenviar-activacion`, {
      method: 'POST',
    }),

  // Administradores
  getAdministradores: () => request('/administradores'),
  createAdministrador: (data) =>
    request('/administradores', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAdministrador: (id, data) =>
    request(`/administradores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updateEstadoAdministrador: (id, estado) =>
    request(`/administradores/${id}/estado`, {
      method: 'PUT',
      body: JSON.stringify({ estado }),
    }),

  // Notificaciones de Solicitudes de Escuelas
  getNotificaciones: () => request('/notificaciones'),
  marcarNotificacionLeida: (id) =>
    request(`/notificaciones/${id}/leida`, {
      method: 'PUT',
    }),
  marcarNotificacionPendiente: (id) =>
    request(`/notificaciones/${id}/pendiente`, {
      method: 'PUT',
    }),
  marcarTodasNotificacionesLeidas: () =>
    request('/notificaciones/marcar-todas-leidas', {
      method: 'PUT',
    }),
  resolverAlerta: (id) =>
    request(`/notificaciones/alerta/${id}/resolver`, {
      method: 'PUT',
    }),

  // ==========================================
  // APIS DEL MÓDULO DEL DIRECTIVO
  // ==========================================
  getDirectivoDashboard: () => request('/directivo/dashboard'),

  // Alumnos
  getDirectivoAlumnos: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/directivo/alumnos?${query}`);
  },
  createDirectivoAlumno: (data) =>
    request('/directivo/alumnos', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateDirectivoAlumno: (id, data) =>
    request(`/directivo/alumnos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getDirectivoAlumnoHistorial: (id) => request(`/directivo/alumnos/${id}/historial`),

  // Docentes
  getDirectivoDocentes: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/directivo/docentes?${query}`);
  },
  createDirectivoDocente: (data) =>
    request('/directivo/docentes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateDirectivoDocente: (id, data) =>
    request(`/directivo/docentes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getDirectivoDocenteAsignaciones: (id) => request(`/directivo/docentes/${id}/asignaciones`),

  // Grupos
  getDirectivoGrupos: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/directivo/grupos?${query}`);
  },
  createDirectivoGrupo: (data) =>
    request('/directivo/grupos', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateDirectivoGrupo: (id, data) =>
    request(`/directivo/grupos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getDirectivoGrupoDetalle: (id) => request(`/directivo/grupos/${id}/detalle`),
  inscribirAlumnoGrupo: (idGrupo, idAlumno) =>
    request(`/directivo/grupos/${idGrupo}/inscribir`, {
      method: 'POST',
      body: JSON.stringify({ id_alumno: idAlumno }),
    }),
  desvincularAlumnoGrupo: (idGrupo, idAlumno) =>
    request(`/directivo/grupos/${idGrupo}/alumnos/${idAlumno}`, {
      method: 'DELETE',
    }),

  // Materias & Asignaciones
  getDirectivoMaterias: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/directivo/materias?${query}`);
  },
  createDirectivoMateria: (data) =>
    request('/directivo/materias', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateDirectivoMateria: (id, data) =>
    request(`/directivo/materias/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  createDirectivoAsignacion: (data) =>
    request('/directivo/asignaciones', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteDirectivoAsignacion: (id) =>
    request(`/directivo/asignaciones/${id}`, {
      method: 'DELETE',
    }),

  // Alertas
  getDirectivoAlertas: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/directivo/alertas?${query}`);
  },
  createDirectivoAlerta: (data) =>
    request('/directivo/alertas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateDirectivoAlerta: (id, data) =>
    request(`/directivo/alertas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Rendimiento Académico
  getDirectivoRendimiento: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/directivo/rendimiento?${query}`);
  },

  // Reportes
  getDirectivoReportes: () => request('/directivo/reportes'),
  generarDirectivoReporte: (data) =>
    request('/directivo/reportes/generar', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Configuración Institucional
  getDirectivoConfiguracion: () => request('/directivo/configuracion'),
  updateDirectivoConfiguracion: (data) =>
    request('/directivo/configuracion', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
