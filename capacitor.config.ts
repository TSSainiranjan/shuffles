import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shuffles.picker',
  appName: 'Snooker Shuffles Picker',
  webDir: 'dist/client',
  server: {
    androidScheme: 'https'
  }
};

export default config;
