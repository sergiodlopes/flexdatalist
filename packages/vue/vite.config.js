import { resolve } from 'path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    plugins: [vue()],
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.js'),
            formats: ['es'],
            fileName: () => 'flexdatalist-vue.es.js',
        },
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            external: ['vue', 'flexdatalist'],
            output: {
                globals: {
                    vue: 'Vue',
                    flexdatalist: 'Flexdatalist',
                },
            },
        },
    },
});
