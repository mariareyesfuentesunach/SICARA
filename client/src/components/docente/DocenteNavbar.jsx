import React from 'react';
import {
  Menu,
  BellRing,
  LogOut,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

export default function DocenteNavbar({
  currentView,
  docente,
  alertasCount = 0,
  onOpenMobileMenu,
  onLogout,
  onNavigate,
}) {
  const primaryColor = docente?.color_primario || '#722F37';

  const viewTitles = {
    dashboard: 'Panel de Control Docente',
    asistencia: 'Pase de Lista y Rendimiento por Rangos',
    calificaciones: 'Calificaciones y Monitoreo de Alumnos',
    alertas: 'Alertas de Inasistencia y Bajo Rendimiento',
    reportes: 'Reportes de Bajo Rendimiento y Seguimiento',
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-app-border h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
      {/* Botón hamburguesa y título de vista */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-subtle hover:bg-gray-100 text-app-muted lg:hidden cursor-pointer"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-base sm:text-lg font-bold text-app-text leading-tight flex items-center gap-2">
            <span>{viewTitles[currentView] || 'Portal Docente'}</span>
          </h2>
          <span className="text-[11px] text-app-muted hidden sm:block">
            {docente?.nombre_escuela || 'SICARA Plataforma Educativa'}
          </span>
        </div>
      </div>

      {/* Acciones del lado derecho */}
      <div className="flex items-center gap-3">
        {/* Notificación de Alertas */}
        <button
          onClick={() => onNavigate && onNavigate('alertas')}
          className="relative p-2 rounded-subtle hover:bg-gray-100 text-app-muted hover:text-vino-primary transition-colors cursor-pointer"
          title="Ver alertas de alumnos"
        >
          <BellRing className="w-5 h-5" />
          {alertasCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 text-[9px] font-bold text-white items-center justify-center">
                {alertasCount > 9 ? '9+' : alertasCount}
              </span>
            </span>
          )}
        </button>

        {/* Perfil del Docente */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-app-border">
          <div
            style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
          >
            {docente?.nombre ? docente.nombre.charAt(0) : 'D'}
          </div>
          <div className="hidden md:block text-left">
            <span className="text-xs font-bold text-app-text block leading-tight">
              {docente?.nombre ? `${docente.nombre} ${docente.apellidos || ''}` : 'Docente'}
            </span>
            <span className="text-[10px] text-app-muted font-mono block">
              {docente?.especialidad || 'Profesor de Grupo'}
            </span>
          </div>

          <button
            onClick={onLogout}
            className="p-1.5 rounded-subtle hover:bg-red-50 text-app-muted hover:text-red-600 transition-colors ml-1 cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

