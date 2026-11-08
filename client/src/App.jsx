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
import AdministradoresView from './views/AdministradoresView';
import NotificacionesView from './views/NotificacionesView';
import PerfilView from './views/PerfilView';

// Módulo del Directivo Integrado
import DirectivoPanel from './views/directivo/DirectivoPanel';

// Nueva Landing Page Pública y Modal de Solicitud
import LandingPageView from './views/landing/LandingPageView';
import SolicitudRegistroModal from './views/landing/SolicitudRegistroModal';

export default function App() {
  const { user, isAuthenticated, loading, logout, isDirectivo } = useAuth();
  const { showToast } = useToast();

  // Estado para la navegación pública (cuando no está autenticado)
  // 'landing' -> Muestra la nueva Landing Page de bienvenida
  // 'login'   -> Muestra el formulario de inicio de sesión original
  const [publicView, setPublicView] = useState('landing');
  const [showSolicitudModal, setShowSolicitudModal] = useState(false);

  const [currentView, setCurrentView] = useState('dashboard');
  const [solicitudesInitialFilter, setSolicitudesInitialFilter] = useState('todas');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Manejador centralizado de navegación con soporte para filtros de vistas hijas
  const handleNavigate = (view, options = {}) => {
    if (view === 'solicitudes' && options.filter !== undefined) {
      setSolicitudesInitialFilter(options.filter);
    }
    setCurrentView(view);
  };

  // Contadores globales para Administrador General
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsList, setNotificationsList] = useState([]);

  // Consultar contadores globales sólo si es Administrador
  const fetchGlobalCounters = useCallback(async () => {
    if (!isAuthenticated || isDirectivo) return;
    try {
      const [dashRes, notifRes] = await Promise.all([
        api.getDashboardStats().catch(() => null),
        api.getNotificaciones().catch(() => null),
      ]);

      if (dashRes && dashRes.success) {
        setPendingCount(dashRes.stats.solicitudesPendientes || 0);
      }

      if (notifRes && notifRes.success) {
        setUnreadCount(notifRes.totalPendientes ?? notifRes.conteoNoLeidas ?? 0);
        setNotificationsList(notifRes.pendientes || notifRes.notificaciones || []);
      }
    } catch (err) {
      console.warn('Error sincronizando contadores:', err);
    }
  }, [isAuthenticated, isDirectivo]);

  useEffect(() => {
    if (isAuthenticated && !isDirectivo) {
      fetchGlobalCounters();
      const interval = setInterval(fetchGlobalCounters, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, isDirectivo, fetchGlobalCounters]);

  const handleLogout = async () => {
    try {
      await logout();
      showToast('Sesión finalizada exitosamente.', 'info');
      setShowLogoutConfirm(false);
      setCurrentView('dashboard');
      setPublicView('landing');
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

  // Si no está autenticado -> Flujo público con Landing Page como bienvenida
  if (!isAuthenticated) {
    if (publicView === 'login') {
      return (
        <div className="relative">
          {/* Botón flotante para regresar a la Landing Page */}
          <div className="fixed top-4 left-4 z-50">
            <button
              onClick={() => setPublicView('landing')}
              className="px-3.5 py-2 rounded-full bg-white text-app-text hover:text-vino-primary shadow-soft border border-app-border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>← Volver al inicio</span>
            </button>
          </div>
          <LoginView />
        </div>
      );
    }

    return (
      <>
        <LandingPageView
          onGoToLogin={() => setPublicView('login')}
          onOpenSolicitud={() => setShowSolicitudModal(true)}
        />
        {/* Modal de Solicitud de Registro de Escuela */}
        <SolicitudRegistroModal
          isOpen={showSolicitudModal}
          onClose={() => setShowSolicitudModal(false)}
        />
      </>
    );
  }

  // Si el usuario autenticado tiene el rol DIRECTIVO -> Renderizar el Panel del Directivo
  if (isDirectivo) {
    return <DirectivoPanel />;
  }

  // Si el usuario es ADMINISTRADOR GENERAL -> Mantener el Panel del Administrador General intacto
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
          onNavigate={(view, opts) => handleNavigate(view, opts)}
          onLogout={() => setShowLogoutConfirm(true)}
        />

        {/* Contenido Principal de las Vistas del Administrador General */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          {currentView === 'dashboard' && (
            <DashboardView onNavigate={(view, opts) => handleNavigate(view, opts)} />
          )}

          {currentView === 'solicitudes' && (
            <SolicitudesView
              initialFilter={solicitudesInitialFilter}
              onRefreshDashboard={fetchGlobalCounters}
            />
          )}

          {currentView === 'escuelas' && <EscuelasView />}

          {currentView === 'usuarios' && <UsuariosView />}

          {currentView === 'administradores' && <AdministradoresView />}

          {currentView === 'notificaciones' && (
            <NotificacionesView
              onNavigate={(view, opts) => handleNavigate(view, opts)}
              onRefreshNotif={fetchGlobalCounters}
            />
          )}

          {currentView === 'perfil' && <PerfilView />}
        </main>
      </div>

      {/* Modal de Confirmación para Cerrar Sesión del Administrador General */}
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
