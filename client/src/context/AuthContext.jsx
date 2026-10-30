import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, getToken, setToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await api.getMe();
      if (data.success && data.user && data.user.rol === 'Administrador') {
        setUser(data.user);
      } else {
        setUser(null);
        setToken(null);
      }
    } catch (err) {
      console.warn('Error verificando sesión existente:', err);
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('sicara_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('sicara_unauthorized', handleUnauthorized);
  }, [checkAuth]);

  const login = async (correo, contrasena) => {
    const res = await api.login(correo, contrasena);
    if (res.success && res.token) {
      setToken(res.token);
      setUser(res.user);
      return res;
    }
    throw new Error(res.message || 'Error en inicio de sesión');
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (err) {
      // Ignorar error al cerrar sesión
    } finally {
      setToken(null);
      setUser(null);
    }
  };

  const updateUser = (updatedData) => {
    setUser((prev) => ({ ...prev, ...updatedData }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        updateUser,
        refreshProfile: checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}

