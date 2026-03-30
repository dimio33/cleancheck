import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.efindo.cleancheck',
  appName: 'WC-CleanCheck',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 0,
      backgroundColor: '#0D9488',
    },
    StatusBar: {
      style: 'LIGHT',
    },
  },
};

export default config;
