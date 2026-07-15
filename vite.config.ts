import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// index.html uses %VITE_PUBLIC_BASE_URL% in canonical/OG tags. Without a value
// Vite leaves the literal placeholder in the URLs (and `vite build` chokes on
// it), so default the public origin here for env-less local builds.
process.env.VITE_PUBLIC_BASE_URL ||= 'https://shakurs.com';

export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 3000 },
});
