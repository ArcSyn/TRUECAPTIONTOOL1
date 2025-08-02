import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0', // More explicit than true for Windows
    port: 5173,
    strictPort: true, // Fail if port is in use
    open: false, // Prevent auto-opening browser
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: false,  // Keep original host header for localhost detection
        secure: false,
        timeout: 10000,
        headers: {
          'Host': 'localhost:4000'  // Explicitly set host header
        },
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
            console.log('Host header:', proxyReq.getHeader('host'));
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
      '/logs': {
        target: 'http://localhost:4444',
        changeOrigin: true,
      }
    },
    allowedHosts: [
      'localhost',
      '.pythagora.ai'
    ],
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**', '**/public/**', '**/log/**'],
      usePolling: process.platform === 'win32', // Fix Windows file watching
      interval: 1000 // Polling interval for Windows
    },
    fs: {
      strict: false // Allow serving files outside of root
    }
  },
})
