import { spawnSync } from 'node:child_process';
import { copyFileSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const version = manifest.version;
if (typeof version !== 'string' || !/^\d+(\.\d+){0,3}$/.test(version) ||
    version.split('.').some(part => Number(part) > 65535 || (part.length > 1 && part.startsWith('0'))) ||
    version.split('.').every(part => Number(part) === 0)) {
  throw new Error('manifest.json must contain a valid Chrome extension version.');
}

// Explicit inclusion keeps tests, development tools, credentials, and prior builds out of releases.
const files = [
  'manifest.json', 'popup.html', 'popup.css', 'popup.js',
  'page.js', 'rules.js', 'worker.js', 'matcher.js',
  'icons/icon-16.png', 'icons/icon-32.png', 'icons/icon-48.png', 'icons/icon-128.png'
];
for (const path of [manifest.action?.default_popup,
  ...Object.values(manifest.icons ?? {}), ...Object.values(manifest.action?.default_icon ?? {})]) {
  if (!files.includes(path)) throw new Error(`Manifest asset is missing from the package list: ${path}`);
}

const output = join(root, 'dist');
mkdirSync(output, { recursive: true });
const temporary = mkdtempSync(join(output, '.package-'));
try {
  const staging = join(temporary, 'extension');
  for (const path of files) {
    const source = join(root, path);
    if (!lstatSync(source).isFile()) throw new Error(`Expected a regular runtime file: ${path}`);
    const destination = join(staging, path);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(source, destination);
  }
  const archive = join(temporary, 'extension.zip');
  const result = spawnSync('zip', ['-X', '-q', archive, ...files], {
    cwd: staging, stdio: 'inherit', env: { ...process.env, ZIPOPT: '' }
  });
  if (result.error) throw new Error('Packaging requires the zip command on PATH.', { cause: result.error });
  if (result.status !== 0) throw new Error(`zip failed (${result.signal ?? result.status}).`);
  const destination = join(output, `chrome-regex-${version}.zip`);
  // Replace only after a complete build; never update an old ZIP that may contain stale files.
  renameSync(archive, destination);
  console.log(`Created ${destination} (${files.length} runtime files).`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
