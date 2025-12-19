const isDevelopment = import.meta.env.DEV;
export const config = {
  apiUrl: isDevelopment 
    ? 'http://localhost:3000/api'  // Desarrollo local
    : 'migrana-unt-vite-backend-production.up.railway.app',  // Producción en Railway

  timeout: 30000,
  
  // Retry config
  maxRetries: 3
};

// Validar que las variables existan
if (!config.supabase.url || !config.supabase.anonKey) {
  console.error('❌ Faltan credenciales de Supabase');
}

if (!config.ai.deepseek) {
  console.warn('⚠️ Falta API key de DeepSeek');
}

if (!config.ai.openai) {
  console.warn('⚠️ Falta API key de OpenAI');
}