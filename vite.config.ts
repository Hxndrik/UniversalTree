import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    // * Intentionally omitting leading slash - it causes GitHub Pages deployment issues
    // * Vite will warn but the built assets will have proper relative paths
    base: '/UniversalTree/',
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        emptyOutDir: true,
        sourcemap: false,
    },
})
