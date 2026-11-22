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
            external: ['react', 'react/jsx-runtime', 'flexdatalist'],
            output: {
                // The component uses hooks and the DOM: mark it as a Client
                // Component so it can be imported from React Server Components
                // (e.g. the Next.js App Router). Source-level directives are
                // dropped by the bundler, so it is added to the output.
                banner: "'use client';",
            },
        },
    },
});
