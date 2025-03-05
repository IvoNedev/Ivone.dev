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
            input: {
                mortgage: path.resolve(__dirname, 'index.jsx'),  // Generates dist/mortgage.js
                cv: path.resolve(__dirname, 'cv-index.jsx')      // Generates dist/cv.js
            },
            output: {
                entryFileNames: '[name].js', 
                chunkFileNames: '[name].js',
                assetFileNames: '[name].[ext]'
            }
        }
    }
});
