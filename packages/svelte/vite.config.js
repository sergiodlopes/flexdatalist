import { resolve } from 'path';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// This prebuilt bundle (compiled with Svelte 5) is the fallback for tools
// without the "svelte" export condition. Svelte projects (Vite, SvelteKit)
// resolve "svelte" to src/ and compile the component with their own Svelte
// version, which is what makes Svelte 4 and SSR work.
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
        },
    },
});
