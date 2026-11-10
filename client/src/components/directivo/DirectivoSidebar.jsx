import React from 'react';
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  GraduationCap,
  Layers,
  BookOpen,
  TrendingUp,
  FileText,
  Settings,
  LogOut,
  X,
  School,
  UploadCloud,
} from 'lucide-react';

export default function DirectivoSidebar({
  currentView,
  setCurrentView,
  isMobileOpen,
  setIsMobileOpen,
  onLogout,
  escuela,
  alertasCount = 0,
}) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'alumnos', label: 'Alumnos', icon: Users },
    {
      id: 'alertas',
      label: 'Alertas',
      icon: AlertTriangle,
      badge: alertasCount > 0 ? alertasCount : null,
      badgeColor: 'bg-amber-500 text-white',
    },
    { id: 'docentes', label: 'Docentes', icon: GraduationCap },
    { id: 'grupos', label: 'Grupos', icon: Layers },
    { id: 'materias', label: 'Materias', icon: BookOpen },
    { id: 'rendimiento', label: 'Rendimiento académico', icon: TrendingUp },
    { id: 'reportes', label: 'Reportes', icon: FileText },
    { id: 'importacion', label: 'Carga Masiva Escolar', icon: UploadCloud },
    { id: 'configuracion', label: 'Configuración institucional', icon: Settings },
  ];

  const primaryColor = escuela?.color_primario || '#722F37';
  const secondaryColor = escuela?.color_secundario || '#4A1722';

  return (
    <>
      {/* Backdrop para dispositivos móviles */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden animate-fade-in"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Barra lateral */}
      <aside
        style={{ backgroundColor: secondaryColor }}
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 text-white flex flex-col transition-transform duration-300 ease-in-out shadow-elevated lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Cabecera con Logotipo y Nombre de la Escuela */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/10 p-1 flex items-center justify-center shrink-0 border border-white/20 overflow-hidden shadow-inner">
              {escuela?.tiene_logo ? (
                <img
                  src={`/api/directivo/logo?escuela=${escuela?.id_escuela}&t=${Date.now()}`}
                  alt="Logo Escuela"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <School className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-bold text-white truncate leading-tight tracking-wide">
                {escuela?.nombre_escuela || 'Mi Escuela Rural'}
              </h1>
              <p className="text-[10px] text-white/70 font-mono tracking-wider truncate">
                CCT: {escuela?.cct || 'S/N'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1 rounded-subtle text-white/70 hover:text-white hover:bg-white/10 lg:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Identificador de Módulo */}
        <div className="px-5 py-2.5 bg-black/15 border-b border-white/5 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-bold text-white/90 uppercase tracking-widest">
            Módulo Directivo
          </span>
        </div>

        {/* Menú de Navegación Exacto (9 apartados) */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
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
                    ? { backgroundColor: primaryColor, color: '#ffffff' }
                    : {}
                }
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-card text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'shadow-soft font-bold'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded-full shadow-xs ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer: Cerrar Sesión */}
        <div className="p-3 border-t border-white/10 bg-black/10">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-200 hover:text-white hover:bg-rose-900/40 rounded-card transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}

