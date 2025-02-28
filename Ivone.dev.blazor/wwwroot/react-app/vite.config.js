import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api': 'https://localhost:5001'
        }
    },
    resolve: {
        alias: {
            '@': resolve(__dirname),
        }
    },
    base: './',
    root: './',
    build: {
        outDir: './dist',
        emptyOutDir: true,
        rollupOptions: {
            output: {
                entryFileNames: 'index.js',
                chunkFileNames: 'index.js',
                assetFileNames: 'index.css'
            }
        }
    }
});
