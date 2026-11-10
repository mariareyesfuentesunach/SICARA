import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  Award,
  BellRing,
  FileSpreadsheet,
  LogOut,
  X,
  School,
  GraduationCap,
  Users,
} from 'lucide-react';

export default function DocenteSidebar({
  currentView,
  setCurrentView,
  isMobileOpen,
  setIsMobileOpen,
  onLogout,
  docente,
  alertasCount = 0,
}) {
  const primaryColor = docente?.color_primario || '#722F37';

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Mi Panel Docente',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'asistencia',
      label: 'Lista de Asistencia',
      icon: CalendarCheck,
      badge: null,
    },
    {
      id: 'calificaciones',
      label: 'Calificaciones y Rangos',
      icon: Award,
      badge: null,
    },
    {
      id: 'alertas',
      label: 'Alertas de Alumnos',
      icon: BellRing,
      badge: alertasCount > 0 ? alertasCount : null,
      badgeColor: 'bg-red-500 text-white',
    },
    {
      id: 'reportes',
      label: 'Reportes Pedagógicos',
      icon: FileSpreadsheet,
      badge: null,
    },
  ];

  return (
    <>
      {/* Overlay para móviles */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar fijo lateral */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-white border-r border-app-border flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Cabecera institucional del Docente */}
          <div className="p-5 border-b border-app-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  style={{ backgroundColor: primaryColor }}
                  className="w-10 h-10 rounded-card flex items-center justify-center text-white shadow-sm"
                >
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base font-black tracking-tight text-app-text leading-tight truncate">
                    SICARA
                  </h1>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-vino-primary block truncate">
                    Portal del Docente
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-1.5 rounded-subtle hover:bg-gray-100 text-app-muted lg:hidden cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Identidad de la Escuela Asignada */}
            <div className="mt-4 p-2.5 rounded-subtle bg-gray-50 border border-app-border/80 text-[11px] flex items-center gap-2">
              <School className="w-4 h-4 text-vino-primary shrink-0" />
              <div className="min-w-0 flex-1 truncate">
                <span className="font-bold text-app-text block truncate">
                  {docente?.nombre_escuela || 'Plantel Educativo'}
                </span>
                <span className="text-[10px] text-app-muted font-mono block truncate">
                  CCT: {docente?.cct || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Menú de Navegación */}
          <nav className="p-3 space-y-1.5 flex-1">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-app-muted">
              Módulos Académicos
            </div>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    setIsMobileOpen(false);
                  }}
                  style={
                    isActive
                      ? {
                          backgroundColor: `${primaryColor}15`,
                          color: primaryColor,
                          borderLeftColor: primaryColor,
                        }
                      : {}
                  }
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-subtle text-xs font-bold transition-all cursor-pointer border-l-4 ${
                    isActive
                      ? 'border-l-4 shadow-xs'
                      : 'border-transparent text-app-muted hover:text-app-text hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge !== null && (
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        item.badgeColor || 'bg-gray-100 text-app-text'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Pie de perfil y cierre de sesión */}
        <div className="p-4 border-t border-app-border bg-gray-50/50">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="min-w-0 flex-1">
              <div className="font-bold text-xs text-app-text truncate">
                {docente?.nombre ? `${docente.nombre} ${docente.apellidos || ''}` : 'Docente'}
              </div>
              <div className="text-[10px] text-app-muted font-mono truncate">
                {docente?.curp ? `CURP: ${docente.curp}` : docente?.correo}
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-subtle border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}

