import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, getToken, setToken, isOnline } from '../services/api';
import { authenticateOffline, saveUserOffline } from '../services/offlineStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('sicara_offline_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      localStorage.removeItem('sicara_offline_user');
      setLoading(false);
      return;
    }

    // Si NO hay internet al cargar la página, mantener la sesión del usuario guardada localmente
    if (!isOnline()) {
      try {
        const cachedUserStr = localStorage.getItem('sicara_offline_user');
        if (cachedUserStr) {
          const cachedUser = JSON.parse(cachedUserStr);
          setUser(cachedUser);
          setLoading(false);
          return;
        }
      } catch {
        // Fallback
      }
    }

    try {
      const data = await api.getMe();
      if (
        data.success &&
        data.user &&
        (data.user.rol === 'Administrador' ||
          data.user.rol === 'Directivo' ||
          data.user.rol === 'Docente')
      ) {
        setUser(data.user);
        localStorage.setItem('sicara_offline_user', JSON.stringify(data.user));
      } else {
        // Si el servidor responde explícitamente que no es válido
        if (!data._fromOfflineCache) {
          setUser(null);
          setToken(null);
          localStorage.removeItem('sicara_offline_user');
        }
      }
    } catch (err) {
      console.warn('Error verificando sesión existente:', err);
      // Si el fallo fue de red y tenemos usuario en localStorage, mantenerlo activo
      const cachedUserStr = localStorage.getItem('sicara_offline_user');
      if (cachedUserStr) {
        setUser(JSON.parse(cachedUserStr));
      } else {
        setUser(null);
        setToken(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    const handleUnauthorized = () => {
      // Solo desloguear si estamos online; si es error de red offline, no invalidar la sesión
      if (isOnline()) {
        setUser(null);
        setToken(null);
        localStorage.removeItem('sicara_offline_user');
      }
    };

    window.addEventListener('sicara_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('sicara_unauthorized', handleUnauthorized);
  }, [checkAuth]);

  const login = async (correo, contrasena) => {
    // 1. Si no hay conexión a internet, intentar autenticación local offline
    if (!isOnline()) {
      const offlineRes = await authenticateOffline(correo, contrasena);
      if (offlineRes.success) {
        setToken(offlineRes.token || 'offline_session_token');
        setUser(offlineRes.user);
        localStorage.setItem('sicara_offline_user', JSON.stringify(offlineRes.user));
        return {
          ...offlineRes,
          offline: true,
        };
      }
      throw new Error(offlineRes.message);
    }

    // 2. Si hay conexión a internet, login normal con el servidor y respaldar credenciales para offline
    try {
      const res = await api.login(correo, contrasena);
      if (res.success && res.token) {
        setToken(res.token);
        setUser(res.user);
        localStorage.setItem('sicara_offline_user', JSON.stringify(res.user));

        // Respaldar hash de credenciales en IndexedDB de manera segura para futuros logins offline
        saveUserOffline({
          correo,
          password: contrasena,
          user: res.user,
          token: res.token,
        }).catch((e) => console.warn('Error al guardar credenciales offline:', e));

        return res;
      }
      throw new Error(res.message || 'Error en inicio de sesión');
    } catch (err) {
      // Si falló por caída súbita de red, intentar fallback offline
      if (!isOnline() || err.message?.includes('fetch') || err.message?.includes('NetworkError')) {
        const offlineRes = await authenticateOffline(correo, contrasena);
        if (offlineRes.success) {
          setToken(offlineRes.token || 'offline_session_token');
          setUser(offlineRes.user);
          localStorage.setItem('sicara_offline_user', JSON.stringify(offlineRes.user));
          return {
            ...offlineRes,
            offline: true,
          };
        }
      }
      throw err;
    }
  };

  const setSession = (token, userData) => {
    setToken(token);
    setUser(userData);
    localStorage.setItem('sicara_offline_user', JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      if (isOnline()) {
        await api.logout();
      }
    } catch {
      // Ignorar error al cerrar sesión
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('sicara_offline_user');
    }
  };

  const updateUser = (updatedData) => {
    setUser((prev) => {
      const updated = { ...prev, ...updatedData };
      localStorage.setItem('sicara_offline_user', JSON.stringify(updated));
      return updated;
    });
  };

  const isAdministrador = user?.rol === 'Administrador';
  const isDirectivo = user?.rol === 'Directivo';
  const isDocente = user?.rol === 'Docente';
  const isPrincipal = Boolean(user?.es_principal);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateUser,
        setSession,
        isAuthenticated: !!user,
        isAdministrador,
        isDirectivo,
        isDocente,
        isPrincipal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
