import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';

const patchUrl = 'https://files.catbox.moe/sycnsy.patch';
const expectedPatchSha = 'c141286c0f2bd037271be89638c04ab019a1afc84a301ec5df30119bceeca2ed';
const patchPath = '.codex-art-payload/art-direction.patch';

const expectedFileHashes = new Map([
  ['src/components/FirstPersonWorld.jsx', 'e4be9d05f750507f79d201003db371aa6645ca94096a86712b41a84014cf2318'],
  ['src/maps/Casa1.js', '4cb4a682c3264e51b275b01045c77b0cc66b64b37c058941937492b32aedcaf3'],
  ['src/components/Hud.jsx', '97ee1ba7f0acb9b835beb8f3f9e9283a79ba73771a87f81e86ba8e67d9b8f6aa'],
  ['src/styles/app.css', '0df4aad45d641b5f0a8b09d6bcf6b62345f1f5e2d3d6e954ed5604328bafe2bf'],
  ['src/styles/computer-os-corrections.css', '9ebf5561f1e93c7cd73db9984eb17dde971b878628365c03a9165ec623be5315']
]);

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

mkdirSync('.codex-art-payload', { recursive: true });
execFileSync('curl', ['-L', '--fail', '--silent', '--show-error', patchUrl, '-o', patchPath], { stdio: 'inherit' });

const patchSha = sha256(patchPath);
if (patchSha !== expectedPatchSha) {
  throw new Error(`Patch SHA mismatch: expected ${expectedPatchSha}, got ${patchSha}`);
}

execFileSync('git', ['apply', '--whitespace=nowarn', patchPath], { stdio: 'inherit' });

for (const [path, expectedSha] of expectedFileHashes) {
  const actualSha = sha256(path);
  if (actualSha !== expectedSha) {
    throw new Error(`${path} SHA mismatch: expected ${expectedSha}, got ${actualSha}`);
  }
}

rmSync('.codex-art-payload', { recursive: true, force: true });
rmSync('.github/workflows/apply-art-direction.yml', { force: true });

console.log('Applied Estudiemos Room art direction patch and verified file hashes.');
