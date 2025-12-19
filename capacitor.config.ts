import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.migranauntvite.app',
  appName: 'Migrana-unt-vite',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Para desarrollo: permite conexión a localhost
    cleartext: true,
    allowNavigation: [
      'localhost',
      '*.railway.app',
      '*.supabase.co'
    ]
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#2563eb",
      showSpinner: true,
      spinnerColor: "#ffffff"
    }
  }
};

export default config;