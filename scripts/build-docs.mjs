// Builds the documentation site into a folder ready to upload as it is.
//
// Usage (from the repository root):
//   pnpm docs:build              # writes docs-dist/
//   pnpm docs:build -- <folder>  # writes <folder>/ instead
//
// In the repository the pages load the plugin from ../packages/core/src/.
// On the website the pages sit at the site root, next to a core/ folder:
//
//   docs-dist/
//     index.html, examples.html, demo-api.js, demo-data.js, countries.json
//     llms.txt                (from packages/core, served at /llms.txt)
//     core/flexdatalist.js
//     core/flexdatalist.css
//
// so the plugin files are copied into core/ and the paths are rewritten.
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docsFolder = join(repositoryRoot, 'docs');
const coreSourceFolder = join(repositoryRoot, 'packages/core/src');
const outputFolder = resolve(repositoryRoot, process.argv[2] ?? 'docs-dist');

const repositoryPluginPath = '../packages/core/src/';
const sitePluginPath = 'core/';
const pluginFiles = ['flexdatalist.js', 'flexdatalist.css'];
const rewrittenExtensions = new Set(['.html', '.js', '.css']);

if (outputFolder === repositoryRoot || !outputFolder.startsWith(repositoryRoot)) {
    throw new Error(`Refusing to write the docs outside a subfolder of the repository: ${outputFolder}`);
}

await rm(outputFolder, { recursive: true, force: true });
await mkdir(join(outputFolder, 'core'), { recursive: true });

const builtFiles = [];

for (const entry of await readdir(docsFolder, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const sourcePath = join(docsFolder, entry.name);
    const targetPath = join(outputFolder, entry.name);
    if (rewrittenExtensions.has(extname(entry.name))) {
        const content = await readFile(sourcePath, 'utf8');
        const rewritten = content.replaceAll(repositoryPluginPath, sitePluginPath);
        const leftover = rewritten.match(/["'(]\.\.\/[^"')]*/);
        if (leftover) {
            throw new Error(`${entry.name} still points outside the site: ${leftover[0].slice(1)}`);
        }
        await writeFile(targetPath, rewritten);
    } else {
        await copyFile(sourcePath, targetPath);
    }
    builtFiles.push(entry.name);
}

for (const pluginFile of pluginFiles) {
    await copyFile(join(coreSourceFolder, pluginFile), join(outputFolder, 'core', pluginFile));
    builtFiles.push('core/' + pluginFile);
}

// The llms.txt convention serves the file from the site root.
await copyFile(join(repositoryRoot, 'packages/core/llms.txt'), join(outputFolder, 'llms.txt'));
builtFiles.push('llms.txt');

console.log(`Docs built in ${relative(repositoryRoot, outputFolder)}/ (${builtFiles.length} files):`);
for (const builtFile of builtFiles) console.log('  ' + builtFile);
