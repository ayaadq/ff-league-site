import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // .claude/ is Claude Code/Cowork's own data directory living inside
    // this connected folder — it's not part of the app and some paths
    // in it aren't statable from this dev environment, which crashes
    // Vite's file watcher (EIO) if it isn't excluded.
    watch: {
      ignored: ['**/.claude/**'],
    },
  },
})
