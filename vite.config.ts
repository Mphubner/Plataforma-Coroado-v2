import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;

            if (id.includes('firebase')) return 'vendor-firebase';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('@radix-ui') || id.includes('@base-ui') || id.includes('embla-carousel')) return 'vendor-ui';
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
            if (id.includes('leaflet') || id.includes('html5-qrcode')) return 'vendor-maps-checkin';
            if (id.includes('motion')) return 'vendor-motion';
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('scheduler') || id.includes('react-router-dom')) return 'vendor-react';

            return 'vendor-misc';
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
  };
});
