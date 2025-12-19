import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Plus, Brain, TrendingUp, Activity, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

// ========================================
// CONFIGURACIÓN DE SUPABASE
// ========================================
const SUPABASE_URL = import.meta.env.SUPABASE_URL;// Reemplazar con tu URL
const SUPABASE_ANON_KEY = import.meta.env.SUPABASE_ANON_KEY;// Reemplazar con tu API key

// ========================================
// CONFIGURACIÓN DE APIs DE IA
// ========================================
const DEEPSEEK_API_KEY = 'tu-deepseek-api-key'; // Reemplazar con tu API key
const COPILOT_API_KEY = 'tu-copilot-api-key'; // Reemplazar con tu API key

const App = () => {
  const [currentView, setCurrentView] = useState('sessions');
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [showAIConsult, setShowAIConsult] = useState(false);
  const [aiResponses, setAiResponses] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ========================================
  // FUNCIONES DE SUPABASE
  // ========================================
  
  // Cargar todas las sesiones desde Supabase
  // Reemplazar fetchSessions
  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSessions();
      setSessions(data);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Guardar sesión en Supabase
  const saveSessionToSupabase = async (session) => {
    try {
      const method = session.id && typeof session.id === 'number' && session.id < 1000000000000 ? 'PATCH' : 'POST';
      const url = method === 'PATCH' 
        ? `${SUPABASE_URL}/rest/v1/sessions?id=eq.${session.id}`
        : `${SUPABASE_URL}/rest/v1/sessions`;

      const response = await fetch(url, {
        method,
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          patient: session.patient,
          date: session.date,
          kpis: session.kpis,
          diagnosis: session.diagnosis,
          progress: session.progress,
          ai_vote: session.aiVote,
          ai_vote_reason: session.aiVoteReason
        })
      });

      if (!response.ok) {
        throw new Error('Error al guardar sesión en Supabase');
      }

      const savedData = await response.json();
      return savedData[0] || savedData;
    } catch (err) {
      console.error('Error saving session:', err);
      setError(err.message);
      throw err;
    }
  };

  // ========================================
  // FUNCIONES DE CONSULTA A IA
  // ========================================

  // Consultar a DeepSeek
  const consultDeepSeek = async (sessionData) => {
    const prompt = `Analiza los siguientes datos de un paciente con migraña:
- Frecuencia: ${sessionData.kpis.frequency} episodios/mes
- Intensidad: ${sessionData.kpis.intensity}/10
- Duración: ${sessionData.kpis.duration} horas
- Desencadenantes: ${sessionData.kpis.triggers}
- Medicación actual: ${sessionData.kpis.medication}

Proporciona:
1. Diagnóstico clínico
2. Análisis de patrones
3. Recomendaciones de tratamiento`;

    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'Eres un asistente médico especializado en neurología y tratamiento de migrañas. Proporciona análisis clínicos precisos y recomendaciones basadas en evidencia.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error('Error en la API de DeepSeek');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (err) {
      console.error('Error consulting DeepSeek:', err);
      return `Error al consultar DeepSeek: ${err.message}\n\nUsando análisis de respaldo...`;
    }
  };

  // Consultar a GitHub Copilot (Azure OpenAI)
  const consultCopilot = async (sessionData) => {
    const prompt = `Analiza predictivamente estos datos de migraña:
- Frecuencia: ${sessionData.kpis.frequency} episodios/mes
- Intensidad: ${sessionData.kpis.intensity}/10
- Duración: ${sessionData.kpis.duration} horas
- Desencadenantes: ${sessionData.kpis.triggers}
- Medicación actual: ${sessionData.kpis.medication}

Proporciona:
1. Análisis predictivo
2. Probabilidad de mejora
3. Factores de riesgo identificados
4. Recomendaciones personalizadas`;

    try {
      // Nota: GitHub Copilot usa Azure OpenAI endpoint
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${COPILOT_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'Eres un sistema de inteligencia artificial especializado en análisis predictivo de migrañas. Utiliza modelos estadísticos y machine learning para proporcionar predicciones y recomendaciones.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error('Error en la API de Copilot/OpenAI');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (err) {
      console.error('Error consulting Copilot:', err);
      return `Error al consultar Copilot: ${err.message}\n\nUsando análisis de respaldo...`;
    }
  };

  // ========================================
  // CARGAR DATOS DE EJEMPLO (FALLBACK)
  // ========================================
  const loadSampleData = () => {
    const sampleSessions = [
      {
        id: 1,
        date: '2024-11-15',
        patient: 'María González',
        kpis: {
          frequency: 3,
          intensity: 7,
          duration: 4,
          triggers: 'Estrés, falta de sueño',
          medication: 'Ibuprofeno 600mg'
        },
        diagnosis: 'Migraña episódica moderada con respuesta parcial al tratamiento',
        progress: 45,
        aiVote: null
      },
      {
        id: 2,
        date: '2024-11-22',
        patient: 'María González',
        kpis: {
          frequency: 2,
          intensity: 5,
          duration: 3,
          triggers: 'Cambios climáticos',
          medication: 'Ibuprofeno 600mg + Sumatriptán'
        },
        diagnosis: 'Mejoría notable, continuar con tratamiento actual',
        progress: 65,
        aiVote: 'DeepSeek'
      }
    ];
    setSessions(sampleSessions);
  };

  // Cargar sesiones al montar el componente
  useEffect(() => {
    fetchSessions();
  }, []);

  const handleNewSession = () => {
    const newSession = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      patient: 'Nuevo Paciente',
      kpis: {
        frequency: 0,
        intensity: 0,
        duration: 0,
        triggers: '',
        medication: ''
      },
      diagnosis: '',
      progress: 0,
      aiVote: null
    };
    setCurrentSession(newSession);
    setShowAIConsult(false);
    setAiResponses(null);
  };

  const handleSaveSession = async () => {
    if (currentSession) {
      setLoading(true);
      try {
        let savedSession;
        if (currentSession.id && currentSession.id < 1000000000000) {
          savedSession = await api.updateSession(currentSession.id, currentSession);
        } else {
          savedSession = await api.createSession(currentSession);
        }
        
        const existingIndex = sessions.findIndex(s => s.id === currentSession.id);
        if (existingIndex >= 0) {
          const updated = [...sessions];
          updated[existingIndex] = savedSession;
          setSessions(updated);
        } else {
          setSessions([savedSession, ...sessions]);
        }
        
        setCurrentSession(null);
        setShowAIConsult(false);
        setAiResponses(null);
      } catch (err) {
        setError('No se pudo guardar la sesión: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAIConsult = async () => {
    setLoadingAI(true);
    setShowAIConsult(true);
    setError(null);
    
    try {
      const response = await api.consultAI(currentSession);
      
      setAiResponses({
        deepseek: {
          name: 'DeepSeek (Análisis Clínico)',
          diagnosis: response.deepseek.error 
            ? 'Error: ' + response.deepseek.message 
            : response.deepseek,
          recommendation: 'Ver análisis completo arriba'
        },
        copilot: {
          name: 'Copilot (Análisis Predictivo)',
          diagnosis: response.openai.error 
            ? 'Error: ' + response.openai.message 
            : response.openai,
          recommendation: 'Ver análisis completo arriba'
        }
      });
    } catch (err) {
      setError('Error al consultar IAs: ' + err.message);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleAIVote = (aiName, reason) => {
    setCurrentSession({
      ...currentSession,
      aiVote: aiName,
      aiVoteReason: reason
    });
  };

  // Preparar datos para análisis
  const getProgressData = () => {
    return sessions.map((s, idx) => ({
      session: `S${idx + 1}`,
      date: s.date,
      progreso: s.progress
    }));
  };

  const getKPIEvolution = () => {
    return sessions.map((s, idx) => ({
      session: `S${idx + 1}`,
      frecuencia: s.kpis.frequency,
      intensidad: s.kpis.intensity,
      duración: s.kpis.duration
    }));
  };

  const getDiagnosisDistribution = () => {
    const withMigraine = sessions.filter(s => 
      s.diagnosis.toLowerCase().includes('migraña') || 
      s.diagnosis.toLowerCase().includes('episodio')
    ).length;
    const withoutMigraine = sessions.length - withMigraine;
    return [
      { name: 'Con Migraña', value: withMigraine, color: '#ef4444' },
      { name: 'Sin Migraña', value: withoutMigraine, color: '#10b981' }
    ];
  };

  const getAIVoteDistribution = () => {
    const votes = sessions.filter(s => s.aiVote);
    const ai1Votes = votes.filter(s => s.aiVote === 'IA-1').length;
    const ai2Votes = votes.filter(s => s.aiVote === 'IA-2').length;
    return [
      { name: 'IA-1', value: ai1Votes, color: '#3b82f6' },
      { name: 'IA-2', value: ai2Votes, color: '#8b5cf6' }
    ];
  };

  // Vista de Sesiones
  const SessionsView = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Sesiones de Seguimiento</h2>
        <button
          onClick={handleNewSession}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Nueva Sesión
        </button>
      </div>

      {currentSession ? (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Registro de Sesión</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Paciente</label>
              <input
                type="text"
                value={currentSession.patient}
                onChange={(e) => setCurrentSession({...currentSession, patient: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
              <input
                type="date"
                value={currentSession.date}
                onChange={(e) => setCurrentSession({...currentSession, date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-3">KPIs del Paciente</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia (episodios/mes)</label>
                  <input
                    type="number"
                    value={currentSession.kpis.frequency}
                    onChange={(e) => setCurrentSession({
                      ...currentSession,
                      kpis: {...currentSession.kpis, frequency: parseInt(e.target.value) || 0}
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Intensidad (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={currentSession.kpis.intensity}
                    onChange={(e) => setCurrentSession({
                      ...currentSession,
                      kpis: {...currentSession.kpis, intensity: parseInt(e.target.value) || 0}
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duración (horas)</label>
                  <input
                    type="number"
                    value={currentSession.kpis.duration}
                    onChange={(e) => setCurrentSession({
                      ...currentSession,
                      kpis: {...currentSession.kpis, duration: parseInt(e.target.value) || 0}
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Medicación</label>
                  <input
                    type="text"
                    value={currentSession.kpis.medication}
                    onChange={(e) => setCurrentSession({
                      ...currentSession,
                      kpis: {...currentSession.kpis, medication: e.target.value}
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Desencadenantes</label>
                  <input
                    type="text"
                    value={currentSession.kpis.triggers}
                    onChange={(e) => setCurrentSession({
                      ...currentSession,
                      kpis: {...currentSession.kpis, triggers: e.target.value}
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Ej: estrés, falta de sueño, alimentos"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Diagnóstico del Médico</label>
              <textarea
                value={currentSession.diagnosis}
                onChange={(e) => setCurrentSession({...currentSession, diagnosis: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="4"
                placeholder="Diagnóstico y observaciones del médico..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Porcentaje de Avance: {currentSession.progress}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={currentSession.progress}
                onChange={(e) => setCurrentSession({...currentSession, progress: parseInt(e.target.value)})}
                className="w-full"
              />
              <div className="w-full bg-gray-200 rounded-full h-4 mt-2">
                <div
                  className="bg-green-600 h-4 rounded-full transition-all duration-300"
                  style={{width: `${currentSession.progress}%`}}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleAIConsult}
                className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Brain size={20} />
                Consultar IA
              </button>

              <button
                onClick={handleSaveSession}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                Guardar Sesión
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
                      <div className="text-sm text-gray-700 mb-3 whitespace-pre-line">
                        {ai.diagnosis}
                      </div>
                      <div className="text-sm font-medium text-blue-800 mb-3">
                        Recomendación: {ai.recommendation}
                      </div>
                      <button
                        onClick={() => {
                          const reason = prompt(`¿Por qué ${ai.name} tuvo el mejor resultado?`);
                          if (reason) handleAIVote(key.toUpperCase(), reason);
                        }}
                        className={`w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          currentSession.aiVote === key.toUpperCase()
                            ? 'bg-purple-600 text-white'
                            : 'bg-white text-purple-600 border border-purple-300 hover:bg-purple-50'
                        }`}
                      >
                        {currentSession.aiVote === key.toUpperCase() ? '✓ Votado' : 'Votar por esta IA'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {currentSession.aiVote && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Voto registrado:</strong> {currentSession.aiVote}
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    <strong>Razón:</strong> {currentSession.aiVoteReason}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg text-gray-800">{session.patient}</h3>
                    <span className="text-sm text-gray-500">{session.date}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{session.diagnosis}</p>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>Frecuencia: {session.kpis.frequency}/mes</span>
                    <span>Intensidad: {session.kpis.intensity}/10</span>
                    <span>Duración: {session.kpis.duration}h</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">{session.progress}%</div>
                  {session.aiVote && (
                    <div className="text-xs text-purple-600 mt-1">
                      IA votada: {session.aiVote}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Vista de Análisis
  const AnalyticsView = () => {
    const [selectedMetrics, setSelectedMetrics] = useState({
      frequency: true,
      intensity: true,
      duration: true
    });

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Panel de Análisis</h2>
          <div className="flex gap-2">
            {Object.keys(selectedMetrics).map(metric => (
              <button
                key={metric}
                onClick={() => setSelectedMetrics({...selectedMetrics, [metric]: !selectedMetrics[metric]})}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedMetrics[metric]
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {metric === 'frequency' ? 'Frecuencia' : metric === 'intensity' ? 'Intensidad' : 'Duración'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Evolución del Progreso</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={getProgressData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="session" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="progreso" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Evolución de KPIs</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={getKPIEvolution()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="session" />
                <YAxis />
                <Tooltip />
                <Legend />
                {selectedMetrics.frequency && <Line type="monotone" dataKey="frecuencia" stroke="#3b82f6" />}
                {selectedMetrics.intensity && <Line type="monotone" dataKey="intensidad" stroke="#ef4444" />}
                {selectedMetrics.duration && <Line type="monotone" dataKey="duración" stroke="#f59e0b" />}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Distribución de Diagnósticos</h3>
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

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Votación de IAs</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={getAIVoteDistribution()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Resumen Estadístico</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Total Sesiones</div>
              <div className="text-2xl font-bold text-blue-600">{sessions.length}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Progreso Promedio</div>
              <div className="text-2xl font-bold text-green-600">
                {sessions.length > 0 ? Math.round(sessions.reduce((acc, s) => acc + s.progress, 0) / sessions.length) : 0}%
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Intensidad Promedio</div>
              <div className="text-2xl font-bold text-red-600">
                {sessions.length > 0 ? (sessions.reduce((acc, s) => acc + s.kpis.intensity, 0) / sessions.length).toFixed(1) : 0}/10
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Votos IA Registrados</div>
              <div className="text-2xl font-bold text-purple-600">
                {sessions.filter(s => s.aiVote).length}
              </div>
            </div>
          </div>
        </div>
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

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setCurrentView('sessions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors bg-gray-200 text-gray-700 hover:bg-gray-300 ${
                currentView === 'sessions'
                  ? 'bg-blue-100 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Plus size={20} />
              Sesiones
            </button>
            <button
              onClick={() => setCurrentView('analytics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentView === 'analytics'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <TrendingUp size={20} />
              Análisis
            </button>
          </div>

          {currentView === 'sessions' ? <SessionsView /> : <AnalyticsView />}
        </div>
      </div>
    </div>
  );
};

export default App;