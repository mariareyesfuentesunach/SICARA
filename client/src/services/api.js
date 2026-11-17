import {
  setCachedData,
  getCachedData,
  queueOfflineAction,
  getPendingQueue,
  removeQueueItem,
} from './offlineStorage';

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

/**
 * Indicador de si el navegador tiene conectividad de red activa
 */
export function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Función principal de peticiones HTTP con tolerancia a fallos offline
 */
async function request(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
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

  const cacheKey = `${method}:${endpoint}`;

  // 1. MANEJO CUANDO NO HAY INTERNET (OFFLINE)
  if (!isOnline()) {
    if (method === 'GET') {
      const cached = await getCachedData(cacheKey);
      if (cached) {
        return {
          ...cached,
          _fromOfflineCache: true,
        };
      }
      throw new Error('Modo sin conexión: No hay datos guardados previamente para esta consulta.');
    } else {
      // Para POST, PUT, DELETE: encolar localmente
      const queueId = await queueOfflineAction({
        endpoint,
        method,
        body: options.body ? JSON.parse(options.body) : null,
        description: options.description || `${method} ${endpoint}`,
      });

      // Retornar respuesta optimista simulada
      return {
        success: true,
        offlineQueued: true,
        queueId,
        message: 'Cambio guardado localmente en su dispositivo. Se sincronizará automáticamente cuando vuelva el internet.',
      };
    }
  }

  // 2. INTENTO CON RED ACTIVA
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

    // Si fue un GET exitoso, guardarlo en la caché local IndexedDB
    if (method === 'GET') {
      setCachedData(cacheKey, data);
    }

    return data;
  } catch (err) {
    // Si la llamada falló por pérdida repentina de conexión (Failed to fetch / NetworkError / Timeout)
    const isNetworkError =
      !err.status &&
      (err.message === 'Failed to fetch' ||
        err.name === 'TypeError' ||
        err.message.includes('NetworkError') ||
        err.message.includes('fetch') ||
        err.message.includes('ECONNREFUSED'));

    if (isNetworkError) {
      console.warn(`[SICARA Offline] Red caída durante ${method} ${endpoint}. Activando respaldo local.`);

      if (method === 'GET') {
        const cached = await getCachedData(cacheKey);
        if (cached) {
          return {
            ...cached,
            _fromOfflineCache: true,
          };
        }
      } else {
        // Encolar acción de escritura para no perder la información
        const queueId = await queueOfflineAction({
          endpoint,
          method,
          body: options.body ? JSON.parse(options.body) : null,
          description: options.description || `${method} ${endpoint}`,
        });

        return {
          success: true,
          offlineQueued: true,
          queueId,
          message: 'Sin conexión a internet. Los datos fueron asegurados en su equipo y se subirán al restaurarse la red.',
        };
      }
    }

    throw err;
  }
}

/**
 * Procesa y envía todas las operaciones pendientes de la cola cuando hay internet
 */
export async function syncOfflineQueue(onProgress) {
  if (!isOnline()) return { synced: 0, pending: 0, offline: true };

  const queue = await getPendingQueue();
  if (queue.length === 0) return { synced: 0, pending: 0 };

  let synced = 0;
  let errors = 0;

  for (const item of queue) {
    try {
      if (onProgress) {
        onProgress({ current: item, remaining: queue.length - synced });
      }

      const token = getToken();
      const headers = {
        'Content-Type': 'application/json',
        ...(item.headers || {}),
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE}${item.endpoint}`, {
        method: item.method,
        headers,
        body: item.body ? JSON.stringify(item.body) : undefined,
      });

      if (res.ok) {
        await removeQueueItem(item.id);
        synced++;
      } else {
        // Si el servidor responde error (incluyendo 400, 404, 409, 500), remover el item de la cola
        // para que no se quede atascado en un bucle infinito de reintentos
        console.warn(`[SICARA Sync] Operación finalizada o no aplicable (${res.status}):`, item);
        await removeQueueItem(item.id);
        errors++;
      }
    } catch (err) {
      console.error('[SICARA Sync] Error al sincronizar item offline:', err);
      // Si la llamada falló por error de red puro (ej: se volvió a caer el wifi), detener el bucle
      if (!isOnline()) {
        break;
      } else {
        // Si hay internet pero la petición falló, descartar para no atascar la cola
        await removeQueueItem(item.id);
        errors++;
      }
    }
  }

  const remaining = await getPendingQueue();
  window.dispatchEvent(
    new CustomEvent('sicara_offline_sync_finished', {
      detail: { synced, remaining: remaining.length, errors },
    })
  );

  return { synced, pending: remaining.length, errors };
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

  // Recuperación y restablecimiento de contraseña
  solicitarRecuperacionPassword: (correo) =>
    request('/auth/recuperar/solicitar', {
      method: 'POST',
      body: JSON.stringify({ correo }),
    }),
  verificarTokenRecuperacion: (token) =>
    request(`/auth/recuperar/verificar/${encodeURIComponent(token)}`),
  completarRecuperacionPassword: (data) =>
    request('/auth/recuperar/completar', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Dashboard Administrador General
  getDashboardStats: () => request('/dashboard/stats'),

  // Solicitudes
  getSolicitudes: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/solicitudes?${query}`);
  },
  aprobarSolicitud: (id, data = {}) =>
    request(`/solicitudes/${id}/aprobar`, {
      method: 'PUT',
      body: JSON.stringify(data),
      description: 'Aprobar solicitud de escuela',
    }),
  rechazarSolicitud: (id, motivo) =>
    request(`/solicitudes/${id}/rechazar`, {
      method: 'PUT',
      body: JSON.stringify({ motivo_rechazo: motivo }),
      description: 'Rechazar solicitud de escuela',
    }),
  solicitarNuevaEscuela: (datos) =>
    request('/solicitudes', {
      method: 'POST',
      body: JSON.stringify(datos),
      description: 'Registro de solicitud de escuela',
    }),
  createSolicitud: (datos) =>
    request('/solicitudes', {
      method: 'POST',
      body: JSON.stringify(datos),
      description: 'Registro de solicitud de escuela',
    }),

  // Escuelas
  getEscuelas: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/escuelas?${query}`);
  },
  getEscuelaById: (id) => request(`/escuelas/${id}`),
  updateEscuela: (id, data) =>
    request(`/escuelas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      description: `Actualizar información de escuela ${id}`,
    }),
  updateEstadoEscuela: (id, estado) =>
    request(`/escuelas/${id}/estado`, {
      method: 'PUT',
      body: JSON.stringify({ estado }),
      description: `Actualizar estado de escuela ${id}`,
    }),
  deleteEscuela: (id) =>
    request(`/escuelas/${id}`, {
      method: 'DELETE',
      description: `Eliminar escuela ${id}`,
    }),

  // Usuarios
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
      description: `Actualizar rol de usuario ${id}`,
    }),
  toggleEstadoUsuario: (id) =>
    request(`/usuarios/${id}/toggle-estado`, {
      method: 'PUT',
      description: `Activar/Inactivar usuario ${id}`,
    }),
  updateEstadoUsuario: (id, estado) =>
    request(`/usuarios/${id}/toggle-estado`, {
      method: 'PUT',
      body: JSON.stringify({ estado }),
      description: `Actualizar estado de usuario ${id}`,
    }),
  reenviarActivacionUsuario: (id) =>
    request(`/usuarios/${id}/reenviar-activacion`, {
      method: 'POST',
      description: `Reenviar correo de activación a usuario ${id}`,
    }),
  deleteUsuario: (id) =>
    request(`/usuarios/${id}`, {
      method: 'DELETE',
      description: `Eliminar usuario ${id}`,
    }),

  // Administradores
  getAdministradores: () => request('/administradores'),
  createAdministrador: (data) =>
    request('/administradores', {
      method: 'POST',
      body: JSON.stringify(data),
      description: 'Crear nuevo administrador',
    }),
  updateAdministrador: (id, data) =>
    request(`/administradores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      description: `Actualizar administrador ${id}`,
    }),
  toggleEstadoAdministrador: (id) =>
    request(`/administradores/${id}/toggle-estado`, {
      method: 'PUT',
      description: `Activar/Inactivar administrador ${id}`,
    }),
  updateEstadoAdministrador: (id, estado) =>
    request(`/administradores/${id}/toggle-estado`, {
      method: 'PUT',
      body: JSON.stringify({ estado }),
      description: `Actualizar estado de administrador ${id}`,
    }),
  solicitarEliminacion: (data) =>
    request('/administradores/solicitudes-eliminacion', {
      method: 'POST',
      body: JSON.stringify(data),
      description: `Solicitar eliminación de ${data.tipo_entidad} (${data.nombre_entidad})`,
    }),
  getSolicitudesEliminacion: () => request('/administradores/solicitudes-eliminacion'),
  resolverSolicitudEliminacion: (id, data) =>
    request(`/administradores/solicitudes-eliminacion/${id}/resolver`, {
      method: 'PUT',
      body: JSON.stringify(data),
      description: `Resolver solicitud de eliminación ${id}`,
    }),

  // Notificaciones
  getNotificaciones: () => request('/notificaciones'),
  marcarNotificacionLeida: (id) =>
    request(`/notificaciones/${id}/leida`, {
      method: 'PUT',
      description: `Marcar notificación ${id} como leída`,
    }),
  marcarNotificacionPendiente: (id) =>
    request(`/notificaciones/${id}/pendiente`, {
      method: 'PUT',
      description: `Mover notificación ${id} a pendientes`,
    }),
  marcarTodasNotificacionesLeidas: () =>
    request('/notificaciones/marcar-todas-leidas', {
      method: 'PUT',
      description: 'Marcar todas las notificaciones como leídas',
    }),

  // ==========================================
  // APIS DEL MÓDULO DIRECTIVO
  // ==========================================
  getDirectivoContexto: () => request('/directivo/contexto'),
  getDirectivoDashboard: () => request('/directivo/dashboard'),

  // Grupos
  getDirectivoGrupos: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/directivo/grupos${query ? `?${query}` : ''}`);
  },
  createDirectivoGrupo: (data) =>
    request('/directivo/grupos', {
      method: 'POST',
      body: JSON.stringify(data),
      description: `Crear grupo ${data.nombre_grupo}`,
    }),
  updateDirectivoGrupo: (id, data) =>
    request(`/directivo/grupos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      description: `Editar grupo ${id}`,
    }),
  deleteDirectivoGrupo: (id) =>
    request(`/directivo/grupos/${id}`, {
      method: 'DELETE',
      description: `Eliminar grupo ${id}`,
    }),

  // Materias
  getDirectivoMaterias: () => request('/directivo/materias'),
  createDirectivoMateria: (data) =>
    request('/directivo/materias', {
      method: 'POST',
      body: JSON.stringify(data),
      description: `Crear materia ${data.nombre_materia}`,
    }),
  updateDirectivoMateria: (id, data) =>
    request(`/directivo/materias/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      description: `Editar materia ${id}`,
    }),
  deleteDirectivoMateria: (id) =>
    request(`/directivo/materias/${id}`, {
      method: 'DELETE',
      description: `Eliminar materia ${id}`,
    }),

  // Docentes
  getDirectivoDocentes: () => request('/directivo/docentes'),
  createDirectivoDocente: (data) =>
    request('/directivo/docentes', {
      method: 'POST',
      body: JSON.stringify(data),
      description: `Crear docente ${data.nombre}`,
    }),
  updateDirectivoDocente: (id, data) =>
    request(`/directivo/docentes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      description: `Editar docente ${id}`,
    }),
  deleteDirectivoDocente: (id) =>
    request(`/directivo/docentes/${id}`, {
      method: 'DELETE',
      description: `Eliminar docente ${id}`,
    }),

  // Alumnos
  getDirectivoAlumnos: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/directivo/alumnos?${query}`);
  },
  createDirectivoAlumno: (data) =>
    request('/directivo/alumnos', {
      method: 'POST',
      body: JSON.stringify(data),
      description: `Crear alumno ${data.nombre}`,
    }),
  updateDirectivoAlumno: (id, data) =>
    request(`/directivo/alumnos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      description: `Editar alumno ${id}`,
    }),
  deleteDirectivoAlumno: (id) =>
    request(`/directivo/alumnos/${id}`, {
      method: 'DELETE',
      description: `Eliminar alumno ${id}`,
    }),

  // Asignaciones Curriculares (Grupo + Materia + Docente)
  createDirectivoAsignacion: (data) =>
    request('/directivo/asignaciones', {
      method: 'POST',
      body: JSON.stringify(data),
      description: 'Asignar docente y materia al grupo',
    }),
  deleteDirectivoAsignacion: (id) =>
    request(`/directivo/asignaciones/${id}`, {
      method: 'DELETE',
      description: `Eliminar asignación académica ${id}`,
    }),
  getDirectivoDocenteAsignaciones: (id_docente) => request(`/directivo/docentes/${id_docente}/asignaciones`),
  getDirectivoGrupoDetalle: (id_grupo) => request(`/directivo/grupos/${id_grupo}/detalle`),
  inscribirAlumnoGrupo: (id_grupo, id_alumno) =>
    request(`/directivo/grupos/${id_grupo}/inscribir`, {
      method: 'POST',
      body: JSON.stringify({ id_alumno }),
      description: `Inscribir alumno ${id_alumno} en grupo ${id_grupo}`,
    }),
  desvincularAlumnoGrupo: (id_grupo, id_alumno) =>
    request(`/directivo/grupos/${id_grupo}/alumnos/${id_alumno}`, {
      method: 'DELETE',
      description: `Desvincular alumno ${id_alumno} de grupo ${id_grupo}`,
    }),
  getDirectivoAlumnoHistorial: (id_alumno) => request(`/directivo/alumnos/${id_alumno}/historial`),
  createDirectivoAlerta: (data) =>
    request('/directivo/alertas', {
      method: 'POST',
      body: JSON.stringify(data),
      description: 'Crear alerta preventiva escolar',
    }),
  updateDirectivoAlerta: (id, data) =>
    request(`/directivo/alertas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      description: `Actualizar alerta ${id}`,
    }),
  getColoniasPorCP: (cp) => request(`/solicitudes/cp/${encodeURIComponent(cp)}`),

  // Dependencias para confirmación de eliminación segura
  getDirectivoDependencias: (tipo, id) => request(`/directivo/dependencias/${tipo}/${id}`),

  // Rendimiento y Alertas Institucionales
  getDirectivoRendimiento: () => request('/directivo/rendimiento'),
  getDirectivoAlertas: () => request('/directivo/alertas'),
  resolverDirectivoAlerta: (id, data) =>
    request(`/directivo/alertas/${id}/resolver`, {
      method: 'PUT',
      body: JSON.stringify(data),
      description: `Resolver alerta ${id}`,
    }),

  // Reportes
  getDirectivoReportes: () => request('/directivo/reportes'),
  generarDirectivoReporte: (data) =>
    request('/directivo/reportes/generar', {
      method: 'POST',
      body: JSON.stringify(data),
      description: 'Generar reporte institucional',
    }),

  // Configuración Institucional
  getDirectivoConfiguracion: () => request('/directivo/configuracion'),
  updateDirectivoConfiguracion: (data) =>
    request('/directivo/configuracion', {
      method: 'PUT',
      body: JSON.stringify(data),
      description: 'Actualizar configuración institucional',
    }),

  // Importación masiva por lote (CSV / Excel)
  importarGruposBatch: (grupos) =>
    request('/directivo/grupos/batch', {
      method: 'POST',
      body: JSON.stringify({ grupos }),
      description: 'Importación masiva de grupos',
    }),
  importarAlumnosBatch: (alumnos) =>
    request('/directivo/alumnos/batch', {
      method: 'POST',
      body: JSON.stringify({ alumnos }),
      description: 'Importación masiva de alumnos',
    }),
  importarDocentesBatch: (docentes) =>
    request('/directivo/docentes/batch', {
      method: 'POST',
      body: JSON.stringify({ docentes }),
      description: 'Importación masiva de docentes',
    }),
  importarMateriasBatch: (materias) =>
    request('/directivo/materias/batch', {
      method: 'POST',
      body: JSON.stringify({ materias }),
      description: 'Importación masiva de materias',
    }),
  importarEscuelaIntegral: (data) =>
    request('/directivo/importar-integral', {
      method: 'POST',
      body: JSON.stringify(data),
      description: 'Carga masiva integral de escuela',
    }),

  // Reenviar correo de alta al docente
  reenviarCorreoDocente: (id_docente) =>
    request(`/directivo/docentes/${id_docente}/reenviar-correo`, {
      method: 'POST',
      description: `Reenviar correo a docente ${id_docente}`,
    }),

  // Verificación de alta por CURP y definición de contraseña para Docentes
  verificarCurpDocente: (curp, correo) =>
    request('/auth/docente/verificar-curp', {
      method: 'POST',
      body: JSON.stringify({ curp, correo }),
    }),
  establecerPasswordDocente: (data) =>
    request('/auth/docente/establecer-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ==========================================
  // APIS DEL MÓDULO DEL DOCENTE
  // ==========================================
  getDocenteContexto: () => request('/docente/contexto'),
  getDocenteDashboard: () => request('/docente/dashboard'),
  getDocenteAsistencia: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/docente/asistencia?${query}`);
  },
  getDocenteAsistenciaHistorial: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/docente/asistencia-historial?${query}`);
  },
  guardarDocenteAsistencia: (data) =>
    request('/docente/asistencia', {
      method: 'POST',
      body: JSON.stringify(data),
      description: 'Pase de asistencia escolar',
    }),
  getDocenteCalificaciones: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/docente/calificaciones?${query}`);
  },
  guardarDocenteCalificaciones: (data) =>
    request('/docente/calificaciones', {
      method: 'POST',
      body: JSON.stringify(data),
      description: 'Guardar calificaciones y evaluaciones',
    }),
  getDocenteBoletaGrupo: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/docente/boleta-grupo?${query}`);
  },
  getDocenteAlertas: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/docente/alertas?${query}`);
  },
  resolverDocenteAlerta: (id, data) =>
    request(`/docente/alertas/${id}/resolver`, {
      method: 'PUT',
      body: JSON.stringify(data),
      description: `Resolver alerta ${id}`,
    }),
  getDocenteReportes: () => request('/docente/reportes'),
  crearDocenteReporte: (data) =>
    request('/docente/reportes', {
      method: 'POST',
      body: JSON.stringify(data),
      description: 'Crear reporte docente',
    }),
};
