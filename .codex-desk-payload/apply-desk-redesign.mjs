import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';

const patchUrl = 'https://files.catbox.moe/fjw9q4.patch';
const expectedPatchSha = '00d3026740780c6e43b265327dbc3188e88658d8e9b22c38adbc0630d7ca87e5';
const patchPath = '.codex-desk-payload/desk-redesign.patch';

const expectedFileHashes = new Map([
  ['src/components/FirstPersonWorld.jsx', '98557f89a5effc9f85cad0570aa6214c289d99254424cb87decffe6f298e790e'],
  ['src/components/ComputerUI.jsx', '665b0b90b949fe99e76d8a569ad5c27cf9473ef8e508d897a42679df786f4b70'],
  ['src/components/VirtualComputerShell.jsx', '308bc90085b4821e107fdef93af8ed2810ef5237a1d912382f31690bc2c433f1'],
  ['src/styles/computer-os-corrections.css', 'e1ca66902d3f5efff234d0aeae0df93e8cca880a36d62e56f6c480c9bddbac5f'],
  ['src/data/studyAgenda.js', '3a850f8024bda34f353668735d4e10655fdd1f9cd2ef6827fe34cc56197998fa']
]);

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

mkdirSync('.codex-desk-payload', { recursive: true });
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

rmSync('.codex-desk-payload', { recursive: true, force: true });
rmSync('.github/workflows/apply-desk-redesign.yml', { force: true });

console.log('Applied Estudiemos Room desk redesign patch and verified file hashes.');
