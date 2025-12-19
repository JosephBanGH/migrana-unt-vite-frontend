import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Plus, Brain, TrendingUp, Activity, AlertCircle, Users, Calendar } from 'lucide-react';

// ========================================
// CONFIGURACIÓN DE API
// ========================================
const API_URL = import.meta.env.VITE_API_URL ;

const AppDB = () => {
  const [currentView, setCurrentView] = useState('patients');
  const [patients, setPatients] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [showAIConsult, setShowAIConsult] = useState(false);
  const [aiResponses, setAiResponses] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [treatments, setTreatments] = useState([]);

  // ========================================
  // FUNCIONES DE API
  // ========================================

  console.log('API_URL configurado:', API_URL);

  const apiRequest = async (endpoint, options = {}) => {
    console.log('🔄 Haciendo request a:', `${API_URL}${endpoint}`);
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', response.headers.get('content-type'));
      

      // Verificar si la respuesta es HTML (error del servidor)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('El backend no está respondiendo. Verifica que esté corriendo en ' + API_URL);
      }

      if (!response.ok) {
        let errorMessage = 'Error en la petición';
        try {
          const error = await response.json();
          errorMessage = error.error || error.message || errorMessage;
        } catch (e) {
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  };

  // Cargar pacientes
  const fetchPatients = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/pacientes');
      setPatients(data);
    } catch (err) {
      setError(err.message);
      loadSamplePatients();
    } finally {
      setLoading(false);
    }
  };

  // Cargar sesiones de un paciente
  const fetchPatientSessions = async (patientId) => {
    setLoading(true);
    try {
      const data = await apiRequest(`/sesiones/paciente/${patientId}`);
      setSessions(data);
    } catch (err) {
      setError(err.message);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  // Cargar tratamientos disponibles
  const fetchTreatments = async () => {
    try {
      const data = await apiRequest('/tratamientos');
      setTreatments(data);
    } catch (err) {
      console.error('Error loading treatments:', err);
    }
  };

  // Guardar sesión
  const saveSession = async (sessionData) => {
    setLoading(true);
    try {
      const endpoint = sessionData.id ? `/sesiones/${sessionData.id}` : '/sesiones';
      const method = sessionData.id ? 'PUT' : 'POST';
      
      const savedSession = await apiRequest(endpoint, {
        method,
        body: JSON.stringify(sessionData)
      });

      await fetchPatientSessions(selectedPatient.id);
      return savedSession;
    } catch (err) {
      setError('No se pudo guardar la sesión: ' + err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Consultar IAs
  const consultAI = async (sessionData) => {
    setLoadingAI(true);
    try {
      const response = await apiRequest('/ia/consultar', {
        method: 'POST',
        body: JSON.stringify(sessionData)
      });
      return response;
    } catch (err) {
      console.error('Error consulting AI:', err);
      throw err;
    } finally {
      setLoadingAI(false);
    }
  };

  // Datos de ejemplo (fallback)
  const loadSamplePatients = () => {
    setPatients([
      {
        id: 1,
        codigo_paciente: 'P001',
        nombre_completo: 'María González',
        genero: 'Femenino',
        fecha_nacimiento: '1985-05-15',
        correo_electronico: 'maria@example.com',
        telefono: '999888777'
      },
      {
        id: 2,
        codigo_paciente: 'P002',
        nombre_completo: 'Juan Pérez',
        genero: 'Masculino',
        fecha_nacimiento: '1990-08-22',
        correo_electronico: 'juan@example.com',
        telefono: '999777666'
      }
    ]);
  };

  useEffect(() => {
    fetchPatients();
    fetchTreatments();
  }, []);

  // ========================================
  // HANDLERS
  // ========================================

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setCurrentView('sessions');
    fetchPatientSessions(patient.id);
  };

  const handleNewSession = () => {
    if (!selectedPatient) {
      setError('Debes seleccionar un paciente primero');
      return;
    }

    setCurrentSession({
      paciente_id: selectedPatient.id,
      fecha_sesion: new Date().toISOString().split('T')[0],
      tipo_sesion: 'Seguimiento',
      sintomas: {
        dolor_cabeza: '',
        nauseas: false,
        fotofobia: false,
        fonofobia: false
      },
      desencadenantes: {
        estres: false,
        falta_sueno: false,
        alimentos: []
      },
      medicacion_actual: {
        medicamentos: []
      },
      tipo_migrana: '',
      aura_presente: false,
      condicion_cronica: false,
      diagnostico_final: '',
      kpis: {
        intensidad_dolor: 5,
        frecuencia_episodios: 0,
        duracion_horas: 0,
        nivel_discapacidad: 'Moderado',
        puntaje_calidad_vida: 5,
        dias_trabajo_perdidos: 0,
        calidad_sueno: 3
      },
      tratamientos_prescritos: []
    });
    setShowAIConsult(false);
    setAiResponses(null);
  };

  const handleSaveSession = async () => {
    if (!currentSession) return;

    try {
      await saveSession(currentSession);
      setCurrentSession(null);
      setShowAIConsult(false);
      setAiResponses(null);
      setError(null);
    } catch (err) {
      // Error ya manejado en saveSession
    }
  };

  const handleAIConsult = async () => {
    if (!currentSession) return;

    setShowAIConsult(true);
    setLoadingAI(true);
    setError(null);

    try {
      const response = await consultAI({
        sintomas: currentSession.sintomas,
        desencadenantes: currentSession.desencadenantes,
        medicacion_actual: currentSession.medicacion_actual,
        kpis: currentSession.kpis,
        tipo_migrana: currentSession.tipo_migrana
      });

      setAiResponses({
        deepseek: {
          name: 'DeepSeek (Análisis Clínico)',
          diagnostico: response.ia1?.diagnostico || 'No disponible',
          tratamiento: response.ia1?.tratamiento || 'No disponible',
          confianza: response.ia1?.confianza || 0
        },
        copilot: {
          name: 'Copilot (Análisis Predictivo)',
          diagnostico: response.ia2?.diagnostico || 'No disponible',
          tratamiento: response.ia2?.tratamiento || 'No disponible',
          confianza: response.ia2?.confianza || 0
        }
      });

      // Actualizar sesión con respuestas de IA
      setCurrentSession({
        ...currentSession,
        diagnostico_ia_1: response.ia1?.diagnostico,
        tratamiento_ia_1: response.ia1?.tratamiento,
        confianza_ia_1: response.ia1?.confianza,
        diagnostico_ia_2: response.ia2?.diagnostico,
        tratamiento_ia_2: response.ia2?.tratamiento,
        confianza_ia_2: response.ia2?.confianza
      });

    } catch (err) {
      setError('Error al consultar IAs: ' + err.message);
      // Datos de respaldo
      setAiResponses({
        deepseek: {
          name: 'DeepSeek (Análisis Clínico)',
          diagnostico: 'Migraña episódica basada en síntomas presentados',
          tratamiento: 'Considerar tratamiento preventivo si frecuencia >4/mes',
          confianza: 0.85
        },
        copilot: {
          name: 'Copilot (Análisis Predictivo)',
          diagnostico: 'Patrón de migraña con tendencia moderada',
          tratamiento: 'Manejo de desencadenantes y terapia farmacológica',
          confianza: 0.78
        }
      });
    }
  };

  const handleAddTreatment = (treatmentId) => {
    const treatment = treatments.find(t => t.id === parseInt(treatmentId));
    if (!treatment) return;

    const newTreatment = {
      tratamiento_id: treatment.id,
      nombre_tratamiento: treatment.nombre_tratamiento,
      dosis_prescrita: treatment.dosis_comun || '',
      frecuencia_prescrita: 'Según indicación',
      duracion_dias: 30,
      es_tratamiento_final: false
    };

    setCurrentSession({
      ...currentSession,
      tratamientos_prescritos: [...(currentSession.tratamientos_prescritos || []), newTreatment]
    });
  };

  const handleRemoveTreatment = (index) => {
    const updated = [...currentSession.tratamientos_prescritos];
    updated.splice(index, 1);
    setCurrentSession({
      ...currentSession,
      tratamientos_prescritos: updated
    });
  };

  const handleSetFinalTreatment = (index) => {
    const updated = currentSession.tratamientos_prescritos.map((t, i) => ({
      ...t,
      es_tratamiento_final: i === index
    }));
    setCurrentSession({
      ...currentSession,
      tratamientos_prescritos: updated
    });
  };

  // ========================================
  // FUNCIONES PARA ANÁLISIS
  // ========================================

  const getKPIEvolution = () => {
    return sessions.map((s, idx) => ({
      session: `S${idx + 1}`,
      fecha: s.fecha_sesion,
      intensidad: s.kpis?.intensidad_dolor || 0,
      frecuencia: s.kpis?.frecuencia_episodios || 0,
      duracion: s.kpis?.duracion_horas || 0,
      calidad_vida: s.kpis?.puntaje_calidad_vida || 0
    }));
  };

  const getDiagnosisDistribution = () => {
    const counts = sessions.reduce((acc, s) => {
      const tipo = s.tipo_migrana || 'Sin especificar';
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {});

    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
    return Object.entries(counts).map(([name, value], idx) => ({
      name,
      value,
      color: colors[idx % colors.length]
    }));
  };

  const getAIConfidenceComparison = () => {
    const withAI = sessions.filter(s => s.confianza_ia_1 && s.confianza_ia_2);
    return withAI.map((s, idx) => ({
      session: `S${idx + 1}`,
      'IA-1': (s.confianza_ia_1 * 100).toFixed(0),
      'IA-2': (s.confianza_ia_2 * 100).toFixed(0)
    }));
  };

  // ========================================
  // VISTAS
  // ========================================

  // Vista de Pacientes
  const PatientsView = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Pacientes</h2>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={20} />
          Nuevo Paciente
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Cargando pacientes...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map((patient) => (
            <div
              key={patient.id}
              onClick={() => handleSelectPatient(patient)}
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg text-gray-800">{patient.nombre_completo}</h3>
                  <p className="text-sm text-gray-500">{patient.codigo_paciente}</p>
                </div>
                <Users className="text-blue-600" size={24} />
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <p><strong>Género:</strong> {patient.genero}</p>
                <p><strong>Edad:</strong> {new Date().getFullYear() - new Date(patient.fecha_nacimiento).getFullYear()} años</p>
                <p><strong>Email:</strong> {patient.correo_electronico}</p>
                <p><strong>Teléfono:</strong> {patient.telefono}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Vista de Sesiones
  const SessionsView = () => (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <div>
            <h4 className="font-semibold text-red-800">Error</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-blue-900">{selectedPatient?.nombre_completo}</h3>
            <p className="text-sm text-blue-700">{selectedPatient?.codigo_paciente}</p>
          </div>
          <button
            onClick={() => {
              setSelectedPatient(null);
              setCurrentView('patients');
              setSessions([]);
            }}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Volver a pacientes
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Sesiones de Seguimiento</h2>
        <button
          onClick={handleNewSession}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Plus size={20} />
          Nueva Sesión
        </button>
      </div>

      {currentSession ? (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Registro de Sesión</h3>
          
          <div className="space-y-4">
            {/* Información básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Sesión</label>
                <input
                  type="date"
                  value={currentSession.fecha_sesion}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCurrentSession({...currentSession, fecha_sesion: e.target.value})}
                  }className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Sesión</label>
                <select
                  value={currentSession.tipo_sesion}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCurrentSession({...currentSession, tipo_sesion: e.target.value})}
                  }className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="Inicial">Inicial</option>
                  <option value="Seguimiento">Seguimiento</option>
                  <option value="Urgencia">Urgencia</option>
                </select>
              </div>
            </div>

            {/* KPIs */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-3">KPIs Clínicos</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Intensidad del Dolor (1-10)</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={currentSession.kpis.intensidad_dolor}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCurrentSession({
                      ...currentSession,
                      kpis: {...currentSession.kpis, intensidad_dolor: parseInt(e.target.value)}
                    })}}
                    className="w-full"
                  />
                  <div className="text-center text-2xl font-bold text-blue-600">
                    {currentSession.kpis.intensidad_dolor}/10
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia (episodios/mes)</label>
                  <input
                    type="number"
                    min="0"
                    max="31"
                    value={currentSession.kpis.frecuencia_episodios}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCurrentSession({
                      ...currentSession,
                      kpis: {...currentSession.kpis, frecuencia_episodios: parseInt(e.target.value) || 0}
                    })}}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duración (horas)</label>
                  <input
                    type="number"
                    min="0"
                    value={currentSession.kpis.duracion_horas}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCurrentSession({
                      ...currentSession,
                      kpis: {...currentSession.kpis, duracion_horas: parseInt(e.target.value) || 0}
                    })}}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nivel de Discapacidad</label>
                  <select
                    value={currentSession.kpis.nivel_discapacidad}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCurrentSession({
                      ...currentSession,
                      kpis: {...currentSession.kpis, nivel_discapacidad: e.target.value}
                    })}}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="Leve">Leve</option>
                    <option value="Moderado">Moderado</option>
                    <option value="Severo">Severo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Calidad de Vida (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={currentSession.kpis.puntaje_calidad_vida}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCurrentSession({
                      ...currentSession,
                      kpis: {...currentSession.kpis, puntaje_calidad_vida: parseInt(e.target.value) || 5}
                    })}}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Días de Trabajo Perdidos</label>
                  <input
                    type="number"
                    min="0"
                    value={currentSession.kpis.dias_trabajo_perdidos}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCurrentSession({
                      ...currentSession,
                      kpis: {...currentSession.kpis, dias_trabajo_perdidos: parseInt(e.target.value) || 0}
                    })}}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* Diagnóstico */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Migraña</label>
              <input
                type="text"
                value={currentSession.tipo_migrana}
                onChange={(e) => {
                  const value = e.target.value;
                  setCurrentSession({...currentSession, tipo_migrana: e.target.value})}
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Ej: Migraña episódica sin aura"
              />
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={currentSession.aura_presente}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCurrentSession({...currentSession, aura_presente: e.target.checked})}
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Aura Presente</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={currentSession.condicion_cronica}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCurrentSession({...currentSession, condicion_cronica: e.target.checked})}
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Condición Crónica</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Diagnóstico Final del Médico</label>
              <textarea
                value={currentSession.diagnostico_final}
                onChange={(e) => {
                  const value = e.target.value;
                  setCurrentSession({...currentSession, diagnostico_final: e.target.value})}
                }className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows="3"
                placeholder="Diagnóstico y observaciones del médico..."
              />
            </div>

            {/* Tratamientos */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-3">Tratamientos Prescritos</h4>
              
              <div className="mb-3">
                <select
                  onChange={(e) => {const value = e.target.value;
                    if (e.target.value) handleAddTreatment(e.target.value);
                    e.target.value = '';
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">+ Agregar tratamiento</option>
                  {treatments.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nombre_tratamiento} ({t.tipo_tratamiento})
                    </option>
                  ))}
                </select>
              </div>

              {currentSession.tratamientos_prescritos?.length > 0 && (
                <div className="space-y-2">
                  {currentSession.tratamientos_prescritos.map((t, idx) => (
                    <div key={idx} className="bg-white p-3 rounded border flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{t.nombre_tratamiento}</div>
                        <div className="text-sm text-gray-600">
                          Dosis: {t.dosis_prescrita} | Frecuencia: {t.frecuencia_prescrita}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSetFinalTreatment(idx)}
                          className={`px-3 py-1 rounded text-sm ${
                            t.es_tratamiento_final
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {t.es_tratamiento_final ? '✓ Final' : 'Marcar como final'}
                        </button>
                        <button
                          onClick={() => handleRemoveTreatment(idx)}
                          className="px-3 py-1 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleAIConsult}
                disabled={loadingAI || loading}
                className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <Brain size={20} />
                Consultar IA
              </button>

              <button
                onClick={handleSaveSession}
                disabled={loading}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Guardar Sesión'}
              </button>

              <button
                onClick={() => {
                  setCurrentSession(null);
                  setShowAIConsult(false);
                  setAiResponses(null);
                }}
                className="bg-gray-400 text-white px-6 py-3 rounded-lg hover:bg-gray-500 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>

          {/* Respuestas de IA */}
          {showAIConsult && (
            <div className="mt-6 space-y-4">
              <h4 className="text-lg font-semibold text-gray-800">Consulta a Inteligencia Artificial</h4>
              
              {loadingAI ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                  <span className="ml-3 text-gray-600">Consultando a las IAs...</span>
                </div>
              ) : aiResponses && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(aiResponses).map(([key, ai]) => (
                    <div key={key} className="bg-gradient-to-br from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
                      <h5 className="font-semibold text-purple-900 mb-2">{ai.name}</h5>
                      <div className="space-y-2 text-sm">
                        <div>
                          <strong className="text-gray-700">Diagnóstico:</strong>
                          <p className="text-gray-600 mt-1">{ai.diagnostico}</p>
                        </div>
                        <div>
                          <strong className="text-gray-700">Tratamiento:</strong>
                          <p className="text-gray-600 mt-1">{ai.tratamiento}</p>
                        </div>
                        <div>
                          <strong className="text-gray-700">Confianza:</strong>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-purple-600 h-2 rounded-full"
                                style={{ width: `${ai.confianza * 100}%` }}
                              />
                            </div>
                            <span className="text-purple-700 font-medium">
                              {(ai.confianza * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Cargando sesiones...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-gray-50 p-8 rounded-lg text-center">
              <Calendar className="mx-auto text-gray-400 mb-3" size={48} />
              <p className="text-gray-600">No hay sesiones registradas para este paciente</p>
              <button
                onClick={handleNewSession}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Crear primera sesión
              </button>
            </div>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {session.tipo_sesion}
                      </span>
                      <span className="text-sm text-gray-500">{session.fecha_sesion}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 mb-2">{session.tipo_migrana}</p>
                    <p className="text-sm text-gray-600 mb-3">{session.diagnostico_final}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Intensidad:</span> {session.kpis?.intensidad_dolor || 0}/10
                      </div>
                      <div>
                        <span className="font-medium">Frecuencia:</span> {session.kpis?.frecuencia_episodios || 0}/mes
                      </div>
                      <div>
                        <span className="font-medium">Duración:</span> {session.kpis?.duracion_horas || 0}h
                      </div>
                      <div>
                        <span className="font-medium">Discapacidad:</span> {session.kpis?.nivel_discapacidad || 'N/A'}
                      </div>
                    </div>
                    {session.confianza_ia_1 && session.confianza_ia_2 && (
                      <div className="mt-3 pt-3 border-t flex gap-4 text-xs text-gray-500">
                        <span>IA-1: {(session.confianza_ia_1 * 100).toFixed(0)}%</span>
                        <span>IA-2: {(session.confianza_ia_2 * 100).toFixed(0)}%</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {session.aura_presente && (
                      <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded">Aura</span>
                    )}
                    {session.condicion_cronica && (
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">Crónica</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  // Vista de Análisis
  const AnalyticsView = () => {
    if (!selectedPatient) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <AlertCircle className="mx-auto text-yellow-600 mb-3" size={48} />
          <p className="text-yellow-800">Selecciona un paciente para ver análisis</p>
          <button
            onClick={() => setCurrentView('patients')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Ver pacientes
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Panel de Análisis</h2>
            <p className="text-gray-600">{selectedPatient.nombre_completo}</p>
          </div>
          <button
            onClick={() => setCurrentView('sessions')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Volver a sesiones
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Total Sesiones</div>
            <div className="text-2xl font-bold text-blue-600">{sessions.length}</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Intensidad Promedio</div>
            <div className="text-2xl font-bold text-red-600">
              {sessions.length > 0
                ? (sessions.reduce((acc, s) => acc + (s.kpis?.intensidad_dolor || 0), 0) / sessions.length).toFixed(1)
                : 0}/10
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Calidad de Vida</div>
            <div className="text-2xl font-bold text-green-600">
              {sessions.length > 0
                ? (sessions.reduce((acc, s) => acc + (s.kpis?.puntaje_calidad_vida || 0), 0) / sessions.length).toFixed(1)
                : 0}/10
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Con Análisis IA</div>
            <div className="text-2xl font-bold text-purple-600">
              {sessions.filter(s => s.confianza_ia_1).length}
            </div>
          </div>
        </div>

        {sessions.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Evolución de KPIs</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={getKPIEvolution()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="session" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="intensidad" stroke="#ef4444" strokeWidth={2} name="Intensidad" />
                  <Line type="monotone" dataKey="frecuencia" stroke="#3b82f6" strokeWidth={2} name="Frecuencia" />
                  <Line type="monotone" dataKey="calidad_vida" stroke="#10b981" strokeWidth={2} name="Calidad Vida" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Tipos de Migraña</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={getDiagnosisDistribution()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({name, value}) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getDiagnosisDistribution().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {getAIConfidenceComparison().length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-lg lg:col-span-2">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Comparación de Confianza IA</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={getAIConfidenceComparison()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="session" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="IA-1" fill="#3b82f6" name="DeepSeek" />
                    <Bar dataKey="IA-2" fill="#8b5cf6" name="Copilot" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 p-8 rounded-lg text-center">
            <p className="text-gray-600">No hay suficientes datos para mostrar análisis</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Activity className="text-blue-600" size={32} />
              <h1 className="text-3xl font-bold text-gray-800">Sistema de Seguimiento de Migraña</h1>
            </div>
          </div>

          {error && currentView !== 'sessions' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <div>
                <h4 className="font-semibold text-red-800">Error</h4>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setCurrentView('patients')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentView === 'patients'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Users size={20} />
              Pacientes
            </button>
            <button
              onClick={() => {
                if (selectedPatient) {
                  setCurrentView('sessions');
                } else {
                  setError('Selecciona un paciente primero');
                }
              }}
              disabled={!selectedPatient}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentView === 'sessions'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50'
              }`}
            >
              <Calendar size={20} />
              Sesiones
            </button>
            <button
              onClick={() => {
                if (selectedPatient) {
                  setCurrentView('analytics');
                } else {
                  setError('Selecciona un paciente primero');
                }
              }}
              disabled={!selectedPatient}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentView === 'analytics'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50'
              }`}
            >
              <TrendingUp size={20} />
              Análisis
            </button>
          </div>

          {currentView === 'patients' && <PatientsView />}
          {currentView === 'sessions' && <SessionsView />}
          {currentView === 'analytics' && <AnalyticsView />}
        </div>
      </div>
    </div>
  );
};

export default AppDB;