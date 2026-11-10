import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

import DocenteSidebar from '../../components/docente/DocenteSidebar';
import DocenteNavbar from '../../components/docente/DocenteNavbar';
import ConfirmModal from '../../components/ConfirmModal';

import DocenteDashboardView from './DocenteDashboardView';
import DocenteAsistenciaView from './DocenteAsistenciaView';
import DocenteCalificacionesView from './DocenteCalificacionesView';
import DocenteAlertasView from './DocenteAlertasView';
import DocenteReportesView from './DocenteReportesView';

export default function DocentePanel() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [currentView, setCurrentView] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [docenteData, setDocenteData] = useState(null);
  const [asignaciones, setAsignaciones] = useState([]);
  const [alertasCount, setAlertasCount] = useState(0);

  // Alumno preseleccionado para creación de reporte desde alertas
  const [preloadedAlumnoReporte, setPreloadedAlumnoReporte] = useState(null);

  const fetchContexto = async () => {
    try {
      const res = await api.getDocenteContexto();
      if (res.success) {
        setDocenteData(res.docente);
        setAsignaciones(res.asignaciones || []);
        setAlertasCount(res.alertasPendientes || 0);
      }
    } catch (err) {
      console.warn('Error al obtener contexto del docente:', err);
    }
  };

  useEffect(() => {
    fetchContexto();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      showToast('Sesión de docente finalizada.', 'info');
      setShowLogoutConfirm(false);
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  };

  const handleNavigateToReporte = (alerta) => {
    setPreloadedAlumnoReporte({
      id_alumno: alerta.id_alumno,
      id_grupo: alerta.id_grupo,
      descripcion: alerta.descripcion,
    });
    setCurrentView('reportes');
  };

  const activeDocente = docenteData || user;
  const primaryColor = activeDocente?.color_primario || activeDocente?.escuela?.color_primario || '#722F37';
  const secondaryColor = activeDocente?.color_secundario || activeDocente?.escuela?.color_secundario || '#4A1722';

  return (
    <div
      style={{
        '--color-vino-primary': primaryColor,
        '--color-vino-dark': secondaryColor,
      }}
      className="min-h-screen bg-app-bg flex text-app-text"
    >
      {/* Sidebar Lateral para Docente */}
      <DocenteSidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        onLogout={() => setShowLogoutConfirm(true)}
        docente={activeDocente}
        alertasCount={alertasCount}
      />

      {/* Contenedor Principal */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Barra Superior */}
        <DocenteNavbar
          currentView={currentView}
          docente={activeDocente}
          alertasCount={alertasCount}
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          onLogout={() => setShowLogoutConfirm(true)}
          onNavigate={(v) => setCurrentView(v)}
        />

        {/* Contenido Dinámico de las Vistas */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          {currentView === 'dashboard' && (
            <DocenteDashboardView
              docente={activeDocente}
              onNavigate={(v) => setCurrentView(v)}
            />
          )}

          {currentView === 'asistencia' && (
            <DocenteAsistenciaView
              docente={activeDocente}
              asignaciones={asignaciones}
            />
          )}

          {currentView === 'calificaciones' && (
            <DocenteCalificacionesView
              docente={activeDocente}
              asignaciones={asignaciones}
            />
          )}

          {currentView === 'alertas' && (
            <DocenteAlertasView
              docente={activeDocente}
              asignaciones={asignaciones}
              onNavigateToReporte={handleNavigateToReporte}
            />
          )}

          {currentView === 'reportes' && (
            <DocenteReportesView
              docente={activeDocente}
              asignaciones={asignaciones}
              preloadedAlumno={preloadedAlumnoReporte}
            />
          )}
        </main>
      </div>

      {/* Modal de Confirmación de Cierre de Sesión */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Cerrar Sesión Docente"
        message="¿Desea salir del portal docente de SICARA? Tendrá que volver a iniciar sesión para gestionar asistencias y calificaciones."
        confirmText="Cerrar Sesión"
        cancelText="Permanecer"
        isDanger={true}
      />
    </div>
  );
}

