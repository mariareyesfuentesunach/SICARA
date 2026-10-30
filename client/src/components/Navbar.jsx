import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Bell,
  User,
  ChevronDown,
  LogOut,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export default function Navbar({
  currentView,
  user,
  unreadCount = 0,
  notifications = [],
  onOpenMobileMenu,
  onNavigate,
  onLogout,
}) {
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Cerrar menús al hacer click afuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifMenu(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const viewTitles = {
    dashboard: {
      title: 'Panel Principal',
      subtitle: 'Resumen general del sistema y estadísticas de escuelas rurales',
    },
    solicitudes: {
      title: 'Solicitudes de Escuelas',
      subtitle: 'Revisión, aprobación y gestión de registros escolares entrantes',
    },
    escuelas: {
      title: 'Catálogo de Escuelas',
      subtitle: 'Planteles registrados en el sistema SICARA y su información detallada',
    },
    usuarios: {
      title: 'Gestión de Usuarios',
      subtitle: 'Administración de cuentas directivas, docentes y roles asignados',
    },
    notificaciones: {
      title: 'Centro de Notificaciones',
      subtitle: 'Avisos administrativos, alertas académicas y cambios de estado',
    },
    perfil: {
      title: 'Mi Perfil de Administrador',
      subtitle: 'Datos de la cuenta principal, seguridad y credenciales',
    },
  };

  const current = viewTitles[currentView] || {
    title: 'SICARA',
    subtitle: 'Módulo del Administrador General',
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-app-border px-4 lg:px-8 py-3.5 flex items-center justify-between shadow-soft">
      {/* Lado izquierdo: Título de la ventana */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 -ml-2 rounded-subtle text-app-text hover:bg-vino-soft hover:text-vino-primary lg:hidden transition-colors"
          title="Abrir menú lateral"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-lg lg:text-xl font-bold text-app-text leading-tight">
            {current.title}
          </h2>
          <p className="text-xs text-app-muted hidden sm:block">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Lado derecho: Notificaciones y Perfil */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notificaciones Bell Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className={`relative p-2.5 rounded-full border transition-all ${
              showNotifMenu
                ? 'bg-vino-soft border-vino-border text-vino-primary'
                : 'bg-white border-app-border text-app-text hover:bg-vino-soft hover:text-vino-primary'
            }`}
            title="Ver notificaciones"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-status-error text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Menú desplegable de Notificaciones */}
          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-card bg-white shadow-elevated border border-app-border py-2 z-50 animate-fade-in">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-app-border">
                <span className="text-sm font-bold text-app-text">Notificaciones</span>
                <button
                  onClick={() => {
                    setShowNotifMenu(false);
                    onNavigate('notificaciones');
                  }}
                  className="text-xs font-semibold text-vino-primary hover:text-vino-dark flex items-center gap-1"
                >
                  Ver todas <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-app-border/50">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-app-muted">
                    No hay notificaciones pendientes.
                  </div>
                ) : (
                  notifications.slice(0, 4).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        setShowNotifMenu(false);
                        onNavigate('notificaciones');
                      }}
                      className="p-3.5 hover:bg-vino-soft/40 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        {n.tipo.includes('solicitud') ? (
                          <div className="p-1.5 rounded-full bg-status-warning-bg text-status-warning shrink-0 mt-0.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="p-1.5 rounded-full bg-blue-100 text-blue-700 shrink-0 mt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-app-text truncate">
                            {n.titulo}
                          </p>
                          <p className="text-[11px] text-app-muted line-clamp-2 mt-0.5">
                            {n.descripcion}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-app-border text-center bg-gray-50/50">
                <button
                  onClick={() => {
                    setShowNotifMenu(false);
                    onNavigate('notificaciones');
                  }}
                  className="w-full py-1.5 text-xs font-bold text-vino-primary hover:text-vino-dark"
                >
                  Ir al centro de notificaciones
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Separador vertical */}
        <div className="h-6 w-px bg-app-border hidden sm:block" />

        {/* Perfil del Administrador Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-full border border-app-border bg-white hover:bg-vino-soft/50 transition-all text-left"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-vino-dark to-vino-primary text-white flex items-center justify-center font-bold text-xs shadow-sm">
              {user ? user.nombre?.charAt(0).toUpperCase() || 'A' : 'A'}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-app-text leading-tight truncate max-w-[120px]">
                {user ? `${user.nombre} ${user.apellidos || ''}` : 'Administrador'}
              </p>
              <p className="text-[10px] font-semibold text-vino-primary uppercase tracking-wider">
                Admin General
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-app-muted hidden sm:block" />
          </button>

          {/* Menú de Perfil */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-card bg-white shadow-elevated border border-app-border py-2 z-50 animate-fade-in">
              <div className="px-4 py-2 border-b border-app-border">
                <p className="text-xs font-bold text-app-text truncate">
                  {user ? `${user.nombre} ${user.apellidos || ''}` : 'Administrador General'}
                </p>
                <p className="text-[11px] text-app-muted truncate">
                  {user?.correo || 'Admin_Palasio@gmail.com'}
                </p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onNavigate('perfil');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-app-text hover:bg-vino-soft hover:text-vino-primary transition-colors text-left"
                >
                  <User className="w-4 h-4 text-vino-primary" />
                  <span>Mi Perfil</span>
                </button>
              </div>

              <div className="border-t border-app-border pt-1">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-status-error hover:bg-status-error-bg transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

