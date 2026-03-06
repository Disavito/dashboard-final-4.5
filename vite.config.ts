import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Carga las variables de entorno basadas en el modo (development, production, etc.)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'esnext', 
      minify: 'esbuild',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('jspdf') || id.includes('html2canvas')) {
                return 'pdf-utils';
              }
              if (id.includes('recharts')) {
                return 'charts';
              }
              if (id.includes('lucide-react')) {
                return 'icons';
              }
              if (id.includes('@supabase') || id.includes('axios')) {
                return 'services';
              }
              return 'vendor';
            }
          },
        },
      },
    },
    preview: {
      host: true,
      allowedHosts: ['fimagadi-dashboard.mv7mvl.easypanel.host']
    },
  }; // <--- Esta llave cierra el objeto de retorno
}); // <--- Este paréntesis cierra el defineConfig
