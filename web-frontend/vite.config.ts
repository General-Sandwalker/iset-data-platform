import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
plugins: [react()],
root: '.',
publicDir: 'public',
build: {
outDir: 'dist',
rollupOptions: {
output: {
manualChunks: {
'vendor-react': ['react', 'react-dom', 'react-router-dom'],
'vendor-antd': ['antd', '@ant-design/icons'],
'vendor-charts': ['@ant-design/charts'],
'vendor-query': ['@tanstack/react-query', 'zustand', 'axios'],
},
},
},
},
server: {
port: 3000,
proxy: {
'/api': {
target: 'http://localhost:4000',
changeOrigin: true,
},
},
},
});