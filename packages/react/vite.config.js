import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react({ jsxRuntime: 'automatic' })],
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.js'),
            formats: ['es'],
            fileName: () => 'flexdatalist-react.es.js',
        },
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            external: ['react', 'react-dom', 'react/jsx-runtime', 'flexdatalist'],
            output: {
                globals: {
                    react: 'React',
                    'react-dom': 'ReactDOM',
                    flexdatalist: 'Flexdatalist',
                },
            },
        },
    },
});
