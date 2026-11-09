import React, { useState } from 'react';
import {
  GraduationCap,
  CalendarCheck,
  TrendingUp,
  AlertTriangle,
  School,
  ArrowRight,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';

export default function LandingPageView({ onGoToLogin, onOpenSolicitud }) {
  return (
    <div className="min-h-screen bg-[#F8F5F5] text-[#292329] font-sans selection:bg-[#722F37] selection:text-white antialiased flex flex-col justify-between">
      {/* =========================================================================
          SECCIÓN 1: BARRA DE NAVEGACIÓN SUPERIOR (Píldora blanca flotante)
         ========================================================================= */}
      <header className="sticky top-4 z-40 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="bg-[#FFFFFF] text-[#292329] rounded-full px-5 py-3 shadow-card border border-[#E8E2E4] flex items-center justify-between transition-all">
          {/* Logotipo / Marca */}
          <div className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#4A1722] via-[#722F37] to-[#A64D5A] text-white flex items-center justify-center shadow-soft">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black tracking-tight text-[#4A1722]">SICARA</span>
              <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-[#722F37]" />
              <span className="hidden md:inline-block text-[11px] font-bold text-[#685D68] uppercase tracking-wider">
                Escuelas Rurales
              </span>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onGoToLogin}
              className="px-3 sm:px-4 py-2 rounded-full text-xs font-bold text-[#292329] hover:text-[#722F37] hover:bg-[#FBF0F2] transition-colors cursor-pointer"
            >
              Iniciar sesión
            </button>
            <button
              onClick={onOpenSolicitud}
              className="px-4 sm:px-5 py-2 rounded-full bg-[#722F37] hover:bg-[#4A1722] text-white text-xs font-bold shadow-sm transition-all transform active:scale-95 cursor-pointer"
            >
              Solicitar registro
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          SECCIÓN 2: PORTADA PRINCIPAL (HERO) - Bloque en Vino Oscuro (#4A1722)
         ========================================================================= */}
      <main className="flex-1 flex items-center py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="w-full bg-[#4A1722] text-white rounded-[32px] p-6 sm:p-10 lg:p-12 shadow-elevated border border-[#722F37]/30 relative overflow-hidden">
          {/* Acento decorativo sutil */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#722F37]/35 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
            {/* Lado Izquierdo: Contenido Textual */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#722F37]/40 border border-[#A64D5A]/40 text-[#FBF0F2] text-xs font-semibold backdrop-blur-xs">
                <span className="w-2 h-2 rounded-full bg-[#A64D5A] animate-pulse" />
                <span>Plataforma Oficial para Comunidades Escolares</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15] text-white">
                Mejores decisiones educativas, con información clara y oportuna.
              </h1>

              <p className="text-sm sm:text-base text-gray-200 leading-relaxed font-normal max-w-2xl">
                SICARA es un sistema de control de asistencia y rendimiento académico diseñado para facilitar la gestión de la información escolar, permitiendo registrar la asistencia, dar seguimiento a las calificaciones e identificar situaciones de riesgo académico.
              </p>

              {/* Botones principales */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <button
                  onClick={onGoToLogin}
                  className="px-6 py-3 rounded-full bg-[#722F37] hover:bg-[#5D252C] text-white text-xs sm:text-sm font-bold shadow-elevated transition-all transform active:scale-95 cursor-pointer flex items-center gap-2 border border-white/20"
                >
                  <span>Conocer el sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={onOpenSolicitud}
                  className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/30 text-xs sm:text-sm font-bold backdrop-blur-xs transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>Solicitar registro</span>
                  <ArrowUpRight className="w-4 h-4 text-[#A64D5A]" />
                </button>
              </div>

              {/* Tres características con iconos en fila */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-white/15">
                <div className="flex items-center gap-2.5 p-2.5 rounded-card bg-[#FFFFFF]/10 border border-white/15 backdrop-blur-xs">
                  <div className="p-2 rounded-lg bg-[#722F37] text-white">
                    <CalendarCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Control de asistencia</p>
                    <p className="text-[10px] text-gray-200">Puntual y organizado</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-card bg-[#FFFFFF]/10 border border-white/15 backdrop-blur-xs">
                  <div className="p-2 rounded-lg bg-[#722F37] text-white">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Seguimiento académico</p>
                    <p className="text-[10px] text-gray-200">Evaluación continua</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-card bg-[#FFFFFF]/10 border border-white/15 backdrop-blur-xs">
                  <div className="p-2 rounded-lg bg-[#722F37] text-white">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Alertas de riesgo</p>
                    <p className="text-[10px] text-gray-200">Atención preventiva</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lado Derecho: Tarjeta Visual Institucional */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden border border-white/20 bg-gradient-to-b from-[#722F37]/80 to-[#4A1722] shadow-2xl p-6 sm:p-7">
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between pb-3 border-b border-white/15">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span className="text-[11px] font-mono text-gray-200 ml-2">portal-escolar.sicara.gob.mx</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                      En Línea
                    </span>
                  </div>

                  {/* Tarjeta de muestra: Docente y Escuela */}
                  <div className="p-4 rounded-2xl bg-[#FFFFFF] text-[#292329] shadow-soft flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#722F37] flex items-center justify-center text-white font-bold text-base shadow-soft shrink-0">
                      <School className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#292329] truncate">Primaria Rural Benito Juárez</p>
                      <p className="text-[10px] text-[#685D68]">CCT: 14DPR0842K • Jalisco</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sistema Activo
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Métricas destacadas en miniatura */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-[#FFFFFF] text-[#292329] shadow-soft">
                      <span className="text-[10px] text-[#685D68] block font-semibold">Asistencia Media</span>
                      <span className="text-xl font-bold font-mono text-[#722F37] mt-0.5 block">94.8%</span>
                      <span className="text-[9px] text-emerald-700 font-semibold">Regularidad escolar</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#FFFFFF] text-[#292329] shadow-soft">
                      <span className="text-[10px] text-[#685D68] block font-semibold">Promedio General</span>
                      <span className="text-xl font-bold font-mono text-[#4A1722] mt-0.5 block">8.6</span>
                      <span className="text-[9px] text-[#A64D5A] font-semibold">Ciclo 2024-2025</span>
                    </div>
                  </div>

                  {/* Alerta simulada preventiva */}
                  <div className="p-3 rounded-xl bg-[#FFFFFF] text-[#292329] border-l-4 border-[#A64D5A] shadow-soft flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-[#A64D5A] shrink-0 mt-0.5" />
                    <div className="text-[11px]">
                      <span className="font-bold text-[#4A1722] block">Monitoreo Preventivo de Alumnos</span>
                      <span className="text-[#685D68] text-[10px]">
                        Identificación temprana ante inasistencias para brindar apoyo oportuno.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* =========================================================================
          SECCIÓN 3: PIE DE PÁGINA (Footer blanco #FFFFFF)
         ========================================================================= */}
      <footer className="bg-[#FFFFFF] text-[#292329] border-t border-[#E8E2E4] py-8 px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Marca y Resumen */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#722F37] text-white flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-black text-[#4A1722] tracking-tight">SICARA</span>
              <p className="text-[11px] text-[#685D68]">
                Sistema de Control de Asistencia y Rendimiento Académico para Escuelas Rurales
              </p>
            </div>
          </div>

          {/* Accesos rápidos y Copyright */}
          <div className="flex items-center gap-4 text-xs font-semibold">
            <button
              onClick={onGoToLogin}
              className="text-[#292329] hover:text-[#722F37] transition-colors cursor-pointer"
            >
              Iniciar sesión
            </button>
            <span className="text-gray-300">•</span>
            <button
              onClick={onOpenSolicitud}
              className="text-[#722F37] hover:text-[#4A1722] font-bold transition-colors cursor-pointer"
            >
              Solicitar registro
            </button>
            <span className="text-gray-300">•</span>
            <span className="text-[#685D68] text-[11px]">
              © {new Date().getFullYear()} SICARA
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
