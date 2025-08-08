import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',      // Expose to network
    port: 5173,           // Default dev port
    strictPort: true,     // Avoid random fallback ports
    origin: 'https://96720467dfd3.ngrok-free.app',  // 👈 Replace this with your current ngrok URL
    hmr: {
      clientPort: 443     // Required for HTTPS HMR with ngrok
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})
