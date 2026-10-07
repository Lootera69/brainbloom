import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { loadEnvFile } from 'node:process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { cert } from 'firebase-admin/app';
import { readServiceAccount } from '@/lib/server/service-account';

process.on('uncaughtException', () => { console.error('Credential rotation stopped; no credential values were logged.'); process.exit(1); });
loadEnvFile('.env.local');
const current = readServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT);
if (current.project_id !== 'brainbloom-40') throw new Error('Unexpected project.');
const mode = process.argv[2];
const folder = '.private-invites';
const path = `${folder}/server-key-rotation.json`;
let token: string;
if (process.argv.includes('--cli-auth')) {
  const auth = createRequire(import.meta.url)(resolve(process.env.APPDATA!, 'npm/node_modules/firebase-tools/lib/auth.js'));
  const account = auth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) throw new Error('Firebase CLI sign-in is required.');
  try {
    token = (await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform'])).access_token;
  } catch { throw new Error('Firebase CLI authentication failed.'); }
} else token = (await cert(current).getAccessToken()).access_token;
const base = `https://iam.googleapis.com/v1/projects/${current.project_id}/serviceAccounts/${encodeURIComponent(current.client_email)}/keys`;
if (mode === '--create') {
  try { await readFile(path); throw new Error('An existing rotation needs review.'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const response = await fetch(base, { method: 'POST', headers: {
    Authorization: `Bearer ${token}`, 'Content-Type': 'application/json',
  }, body: JSON.stringify({ privateKeyType: 'TYPE_GOOGLE_CREDENTIALS_FILE', keyAlgorithm: 'KEY_ALG_RSA_2048' }) });
  if (!response.ok) throw new Error(`Key creation failed (${response.status}).`);
  const result = await response.json();
  const replacement = readServiceAccount(result.privateKeyData);
  if (replacement.client_email !== current.client_email || replacement.project_id !== current.project_id) throw new Error('Replacement identity mismatch.');
  await mkdir(folder, { recursive: true });
  await writeFile(path, JSON.stringify({ oldKeyId: current.private_key_id, encoded: result.privateKeyData, createdAt: Date.now() }), { flag: 'wx' });
  console.log('Replacement key created and saved privately. Authentication verification is the next step; no deployment has changed yet.');
} else if (mode === '--list') {
  const response = await fetch(base, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Key listing failed.');
  const result = await response.json();
  console.log(JSON.stringify(result.keys.map((key: { name: string; validAfterTime: string; keyType: string }) => ({ id: key.name.split('/').pop(), created: key.validAfterTime, type: key.keyType }))));
} else if (mode === '--verify-new') {
  const saved = JSON.parse(await readFile(path, 'utf8'));
  await cert(readServiceAccount(saved.encoded)).getAccessToken();
  console.log('Replacement authentication verified.');
} else if (mode === '--revoke-unused') {
  const keyId = process.argv[3];
  if (keyId !== '24a3a0a99fc82413151144cf840fcbca9a36f097') throw new Error('Only the unused key created during this rotation can be removed.');
  const response = await fetch(`${base}/${keyId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok && response.status !== 404) throw new Error('Unused key revocation failed.');
  console.log('Unused replacement key revoked.');
} else if (mode === '--revoke-old') {
  const saved = JSON.parse(await readFile(path, 'utf8'));
  if (saved.oldKeyId === current.private_key_id) throw new Error('The old key is still configured locally.');
  const response = await fetch(`${base}/${saved.oldKeyId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok && response.status !== 404) throw new Error(`Key revocation failed (${response.status}).`);
  await writeFile(path, JSON.stringify({ ...saved, revokedAt: Date.now() }));
  console.log('Old service-account key revoked.');
} else throw new Error('Use --create or --revoke-old.');
