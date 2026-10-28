import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          rewrite: p => p.replace(/^\/api/, ''),
          headers: { 'X-API-Key': env.RIDECOMPARE_TEAM_KEY }
        }
      }
    }
  }
})