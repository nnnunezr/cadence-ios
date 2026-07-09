import type { CapacitorConfig } from '@capacitor/cli';

// Wraps the built web app (dist/) into native Android + iOS shells.
// Fully offline — all data lives in the WebView's IndexedDB.
const config: CapacitorConfig = {
  appId: 'com.unio.cadence',
  appName: 'Cadence',
  webDir: 'dist',
  backgroundColor: '#000000',
  android: { backgroundColor: '#000000' },
};

export default config;
