import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  // Fix unused JS (247 KiB savings)
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/database']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false // Reduce bundle size
  },

  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.js$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },  
  server: {
    port: 3000,
    historyApiFallback: true,  // Fix direct URL access in dev
  }
});
