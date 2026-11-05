import React from 'react';
import { Menu, User, School, Sparkles } from 'lucide-react';

export default function DirectivoNavbar({
  currentView,
  user,
  escuela,
  onOpenMobileMenu,
  onLogout,
  onNavigate,
}) {
  const viewTitles = {
    dashboard: 'Dashboard General',
    alumnos: 'Gestión de Alumnos',
    alertas: 'Supervisión y Seguimiento de Alertas',
    docentes: 'Administración de Docentes',
    grupos: 'Gestión de Grupos Escolares',
    materias: 'Catálogo de Materias y Asignaciones',
    rendimiento: 'Rendimiento Académico y Asistencia',
    reportes: 'Generador de Reportes Institucionales',
    configuracion: 'Configuración Institucional e Identidad',
  };

  const primaryColor = escuela?.color_primario || '#722F37';

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-app-border px-4 sm:px-6 py-3 flex items-center justify-between shadow-soft">
      {/* Lado izquierdo: Botón menú móvil + Título + Escuela */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 -ml-2 rounded-card text-app-muted hover:text-app-text hover:bg-gray-100 lg:hidden cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-app-text leading-tight">
              {viewTitles[currentView] || 'Módulo del Directivo'}
            </h1>
            <span
              style={{ backgroundColor: primaryColor }}
              className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
            >
              <School className="w-3 h-3" />
              {escuela?.nombre_escuela || 'Plantel'}
            </span>
          </div>
          <p className="text-[11px] text-app-muted">
            SICARA • Sistema de Control y Asistencia para Escuelas Rurales
          </p>
        </div>
      </div>

      {/* Lado derecho: Perfil del usuario directivo */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate('configuracion')}
          className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-card hover:bg-gray-50 border border-transparent hover:border-app-border transition-colors cursor-pointer text-left"
          title="Ver configuración institucional"
        >
          <div
            style={{ backgroundColor: primaryColor }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-xs"
          >
            {user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'D'}
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-bold text-app-text leading-none">
              {user?.nombre} {user?.apellidos || ''}
            </p>
            <p className="text-[10px] font-semibold text-emerald-600 mt-0.5 uppercase tracking-wider">
              Directivo Institucional
            </p>
          </div>
        </button>
      </div>
    </header>
  );
}

