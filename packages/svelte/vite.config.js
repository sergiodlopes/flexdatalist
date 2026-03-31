import { resolve } from 'path';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
    plugins: [svelte({ compilerOptions: { css: 'injected' } })],
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.js'),
            formats: ['es'],
            fileName: () => 'flexdatalist-svelte.es.js',
        },
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            external: (id) => id === 'flexdatalist' || id.startsWith('svelte'),
            output: {
                globals: {
                    svelte: 'svelte',
                    flexdatalist: 'Flexdatalist',
                },
            },
        },
    },
});
