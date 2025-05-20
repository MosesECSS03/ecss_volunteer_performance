import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,  // Set port to 3000
    historyApiFallback: true, // Add this for React Router to work with direct URLs
  },
  build: {
    outDir: 'dist', // Specify build output directory
  },
})