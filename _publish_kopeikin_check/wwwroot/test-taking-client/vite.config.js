import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    base: '/test-taking-client/dist/',
    plugins: [react()],
    build: {
        outDir: './dist',
        emptyOutDir: true,
        rollupOptions: {
            output: {
                // Set fixed file names – remove hash strings
                entryFileNames: 'assets/index.js',
                chunkFileNames: 'assets/[name].js',
                assetFileNames: 'assets/[name].[ext]'
            }
        }
    }
});
