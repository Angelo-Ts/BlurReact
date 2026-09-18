import { build, context } from 'esbuild';
import { mkdir, cp } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });
const options = { entryPoints: { background: 'src/background.ts', content: 'src/content/index.ts', popup: 'src/popup.ts' }, outdir: 'dist', bundle: true, format: 'iife', target: 'chrome120', sourcemap: true, legalComments: 'none' };
if (process.argv.includes('--watch')) { await (await context(options)).watch(); }
else { await build(options); }
