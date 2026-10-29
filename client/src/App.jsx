import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';
import { api } from './services/api';

import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import ConfirmModal from './components/ConfirmModal';

import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import SolicitudesView from './views/SolicitudesView';
import EscuelasView from './views/EscuelasView';
import UsuariosView from './views/UsuariosView';
import NotificacionesView from './views/NotificacionesView';
import PerfilView from './views/PerfilView';

export default function App() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const { showToast } = useToast();

  const [currentView, setCurrentView] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Contadores globales
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsList, setNotificationsList] = useState([]);

  // Consultar contadores globales
  const fetchGlobalCounters = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [dashRes, notifRes] = await Promise.all([
        api.getDashboardStats().catch(() => null),
        api.getNotificaciones().catch(() => null),
      ]);

      if (dashRes && dashRes.success) {
        setPendingCount(dashRes.stats.solicitudesPendientes || 0);
      }

      if (notifRes && notifRes.success) {
        setUnreadCount(notifRes.conteoNoLeidas || 0);
        setNotificationsList(notifRes.notificaciones || []);
      }
    } catch (err) {
      console.warn('Error sincronizando contadores:', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchGlobalCounters();
      const interval = setInterval(fetchGlobalCounters, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchGlobalCounters]);

  const handleLogout = async () => {
    try {
      await logout();
      showToast('Sesión finalizada exitosamente.', 'info');
      setShowLogoutConfirm(false);
      setCurrentView('dashboard');
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  };

  // Pantalla de carga inicial
  if (loading) {
    return (
      <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-vino-primary flex items-center justify-center text-white mb-4 shadow-elevated animate-bounce">
          <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
        <h2 className="text-base font-bold text-vino-dark tracking-wide">SICARA</h2>
        <p className="text-xs text-app-muted mt-1">Cargando sistema de administración rural...</p>
      </div>
    );
  }

  // Si no está autenticado -> Pantalla de Inicio de Sesión
  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-app-bg flex text-app-text">
      {/* Sidebar Lateral */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        pendingCount={pendingCount}
        unreadNotifications={unreadCount}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        onLogout={() => setShowLogoutConfirm(true)}
      />

      {/* Área Principal (desplazada por la barra lateral en lg) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Barra Superior */}
        <Navbar
          currentView={currentView}
          user={user}
          unreadCount={unreadCount}
          notifications={notificationsList}
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          onNavigate={(view) => setCurrentView(view)}
          onLogout={() => setShowLogoutConfirm(true)}
        />

        {/* Contenido Principal de las Vistas */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          {currentView === 'dashboard' && (
            <DashboardView onNavigate={(view) => setCurrentView(view)} />
          )}

          {currentView === 'solicitudes' && (
            <SolicitudesView onRefreshDashboard={fetchGlobalCounters} />
          )}

          {currentView === 'escuelas' && <EscuelasView />}

          {currentView === 'usuarios' && <UsuariosView />}

          {currentView === 'notificaciones' && (
            <NotificacionesView
              onNavigate={(view) => setCurrentView(view)}
              onRefreshNotif={fetchGlobalCounters}
            />
          )}

          {currentView === 'perfil' && <PerfilView />}
        </main>
      </div>

      {/* Modal de Confirmación para Cerrar Sesión */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Cerrar Sesión de Administrador"
        message="¿Desea finalizar su sesión de Administrador General? Deberá ingresar sus credenciales nuevamente para acceder."
        confirmText="Cerrar Sesión"
        cancelText="Permanecer"
        isDanger={true}
      />
    </div>
  );
}
