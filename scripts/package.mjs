import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { zipSync, unzipSync } from 'fflate';
import path from 'node:path';

const manifest = JSON.parse(await readFile('dist/manifest.json', 'utf8'));
const files = {};
async function collect(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) await collect(path.join(directory, entry.name), name + '/');
    else if (!name.endsWith('.map')) files[name] = new Uint8Array(await readFile(path.join(directory, entry.name)));
  }
}
await collect('dist');
for (const name of [manifest.background.service_worker, manifest.action.default_popup, ...manifest.content_scripts.flatMap(s => s.js)]) {
  if (!files[name]) throw new Error(`Manifest references a missing file: ${name}`);
}
const archive = zipSync(files, { level: 9, mtime: new Date('2026-01-01T00:00:00Z') });
const unpacked = unzipSync(archive);
if (Object.keys(unpacked).length !== Object.keys(files).length) throw new Error('Incomplete archive');
for (const [name, bytes] of Object.entries(files)) {
  if (!Buffer.from(unpacked[name]).equals(Buffer.from(bytes))) throw new Error(`Archive content mismatch: ${name}`);
}
const filename = `BlurReact-${manifest.version_name || manifest.version}.zip`;
await mkdir('release', { recursive: true });
await writeFile(`release/${filename}`, archive);
await writeFile(`release/${filename}.sha256`, `${createHash('sha256').update(archive).digest('hex')}  ${filename}\n`);
console.log(`Ready: release/${filename} (${archive.length} bytes, ${Object.keys(files).length} files)`);
