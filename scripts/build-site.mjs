import { buildSeo } from './build-seo.mjs';
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..'), output = resolve(root, 'public-site');
rmSync(output, { recursive: true, force: true });
mkdirSync(output);
for (const dir of ['assets', 'admin', 'data', 'vehicules']) cpSync(resolve(root, dir), resolve(output, dir), { recursive: true });
for (const file of readdirSync(root, { withFileTypes: true })) {
 if (file.isFile() && (/\.(html|css|js|xml|svg|webmanifest|txt)$/.test(file.name) || ['_headers', '_redirects'].includes(file.name))) cpSync(resolve(root,file.name),resolve(output,file.name));
}
buildSeo(output);
for (const args of [['ci'], ['exec', '--', 'expo', 'export', '--platform', 'web', '--output-dir', '../public-site/application']]) {
 const result = spawnSync('npm', args, { cwd: resolve(root, 'mobile'), stdio: 'inherit', env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1', MBOA_WEB_PREVIEW: '1' } });
 if (result.status !== 0) process.exit(result.status || 1);
}
console.log('Site et aperçu de l’application construits.');
