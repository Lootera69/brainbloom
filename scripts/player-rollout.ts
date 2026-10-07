import { loadEnvFile } from 'node:process';
import { mkdir, writeFile } from 'node:fs/promises';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readServiceAccount } from '@/lib/server/service-account';

process.on('uncaughtException', () => { console.error('Rollout operation failed. No credential values were logged.'); process.exit(1); });
loadEnvFile('.env.local');
const account = readServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT);
if (account.project_id !== 'brainbloom-40') throw new Error('Unexpected project.');
const credential = cert(account);
const db = getFirestore(initializeApp({ credential, projectId: account.project_id }));
const mode = process.argv[2];
const token = (await credential.getAccessToken()).access_token;
const authUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${account.project_id}/config`;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

if (mode === '--anonymous') {
  const response = await fetch(`${authUrl}?updateMask=signIn.anonymous.enabled`, {
    method: 'PATCH', headers, body: JSON.stringify({ signIn: { anonymous: { enabled: true } } }),
  });
  if (!response.ok) { console.error(`Anonymous configuration failed (${response.status}).`); process.exit(1); }
  const verify = await fetch(authUrl, { headers });
  const data = verify.ok ? await verify.json() : null;
  if (data?.signIn?.anonymous?.enabled !== true) throw new Error('Anonymous configuration was not confirmed.');
  console.log('Anonymous Firebase sign-in enabled and verified.');
} else if (mode === '--maintenance') {
  await db.doc('settings/player-security').set({ enabled: false, version: 1, paymentsEnabled: false, allowAnonymous: true }, { merge: true });
  console.log('Reward maintenance enabled.');
} else if (mode === '--enable') {
  await db.runTransaction(async (tx) => {
    const ref = db.doc('settings/player-security');
    const data = (await tx.get(ref)).data();
    if (data?.migrationComplete !== true || data?.version !== 1 || typeof data?.migrationId !== 'string') throw new Error('Migration is incomplete.');
    const migration = await tx.get(db.doc(`playerMigrations/${data.migrationId}`));
    if (migration.data()?.status !== 'complete') throw new Error('Migration receipt is missing.');
    tx.set(ref, { enabled: true, allowAnonymous: true, paymentsEnabled: false }, { merge: true });
  });
  console.log('Verified rewards enabled, including anonymous guests; payments remain disabled.');
} else if (mode === '--status') {
  const [auth, config, users, progress] = await Promise.all([
    fetch(authUrl, { headers }), db.doc('settings/player-security').get(),
    db.collection('users').count().get(), db.collection('playerProgress').count().get(),
  ]);
  const data = auth.ok ? await auth.json() : null;
  console.log(JSON.stringify({ anonymousEnabled: data?.signIn?.anonymous?.enabled === true,
    rewardsEnabled: config.data()?.enabled === true, migrationComplete: config.data()?.migrationComplete === true,
    users: users.data().count, verifiedProfiles: progress.data().count }));
} else if (mode === '--backup-rules') {
  const release = await fetch(`https://firebaserules.googleapis.com/v1/projects/${account.project_id}/releases/cloud.firestore`, { headers });
  if (!release.ok) { console.error(`Rules backup failed (${release.status}).`); process.exit(1); }
  const active = await release.json();
  const rules = await fetch(`https://firebaserules.googleapis.com/v1/${active.rulesetName}`, { headers });
  if (!rules.ok) throw new Error('Cannot read current rules.');
  const data = await rules.json();
  await mkdir('.private-invites', { recursive: true });
  await writeFile('.private-invites/pre-player-rules.json', JSON.stringify({ release: active, rules: data }, null, 2));
  console.log('Current rules backed up privately.');
} else throw new Error('Choose --status, --anonymous, --backup-rules, --maintenance, or --enable.');
