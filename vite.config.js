import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Browser checks write large downloads here; Windows can lock those files.
    watch: { ignored: ['**/.tmp/**'] },
  },
})
