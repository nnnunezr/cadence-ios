import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Port 4400 so it can run alongside the Unio Dashboard (4200).
export default defineConfig({
  plugins: [react()],
  server: { port: 4400, host: 'localhost', strictPort: true },
  preview: { port: 4401 },
});
