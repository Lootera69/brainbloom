import { mkdir, writeFile } from 'node:fs/promises';
import { loadEnvFile } from 'node:process';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { migrateLegacyProgress } from '@/lib/server/player-migration';
import { scoringPuzzleSchema, readScoringPuzzle } from '@/lib/server/player-puzzles';
import { readServiceAccount } from '@/lib/server/service-account';

loadEnvFile('.env.local');
const account = readServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT);
if (account.project_id !== 'brainbloom-40') throw new Error('Unexpected project.');
const credential = cert(account);
const db = getFirestore(initializeApp({ credential, projectId: account.project_id }));
const [users, puzzles, config] = await Promise.all([
  db.collection('users').get(), db.collection('puzzles').where('published', '==', true).get(),
  db.doc('settings/player-security').get(),
]);
const invalidUsers: unknown[] = [];
const invalidPuzzles: unknown[] = [];
const now = Date.now();
for (const user of users.docs) {
  try { migrateLegacyProgress(JSON.parse(JSON.stringify(user.data())), now); }
  catch (error) { invalidUsers.push({ uid: user.id, error: String(error), data: user.data() }); }
}
for (const puzzle of puzzles.docs) {
  if (!readScoringPuzzle(puzzle.id, puzzle.data())) {
    invalidPuzzles.push({ id: puzzle.id, issues: scoringPuzzleSchema.safeParse(puzzle.data()).error?.issues });
  }
}
const { access_token: token } = await credential.getAccessToken();
const authResponse = await fetch(`https://identitytoolkit.googleapis.com/admin/v2/projects/${account.project_id}/config`, {
  headers: { Authorization: `Bearer ${token}` },
});
const auth = authResponse.ok ? await authResponse.json() : null;
await mkdir('.private-invites', { recursive: true });
await writeFile('.private-invites/player-preflight.json', JSON.stringify({
  invalidUsers, invalidPuzzles, config: config.data(), checkedAt: now,
}, null, 2));
console.log(JSON.stringify({ users: users.size, publishedPuzzles: puzzles.size, invalidUsers: invalidUsers.length,
  invalidPuzzles: invalidPuzzles.length, configExists: config.exists, rewardsEnabled: config.data()?.enabled === true,
  anonymousEnabled: auth?.signIn?.anonymous?.enabled ?? null, authConfigStatus: authResponse.status,
  report: '.private-invites/player-preflight.json' }));
