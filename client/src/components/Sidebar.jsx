import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  School,
  Users,
  Bell,
  UserCircle,
  LogOut,
  GraduationCap,
  X,
  ShieldCheck,
} from 'lucide-react';

export default function Sidebar({
  currentView,
  setCurrentView,
  pendingCount = 0,
  unreadNotifications = 0,
  isMobileOpen,
  setIsMobileOpen,
  onLogout,
}) {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'solicitudes',
      label: 'Solicitudes de Escuelas',
      icon: ClipboardList,
      badge: pendingCount > 0 ? pendingCount : null,
      badgeColor: 'bg-status-warning text-white',
    },
    {
      id: 'escuelas',
      label: 'Escuelas',
      icon: School,
    },
    {
      id: 'usuarios',
      label: 'Usuarios',
      icon: Users,
    },
    {
      id: 'notificaciones',
      label: 'Notificaciones',
      icon: Bell,
      badge: unreadNotifications > 0 ? unreadNotifications : null,
      badgeColor: 'bg-vino-light text-white',
    },
    {
      id: 'perfil',
      label: 'Mi Perfil',
      icon: UserCircle,
    },
  ];

  const handleNavClick = (viewId) => {
    setCurrentView(viewId);
    if (setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-gradient-to-b from-vino-dark via-vino to-vino-dark text-white flex flex-col shadow-elevated transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header / Brand */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-inner">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-wider text-white">SICARA</h1>
              <p className="text-[11px] font-medium text-white/70 uppercase tracking-widest">
                Escuelas Rurales
              </p>
            </div>
          </div>
          {/* Mobile close button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Admin Badge */}
        <div className="px-5 py-3 mx-4 my-3 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="truncate">
            <div className="text-[11px] font-bold uppercase tracking-wider text-white/90">
              Administrador General
            </div>
            <div className="text-[10px] text-white/60 truncate">Módulo Central</div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-subtle text-sm font-semibold transition-all group ${
                  isActive
                    ? 'bg-white text-vino-dark shadow-md font-bold'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      isActive ? 'text-vino-primary' : 'text-white/70 group-hover:text-white'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-subtle text-sm font-semibold text-red-200 hover:text-white hover:bg-red-500/20 transition-all group"
          >
            <LogOut className="w-5 h-5 text-red-300 group-hover:text-red-100 transition-colors" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}

