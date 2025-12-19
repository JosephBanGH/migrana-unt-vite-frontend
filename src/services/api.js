import { config } from '../config';

class ApiService {
  constructor() {
    this.baseUrl = config.apiUrl;
    this.timeout = config.timeout;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error en la petición');
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('La petición tardó demasiado');
      }
      
      throw error;
    }
  }

  // Sesiones
  async getSessions() {
    return this.request('/sessions');
  }

  async getSessionsByPatient(patient) {
    return this.request(`/sessions/patient/${encodeURIComponent(patient)}`);
  }

  async createSession(sessionData) {
    return this.request('/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData)
    });
  }

  async updateSession(id, sessionData) {
    return this.request(`/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sessionData)
    });
  }

  async deleteSession(id) {
    return this.request(`/sessions/${id}`, {
      method: 'DELETE'
    });
  }

  // IA
  async consultAI(sessionData) {
    return this.request('/ai/consult', {
      method: 'POST',
      body: JSON.stringify(sessionData)
    });
  }
}

export default new ApiService();