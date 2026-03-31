import { resolve } from 'path';
import { defineConfig } from 'vite';

/**
 * Build-time plugin that appends ESM exports to flexdatalist.js so the
 * bundler can tree-shake and re-export it properly.  The source file on
 * disk stays untouched — this only affects the in-memory transform.
 */
function flexdatalistExport() {
    return {
        name: 'flexdatalist-export',
        transform(code, id) {
            if (id.replace(/\\/g, '/').endsWith('/flexdatalist.js')) {
                return {
                    code: code + '\nexport default Flexdatalist;\nexport { Flexdatalist };\n',
                    map: null,
                };
            }
        },
    };
}

export default defineConfig({
    plugins: [flexdatalistExport()],
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.js'),
            name: 'Flexdatalist',
            formats: ['es', 'umd'],
            fileName: (format) => `flexdatalist.${format}.js`,
        },
        outDir: 'dist',
        emptyOutDir: true,
        cssFileName: 'flexdatalist',
        rollupOptions: {
            output: {
                exports: 'named',
            },
        },
    },
});
