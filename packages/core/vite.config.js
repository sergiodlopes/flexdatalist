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

/**
 * The package is `"type": "module"`, so Node parses any `.js` file as an ES
 * module: `require('flexdatalist')` on `flexdatalist.umd.js` returned an empty
 * object. The UMD build is therefore emitted as `.cjs` (used by `main` and the
 * `require` condition), and this plugin keeps an identical
 * `flexdatalist.umd.js` copy for existing <script>/CDN URLs.
 */
function umdJsCopy() {
    return {
        name: 'flexdatalist-umd-js-copy',
        generateBundle(_, bundle) {
            const umd = bundle['flexdatalist.umd.cjs'];
            if (umd?.type === 'chunk') {
                this.emitFile({ type: 'asset', fileName: 'flexdatalist.umd.js', source: umd.code });
            }
        },
    };
}

export default defineConfig({
    plugins: [flexdatalistExport(), umdJsCopy()],
    // Vitest (`pnpm test`): the same export plugin lets tests import the
    // classic-script source as an ES module.
    test: {
        environment: 'happy-dom',
        include: ['test/**/*.test.js'],
    },
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.js'),
            name: 'Flexdatalist',
            formats: ['es', 'umd'],
            fileName: (format) => format === 'umd' ? 'flexdatalist.umd.cjs' : `flexdatalist.${format}.js`,
        },
        outDir: 'dist',
        emptyOutDir: true,
        cssFileName: 'flexdatalist',
        rollupOptions: {
            output: {
                exports: 'named',
                // With named exports, the UMD build loaded by a <script> tag set
                // window.Flexdatalist to the namespace { Flexdatalist, default },
                // so `Flexdatalist.init()` was undefined. When (and only when)
                // that namespace is on the global object, replace it with the
                // class itself, keeping `.Flexdatalist` / `.default` aliases.
                // A no-op for ES modules, CommonJS and AMD.
                footer: ';(function (root) {'
                    + ' var ns = root && root.Flexdatalist;'
                    + ' if (ns && typeof ns === "object" && typeof ns.default === "function") {'
                    + ' var Cls = ns.default; Cls.Flexdatalist = Cls; Cls.default = Cls; root.Flexdatalist = Cls;'
                    + ' }'
                    + ' })(typeof globalThis !== "undefined" ? globalThis : this);',
            },
        },
    },
});
