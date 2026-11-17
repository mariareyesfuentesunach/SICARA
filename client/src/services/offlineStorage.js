// IndexedDB Offline Storage and Sync Manager for SICARA
// Diseñado especialmente para escuelas rurales con conectividad intermitente o nula.

const DB_NAME = 'sicara_offline_db';
const DB_VERSION = 2; // Incrementar versión para agregar almacén de usuarios offline

// Nombres de los almacenes
export const STORES = {
  CACHE: 'api_cache', // Para almacenar respuestas de endpoints GET
  QUEUE: 'sync_queue', // Cola de operaciones pendientes (POST, PUT, DELETE)
  META: 'sync_meta', // Metadatos, marcas de tiempo y estado
  USERS: 'offline_users', // Usuarios autenticados previamente para login offline
};

/**
 * Función criptográfica segura del navegador para hashear contraseñas offline (SHA-256)
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Abre o inicializa la base de datos IndexedDB local
 */
export function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      return reject(new Error('IndexedDB no está soportado en este navegador.'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Almacén para caché de peticiones GET
      if (!db.objectStoreNames.contains(STORES.CACHE)) {
        db.createObjectStore(STORES.CACHE, { keyPath: 'key' });
      }

      // Almacén para la cola de sincronización (operaciones pendientes)
      if (!db.objectStoreNames.contains(STORES.QUEUE)) {
        const queueStore = db.createObjectStore(STORES.QUEUE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
        queueStore.createIndex('status', 'status', { unique: false });
      }

      // Almacén para metadatos del sistema local
      if (!db.objectStoreNames.contains(STORES.META)) {
        db.createObjectStore(STORES.META, { keyPath: 'key' });
      }

      // Almacén para usuarios autorizados offline (clave: correo en minúsculas)
      if (!db.objectStoreNames.contains(STORES.USERS)) {
        db.createObjectStore(STORES.USERS, { keyPath: 'correo' });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Guarda o actualiza credenciales y perfil de un usuario para permitir login offline
 */
export async function saveUserOffline({ correo, password, user, token }) {
  try {
    const db = await openDB();
    const passwordHash = await hashPassword(password);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.USERS, 'readwrite');
      const store = tx.objectStore(STORES.USERS);
      store.put({
        correo: correo.trim().toLowerCase(),
        passwordHash,
        user,
        token,
        savedAt: Date.now(),
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Error guardando usuario offline:', err);
  }
}

/**
 * Intenta autenticar un usuario offline comprobando el hash de su contraseña guardada
 */
export async function authenticateOffline(correo, password) {
  try {
    const db = await openDB();
    const cleanEmail = correo.trim().toLowerCase();
    const inputHash = await hashPassword(password);

    return new Promise((resolve) => {
      const tx = db.transaction(STORES.USERS, 'readonly');
      const store = tx.objectStore(STORES.USERS);
      const req = store.get(cleanEmail);

      req.onsuccess = () => {
        const record = req.result;
        if (!record) {
          return resolve({
            success: false,
            message: 'Este usuario nunca ha iniciado sesión con internet en este equipo. Se requiere al menos un inicio de sesión previo para habilitar el acceso offline.',
          });
        }

        if (record.passwordHash !== inputHash) {
          return resolve({
            success: false,
            message: 'Contraseña incorrecta para el usuario local.',
          });
        }

        resolve({
          success: true,
          offlineMode: true,
          user: record.user,
          token: record.token,
          message: 'Inicio de sesión offline exitoso en este equipo.',
        });
      };

      req.onerror = () => {
        resolve({
          success: false,
          message: 'Error al consultar usuarios guardados en este equipo.',
        });
      };
    });
  } catch (err) {
    return {
      success: false,
      message: 'No se pudo validar el acceso sin conexión: ' + (err.message || 'Error desconocido'),
    };
  }
}

/**
 * Guarda una respuesta en caché para uso offline
 */
export async function setCachedData(key, data) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CACHE, 'readwrite');
      const store = tx.objectStore(STORES.CACHE);
      store.put({
        key,
        data,
        updatedAt: Date.now(),
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Error guardando en caché offline:', err);
  }
}

/**
 * Recupera datos de la caché local cuando no hay conexión
 */
export async function getCachedData(key) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CACHE, 'readonly');
      const store = tx.objectStore(STORES.CACHE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Error leyendo caché offline:', err);
    return null;
  }
}

/**
 * Agrega una operación a la cola de sincronización
 */
export async function queueOfflineAction({ endpoint, method, body, headers, description }) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.QUEUE, 'readwrite');
      const store = tx.objectStore(STORES.QUEUE);
      const item = {
        endpoint,
        method: method.toUpperCase(),
        body,
        headers: headers || {},
        description: description || `${method.toUpperCase()} ${endpoint}`,
        timestamp: Date.now(),
        retries: 0,
        status: 'pending',
      };
      const req = store.add(item);
      req.onsuccess = () => {
        // Disparar evento para que la interfaz sepa que hay cambios locales pendientes
        window.dispatchEvent(new CustomEvent('sicara_offline_queue_changed'));
        resolve(req.result);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error encolando acción offline:', err);
    throw err;
  }
}

/**
 * Obtiene todas las operaciones pendientes en la cola
 */
export async function getPendingQueue() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.QUEUE, 'readonly');
      const store = tx.objectStore(STORES.QUEUE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Error consultando cola offline:', err);
    return [];
  }
}

/**
 * Elimina una operación de la cola tras sincronizarse con éxito
 */
export async function removeQueueItem(id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.QUEUE, 'readwrite');
      const store = tx.objectStore(STORES.QUEUE);
      const req = store.delete(id);
      tx.oncomplete = () => {
        window.dispatchEvent(new CustomEvent('sicara_offline_queue_changed'));
        resolve(true);
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Error eliminando item de cola:', err);
  }
}

/**
 * Limpia toda la base de datos offline (útil al cerrar sesión)
 */
export async function clearOfflineData() {
  try {
    const db = await openDB();
    const tx = db.transaction([STORES.CACHE, STORES.QUEUE, STORES.META], 'readwrite');
    tx.objectStore(STORES.CACHE).clear();
    tx.objectStore(STORES.QUEUE).clear();
    tx.objectStore(STORES.META).clear();
    return new Promise((resolve) => {
      tx.oncomplete = () => {
        window.dispatchEvent(new CustomEvent('sicara_offline_queue_changed'));
        resolve(true);
      };
    });
  } catch (err) {
    console.warn('Error limpiando datos offline:', err);
  }
}
