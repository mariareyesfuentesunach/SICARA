import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import CsvImportSection from '../../components/directivo/CsvImportSection';
import EliminarModalDirectivo from '../../components/directivo/EliminarModalDirectivo';
import {
  BookOpen,
  PlusCircle,
  Search,
  RefreshCw,
  Edit2,
  Share2,
  Trash2,
  GraduationCap,
  Layers,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
  Filter,
} from 'lucide-react';

export default function DirectivoMateriasView({ escuela }) {
  const { showToast } = useToast();
  const [materias, setMaterias] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');

  // Selección de Grupo / Grado
  const [selectedGrupoId, setSelectedGrupoId] = useState('');
  const [selectedGradoTab, setSelectedGradoTab] = useState('todos'); // 'todos' | '1' | '2' | '3' | '4' | '5' | '6'
  const [collapsedGrados, setCollapsedGrados] = useState({});

  // Modales
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState('manual'); // 'manual' | 'csv'
  const [editingMateria, setEditingMateria] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Formulario Materia
  const [formData, setFormData] = useState({
    nombre_materia: '',
    descripcion: '',
    estado: 'Activo',
  });

  // Modal Asignar a Grupo y Docente
  const [showAsigModal, setShowAsigModal] = useState(false);
  const [asigData, setAsigData] = useState({
    id_materia: '',
    id_grupo: '',
    id_docente: '',
  });

  // Modal Eliminación Lógica
  const [materiaToDelete, setMateriaToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleConfirmDeleteMateria = async () => {
    if (!materiaToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await api.deleteDirectivoMateria(materiaToDelete.id_materia);
      if (res.success) {
        showToast(res.message, 'success');
        setShowDeleteModal(false);
        setMateriaToDelete(null);
        fetchData();
      } else {
        showToast(res.message || 'Error al eliminar materia.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error de comunicación al eliminar materia.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const primaryColor = escuela?.color_primario || '#722F37';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [matRes, docRes, grpRes] = await Promise.all([
        api.getDirectivoMaterias({ q: search, estado: filterEstado }),
        api.getDirectivoDocentes({ estado: 'Activo' }),
        api.getDirectivoGrupos({ estado: 'Activo' }),
      ]);

      if (matRes.success) setMaterias(matRes.materias || []);
      if (docRes.success) setDocentes(docRes.docentes || []);
      if (grpRes.success) setGrupos(grpRes.grupos || []);
    } catch (err) {
      console.error('Error al cargar catálogo:', err);
      showToast('Error al cargar materias y recursos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, filterEstado]);

  // Al seleccionar un grupo específico, sincronizamos automáticamente el grado correspondiente
  const handleGrupoChange = (e) => {
    const grpId = e.target.value;
    setSelectedGrupoId(grpId);
    if (grpId) {
      const grp = grupos.find((g) => g.id_grupo === grpId);
      if (grp && grp.grado) {
        const num = grp.grado.toString().replace(/º|°/g, '').trim();
        setSelectedGradoTab(num);
      }
    }
  };

  // Función para normalizar e inferir el grado de una materia
  const getGradosMateria = (m) => {
    const asignados = m.grupos_asignados || [];
    const directos = asignados
      .map((g) => (g.grado ? g.grado.toString().replace(/º|°/g, '').trim() : ''))
      .filter(Boolean);

    if (directos.length > 0) {
      return Array.from(new Set(directos)).sort();
    }

    // Heurística estándar para materias educativas por sufijo (I -> 1°, II -> 2°, etc.)
    const nom = (m.nombre_materia || '').trim().toUpperCase();
    if (/\bVI\b|6\b|6°|6º/.test(nom)) return ['6'];
    if (/\bV\b|5\b|5°|5º/.test(nom)) return ['5'];
    if (/\bIV\b|4\b|4°|4º/.test(nom)) return ['4'];
    if (/\bIII\b|3\b|3°|3º/.test(nom)) return ['3'];
    if (/\bII\b|2\b|2°|2º/.test(nom)) return ['2'];
    if (/\bI\b|1\b|1°|1º/.test(nom)) return ['1'];

    return ['General'];
  };

  // Filtrado reactivo de materias
  const filteredMaterias = useMemo(() => {
    return materias.filter((m) => {
      // Si se seleccionó un grupo específico
      if (selectedGrupoId) {
        const asignados = m.grupos_asignados || [];
        const isDirectamenteEnGrupo = asignados.some((g) => g.id_grupo === selectedGrupoId);
        if (isDirectamenteEnGrupo) return true;

        // O si pertenece al mismo grado de ese grupo
        const grupoObj = grupos.find((g) => g.id_grupo === selectedGrupoId);
        if (grupoObj && grupoObj.grado) {
          const numGrupo = grupoObj.grado.toString().replace(/º|°/g, '').trim();
          const gradosM = getGradosMateria(m);
          return gradosM.includes(numGrupo) || gradosM.includes('General');
        }
        return false;
      }

      // Si se filtró por pestaña de grado
      if (selectedGradoTab !== 'todos') {
        const gradosM = getGradosMateria(m);
        return gradosM.includes(selectedGradoTab);
      }

      return true;
    });
  }, [materias, selectedGrupoId, selectedGradoTab, grupos]);

  // Agrupación de materias por grado
  const materiasPorGrado = useMemo(() => {
    const ordenGrados = ['1', '2', '3', '4', '5', '6', 'General'];
    const gruposMap = {
      '1': { label: '1° Grado de Primaria', items: [] },
      '2': { label: '2° Grado de Primaria', items: [] },
      '3': { label: '3° Grado de Primaria', items: [] },
      '4': { label: '4° Grado de Primaria', items: [] },
      '5': { label: '5° Grado de Primaria', items: [] },
      '6': { label: '6° Grado de Primaria', items: [] },
      General: { label: 'Materias Transversales / Plan General', items: [] },
    };

    filteredMaterias.forEach((m) => {
      const gList = getGradosMateria(m);
      gList.forEach((gKey) => {
        if (gruposMap[gKey]) {
          gruposMap[gKey].items.push(m);
        } else {
          gruposMap['General'].items.push(m);
        }
      });
    });

    return ordenGrados
      .map((key) => ({
        key,
        label: gruposMap[key].label,
        items: gruposMap[key].items,
      }))
      .filter((seccion) => {
        if (selectedGradoTab !== 'todos') return seccion.key === selectedGradoTab;
        return seccion.items.length > 0;
      });
  }, [filteredMaterias, selectedGradoTab]);

  const toggleCollapseGrado = (key) => {
    setCollapsedGrados((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleOpenCreate = () => {
    setEditingMateria(null);
    setModalTab('manual');
    setFormData({
      nombre_materia: '',
      descripcion: '',
      estado: 'Activo',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (m) => {
    setEditingMateria(m);
    setModalTab('manual');
    setFormData({
      nombre_materia: m.nombre_materia || '',
      descripcion: m.descripcion || '',
      estado: m.estado || 'Activo',
    });
    setShowModal(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.nombre_materia.trim()) {
      showToast('El nombre de la materia es obligatorio.', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      if (editingMateria) {
        const res = await api.updateDirectivoMateria(editingMateria.id_materia, formData);
        if (res.success) {
          showToast('Materia actualizada con éxito.', 'success');
          setShowModal(false);
          fetchData();
        }
      } else {
        const res = await api.createDirectivoMateria(formData);
        if (res.success) {
          showToast('Materia agregada al catálogo.', 'success');
          setShowModal(false);
          fetchData();
        }
      }
    } catch (err) {
      showToast(err.message || 'Error al guardar materia.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenAsignar = (materia = null) => {
    setAsigData({
      id_materia: materia ? materia.id_materia : '',
      id_grupo: selectedGrupoId || '',
      id_docente: '',
    });
    setShowAsigModal(true);
  };

  const handleSaveAsignacion = async (e) => {
    e.preventDefault();
    if (!asigData.id_materia || !asigData.id_grupo || !asigData.id_docente) {
      showToast('Debe seleccionar la materia, el grupo y el docente.', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.createDirectivoAsignacion(asigData);
      if (res.success) {
        showToast('Asignación académica guardada correctamente.', 'success');
        setShowAsigModal(false);
        fetchData();
      }
    } catch (err) {
      showToast(err.message || 'Error al procesar asignación.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const grupoSeleccionadoObj = grupos.find((g) => g.id_grupo === selectedGrupoId);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabecera */}
      <div className="bg-white rounded-card p-5 border border-app-border shadow-soft flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-app-text flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-vino-primary" />
            Catálogo de Materias y Asignaciones
          </h2>
          <p className="text-xs text-app-muted">
            Plan curricular estructurado por grados escolares y asignación de materias por grupo
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAsignar(null)}
            className="px-3.5 py-2 rounded-subtle bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
          >
            <Share2 className="w-4 h-4" />
            <span>Asignar a Grupo</span>
          </button>
          <button
            onClick={handleOpenCreate}
            style={{ backgroundColor: primaryColor }}
            className="px-4 py-2 rounded-subtle text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer hover:opacity-90 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nueva Materia</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros, Selector de Grupo y Grado */}
      <div className="bg-white rounded-card p-4 border border-app-border shadow-soft space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Buscador de texto */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-app-muted absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar materia por nombre..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary"
            />
          </div>

          {/* Selector de Grupo */}
          <div className="flex items-center gap-1.5 min-w-[200px]">
            <Layers className="w-4 h-4 text-app-muted shrink-0" />
            <select
              value={selectedGrupoId}
              onChange={handleGrupoChange}
              className="w-full px-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-app-text font-medium"
            >
              <option value="">Todos los grupos (Catálogo)</option>
              {grupos.map((g) => (
                <option key={g.id_grupo} value={g.id_grupo}>
                  {g.nombre_grupo} ({g.grado}° - Ciclo {g.ciclo_escolar})
                </option>
              ))}
            </select>
          </div>

          {/* Estado de materia */}
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="px-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-app-text"
          >
            <option value="todos">Todos los estados</option>
            <option value="Activo">Activas</option>
            <option value="Inactivo">Inactivas</option>
          </select>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-subtle border border-app-border text-app-muted hover:text-vino-primary transition-colors cursor-pointer"
            title="Recargar catálogo"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Pestañas de Grados (1° a 6° + Todos) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-app-border/70 scrollbar-none">
          <span className="text-[11px] font-bold text-app-muted uppercase tracking-wider mr-1 flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5 text-vino-primary" />
            Grado:
          </span>
          {[
            { id: 'todos', label: 'Todos los Grados' },
            { id: '1', label: '1° Grado' },
            { id: '2', label: '2° Grado' },
            { id: '3', label: '3° Grado' },
            { id: '4', label: '4° Grado' },
            { id: '5', label: '5° Grado' },
            { id: '6', label: '6° Grado' },
          ].map((tab) => {
            const isActive = selectedGradoTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedGradoTab(tab.id);
                  if (tab.id !== 'todos' && selectedGrupoId) {
                    const grp = grupos.find((g) => g.id_grupo === selectedGrupoId);
                    if (grp && grp.grado?.replace(/º|°/g, '').trim() !== tab.id) {
                      setSelectedGrupoId('');
                    }
                  }
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-vino-primary text-white shadow-xs'
                    : 'bg-gray-100 hover:bg-gray-200 text-app-muted hover:text-app-text'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Indicador de Grupo seleccionado si aplica */}
      {grupoSeleccionadoObj && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-card px-4 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-700" />
            <span>
              Visualizando materias curriculares y asignadas para el <strong>{grupoSeleccionadoObj.nombre_grupo}</strong> (
              {grupoSeleccionadoObj.grado}° Grado).
            </span>
          </div>
          <button
            onClick={() => setSelectedGrupoId('')}
            className="text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
          >
            Quitar filtro de grupo
          </button>
        </div>
      )}

      {/* Lista de Materias Agrupadas por Grados */}
      <div className="space-y-5">
        {loading ? (
          <div className="bg-white rounded-card p-12 text-center text-app-muted border border-app-border shadow-soft">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-vino-primary" />
            Cargando materias del plan de estudios...
          </div>
        ) : materiasPorGrado.length === 0 ? (
          <div className="bg-white rounded-card p-12 text-center text-app-muted border border-app-border shadow-soft">
            No se encontraron materias para los filtros seleccionados.
          </div>
        ) : (
          materiasPorGrado.map((seccion) => {
            const isCollapsed = !!collapsedGrados[seccion.key];
            return (
              <div
                key={seccion.key}
                className="bg-white rounded-card border border-app-border shadow-soft overflow-hidden transition-all"
              >
                {/* Cabecera del Grado */}
                <div
                  onClick={() => toggleCollapseGrado(seccion.key)}
                  className="p-4 bg-gray-50/90 hover:bg-gray-100/70 cursor-pointer flex items-center justify-between border-b border-app-border select-none"
                >
                  <div className="flex items-center gap-2.5">
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-app-muted" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-app-muted" />
                    )}
                    <span className="w-7 h-7 rounded-full bg-vino-soft/50 text-vino-primary font-bold text-xs flex items-center justify-center">
                      {seccion.key !== 'General' ? `${seccion.key}°` : '★'}
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-app-text">{seccion.label}</h3>
                      <p className="text-[11px] text-app-muted">
                        {seccion.items.length} materia(s) en este grado
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold text-app-muted bg-white px-2.5 py-1 rounded-full border border-app-border">
                    {seccion.items.length} asignatura(s)
                  </span>
                </div>

                {/* Tabla de asignaturas del grado */}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-app-border bg-white text-app-muted font-bold uppercase tracking-wider text-[11px]">
                          <th className="py-2.5 px-4">Materia</th>
                          <th className="py-2.5 px-4">Descripción Curricular</th>
                          <th className="py-2.5 px-4">Grupos / Docentes</th>
                          <th className="py-2.5 px-4">Estado</th>
                          <th className="py-2.5 px-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-app-border/60">
                        {seccion.items.map((m) => {
                          const gruposAsignados = m.grupos_asignados || [];
                          return (
                            <tr key={`${seccion.key}-${m.id_materia}`} className="hover:bg-gray-50/70 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-bold text-app-text text-sm flex items-center gap-2">
                                  {m.nombre_materia}
                                </div>
                                <div className="text-[10px] text-app-muted">
                                  {m.id_escuela ? 'Materia propia del plantel' : 'Materia oficial del programa'}
                                </div>
                              </td>

                              <td className="py-3 px-4 text-app-muted max-w-xs truncate">
                                {m.descripcion || <span className="italic">Sin descripción</span>}
                              </td>

                              <td className="py-3 px-4">
                                {gruposAsignados.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 max-w-xs">
                                    {gruposAsignados.slice(0, 3).map((ga, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-800 border border-blue-200"
                                        title={ga.docente_nombre ? `Docente: ${ga.docente_nombre}` : 'Sin docente asignado'}
                                      >
                                        <Layers className="w-2.5 h-2.5 text-blue-600" />
                                        {ga.nombre_grupo} ({ga.grado}°)
                                      </span>
                                    ))}
                                    {gruposAsignados.length > 3 && (
                                      <span className="text-[10px] text-app-muted self-center">
                                        +{gruposAsignados.length - 3} más
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-app-muted italic">Sin grupos asignados</span>
                                )}
                              </td>

                              <td className="py-3 px-4">
                                <Badge status={m.estado || 'Activo'} />
                              </td>

                              <td className="py-3 px-4 text-right">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    onClick={() => handleOpenAsignar(m)}
                                    className="px-2 py-1 rounded-subtle bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-bold cursor-pointer transition-colors"
                                    title="Asignar a un grupo"
                                  >
                                    Asignar
                                  </button>
                                  <button
                                    onClick={() => handleOpenEdit(m)}
                                    className="p-1.5 rounded-subtle hover:bg-gray-100 text-app-muted hover:text-vino-primary transition-colors cursor-pointer"
                                    title="Editar materia"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setMateriaToDelete(m);
                                      setShowDeleteModal(true);
                                    }}
                                    className="p-1.5 rounded-subtle hover:bg-rose-50 text-app-muted hover:text-rose-600 transition-colors cursor-pointer"
                                    title="Eliminar materia del sistema"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Registrar / Editar Materia */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingMateria ? 'Editar Materia' : 'Registrar / Importar Materias'}
        subtitle={
          editingMateria
            ? 'Actualice la información de la materia en el catálogo institucional'
            : 'Registre una materia manualmente o importe un archivo CSV (Excel)'
        }
        maxWidth={modalTab === 'csv' ? 'max-w-2xl' : 'max-w-md'}
        footer={
          modalTab === 'manual' ? (
            <>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-subtle bg-gray-100 hover:bg-gray-200 text-app-text font-semibold text-xs cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="form-materia"
                disabled={actionLoading}
                style={{ backgroundColor: primaryColor }}
                className="px-4 py-2 rounded-subtle text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'Guardando...' : 'Guardar Materia'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-subtle bg-gray-100 hover:bg-gray-200 text-app-text font-semibold text-xs cursor-pointer"
            >
              Cerrar
            </button>
          )
        }
      >
        {/* Selector de pestañas si no se está editando */}
        {!editingMateria && (
          <div className="flex border-b border-app-border mb-4">
            <button
              type="button"
              onClick={() => setModalTab('manual')}
              className={`flex-1 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                modalTab === 'manual'
                  ? 'border-vino-primary text-vino-primary bg-vino-soft/30'
                  : 'border-transparent text-app-muted hover:text-app-text'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Registro Individual</span>
            </button>
            <button
              type="button"
              onClick={() => setModalTab('csv')}
              className={`flex-1 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                modalTab === 'csv'
                  ? 'border-vino-primary text-vino-primary bg-vino-soft/30'
                  : 'border-transparent text-app-muted hover:text-app-text'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Importar CSV (Excel)</span>
            </button>
          </div>
        )}

        {modalTab === 'manual' ? (
          <form id="form-materia" onSubmit={handleSubmitForm} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Nombre de la Materia <span className="text-status-error">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.nombre_materia}
                onChange={(e) => setFormData({ ...formData, nombre_materia: e.target.value })}
                placeholder="Ej. Español I, Matemáticas II, Ciencias"
                className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Descripción o Enfoque Curricular
              </label>
              <textarea
                rows={3}
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Breve descripción del programa..."
                className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Estado
              </label>
              <select
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-xs"
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </form>
        ) : (
          <CsvImportSection
            title="Importar Materias"
            templateFilename="plantilla_materias_sicara.csv"
            templateHeaders={['nombre_materia', 'descripcion', 'estado']}
            sampleRows={[
              ['Español I', 'Desarrollo de habilidades de lectura y escritura', 'Activo'],
              ['Matemáticas I', 'Pensamiento matemático y resolución de problemas', 'Activo'],
              ['Ciencias Naturales I', 'Conocimiento del medio ambiente y ciencias', 'Activo'],
              ['Geografía', 'Identidad comunitaria y contexto geográfico', 'Activo'],
            ]}
            columnGuide={[
              { name: 'nombre_materia', required: true },
              { name: 'descripcion', required: false },
              { name: 'estado', required: false },
            ]}
            onImportBatch={api.importarMateriasBatch}
            onSuccess={() => fetchData()}
            primaryColor={primaryColor}
          />
        )}
      </Modal>

      {/* MODAL: Asignar Materia y Docente a Grupo */}
      <Modal
        isOpen={showAsigModal}
        onClose={() => setShowAsigModal(false)}
        title="Asignación Curricular a Grupo"
        subtitle="Vincule una materia con el docente que la impartirá en un grupo escolar"
        maxWidth="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAsigModal(false)}
              className="px-4 py-2 rounded-subtle bg-gray-100 hover:bg-gray-200 text-app-text font-semibold text-xs cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-asignacion"
              disabled={actionLoading}
              style={{ backgroundColor: primaryColor }}
              className="px-4 py-2 rounded-subtle text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {actionLoading ? 'Asignando...' : 'Guardar Asignación'}
            </button>
          </>
        }
      >
        <form id="form-asignacion" onSubmit={handleSaveAsignacion} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
              Materia <span className="text-status-error">*</span>
            </label>
            <select
              required
              value={asigData.id_materia}
              onChange={(e) => setAsigData({ ...asigData, id_materia: e.target.value })}
              className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-xs"
            >
              <option value="">Seleccione una materia...</option>
              {materias.map((m) => (
                <option key={m.id_materia} value={m.id_materia}>
                  {m.nombre_materia}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
              Grupo Escolar <span className="text-status-error">*</span>
            </label>
            <select
              required
              value={asigData.id_grupo}
              onChange={(e) => setAsigData({ ...asigData, id_grupo: e.target.value })}
              className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-xs"
            >
              <option value="">Seleccione el grupo receptor...</option>
              {grupos.map((g) => (
                <option key={g.id_grupo} value={g.id_grupo}>
                  {g.nombre_grupo} ({g.grado}° - Ciclo {g.ciclo_escolar})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
              Docente Responsable <span className="text-status-error">*</span>
            </label>
            <select
              required
              value={asigData.id_docente}
              onChange={(e) => setAsigData({ ...asigData, id_docente: e.target.value })}
              className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-xs"
            >
              <option value="">Seleccione al docente...</option>
              {docentes.map((d) => (
                <option key={d.id_docente} value={d.id_docente}>
                  {d.nombre} {d.apellidos} ({d.especialidad || 'Docente'})
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      {/* Modal de Eliminación Lógica con Advertencia de Dependencias */}
      <EliminarModalDirectivo
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setMateriaToDelete(null);
        }}
        onConfirm={handleConfirmDeleteMateria}
        tipo="materia"
        id={materiaToDelete?.id_materia}
        nombre={materiaToDelete?.nombre_materia}
        isLoading={deleteLoading}
      />
    </div>
  );
}
