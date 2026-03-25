import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.efindo.cleancheck',
  appName: 'CleanCheck',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#FAFAF9',
    },
    StatusBar: {
      style: 'LIGHT',
    },
  },
};

export default config;
