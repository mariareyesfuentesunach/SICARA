import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

import DirectivoSidebar from '../../components/directivo/DirectivoSidebar';
import DirectivoNavbar from '../../components/directivo/DirectivoNavbar';
import ConfirmModal from '../../components/ConfirmModal';

import DirectivoDashboardView from './DirectivoDashboardView';
import DirectivoAlumnosView from './DirectivoAlumnosView';
import DirectivoAlertasView from './DirectivoAlertasView';
import DirectivoDocentesView from './DirectivoDocentesView';
import DirectivoGruposView from './DirectivoGruposView';
import DirectivoMateriasView from './DirectivoMateriasView';
import DirectivoRendimientoView from './DirectivoRendimientoView';
import DirectivoReportesView from './DirectivoReportesView';
import DirectivoImportacionIntegralView from './DirectivoImportacionIntegralView';
import DirectivoConfiguracionView from './DirectivoConfiguracionView';

export default function DirectivoPanel() {
  const { user, logout, updateUser } = useAuth();
  const { showToast } = useToast();

  const [currentView, setCurrentView] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Datos de la escuela y colores reactivos
  const [escuela, setEscuela] = useState(user?.escuela || null);
  const [alertasCount, setAlertasCount] = useState(0);

  const fetchEscuelaData = async () => {
    try {
      const res = await api.getDirectivoConfiguracion();
      if (res.success && res.escuela) {
        setEscuela(res.escuela);
        updateUser({ escuela: res.escuela });
      }
      const dash = await api.getDirectivoDashboard();
      if (dash.success && dash.stats) {
        setAlertasCount(dash.stats.alertasPendientes || 0);
      }
    } catch (err) {
      console.warn('Error al sincronizar datos directivo:', err);
    }
  };

  useEffect(() => {
    fetchEscuelaData();
  }, []);

  const handleEscuelaUpdated = (updatedEscuela) => {
    setEscuela(updatedEscuela);
    updateUser({ escuela: updatedEscuela });
  };

  const handleLogout = async () => {
    try {
      await logout();
      showToast('Sesión directiva finalizada con éxito.', 'info');
      setShowLogoutConfirm(false);
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  };

  return (
    <div className="min-h-screen bg-app-bg flex text-app-text">
      {/* Sidebar de Navegación del Directivo */}
      <DirectivoSidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        onLogout={() => setShowLogoutConfirm(true)}
        escuela={escuela}
        alertasCount={alertasCount}
      />

      {/* Área Principal */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Encabezado Superior con Identidad y Logotipo */}
        <DirectivoNavbar
          currentView={currentView}
          user={user}
          escuela={escuela}
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          onLogout={() => setShowLogoutConfirm(true)}
          onNavigate={(v) => setCurrentView(v)}
        />

        {/* Contenedor Principal de Cada Módulo */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          {currentView === 'dashboard' && (
            <DirectivoDashboardView
              onNavigate={(v) => setCurrentView(v)}
              escuela={escuela}
            />
          )}

          {currentView === 'alumnos' && <DirectivoAlumnosView escuela={escuela} />}

          {currentView === 'alertas' && <DirectivoAlertasView escuela={escuela} />}

          {currentView === 'docentes' && <DirectivoDocentesView escuela={escuela} />}

          {currentView === 'grupos' && <DirectivoGruposView escuela={escuela} />}

          {currentView === 'materias' && <DirectivoMateriasView escuela={escuela} />}

          {currentView === 'rendimiento' && <DirectivoRendimientoView escuela={escuela} />}

          {currentView === 'reportes' && <DirectivoReportesView escuela={escuela} />}

          {currentView === 'importacion' && (
            <DirectivoImportacionIntegralView escuela={escuela} />
          )}

          {currentView === 'configuracion' && (
            <DirectivoConfiguracionView
              escuela={escuela}
              onEscuelaUpdated={handleEscuelaUpdated}
            />
          )}
        </main>
      </div>

      {/* Modal de Confirmación para Cerrar Sesión */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Cerrar Sesión Institucional"
        message="¿Está seguro de que desea salir del Módulo del Directivo de SICARA?"
        confirmText="Cerrar Sesión"
        cancelText="Permanecer"
        isDanger={true}
      />
    </div>
  );
}

