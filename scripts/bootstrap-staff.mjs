import { parseArgs } from 'node:util';
import { randomBytes, createHash } from 'node:crypto';
import { mkdir, writeFile, chmod, unlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { userInfo } from 'node:os';
import { execFileSync } from 'node:child_process';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const { values } = parseArgs({ options: {
  project: { type: 'string' }, email: { type: 'string' }, 'disable-uid': { type: 'string' }, apply: { type: 'boolean', default: false },
} });
let app;
let output;
try {
  if (!values.project || !/^[a-z][a-z0-9-]+$/.test(values.project)) throw new Error('Specify --project with the intended Firebase project ID.');
  if (!!values.email === !!values['disable-uid']) throw new Error('Specify exactly one of --email or --disable-uid.');
  const email = values.email?.trim().toLowerCase();
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error('Use a valid email.');
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('Set server-only FIREBASE_SERVICE_ACCOUNT before running this tool.');
  let credentials;
  try { credentials = JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')); }
  catch { throw new Error('Service account configuration is invalid.'); }
  if (credentials.project_id !== values.project) throw new Error('Service account project does not match --project.');
  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Do not mix emulator settings with this production administration tool.');
  app = initializeApp({ credential: cert(credentials), projectId: values.project }, 'staff-bootstrap');
  const db = getFirestore(app);
  if (values['disable-uid']) {
    const uid = values['disable-uid'];
    if (uid.includes('/') || uid.length > 128) throw new Error('Invalid UID.');
    const member = db.doc(`staffAccess/${uid}`);
    const snap = await member.get();
    if (!snap.exists) throw new Error('No membership found for that UID.');
    if (!values.apply) console.log('Dry run: membership would be disabled and Firebase refresh tokens revoked. No writes made.');
    else {
      await member.update({ enabled: false, disabledAt: Date.now() });
      try { await getAuth(app).revokeRefreshTokens(uid); }
      catch { throw new Error('Membership was disabled, but refresh-token revocation failed. Retry this operation.'); }
      console.log('Membership disabled and refresh tokens revoked.');
    }
  } else {
    const active = await db.collection('staffAccess').where('role', '==', 'admin').get();
    if (active.docs.some((d) => d.data().enabled === true)) throw new Error('An administrator already exists. Create invitations from Studio Settings.');
    const pending = await db.collection('staffInvites').where('role', '==', 'admin').get();
    if (pending.docs.some((d) => d.data().enabled === true && !d.data().redeemedBy && d.data().expiresAt > Date.now())) throw new Error('A live administrator invitation already exists. Use its saved code or cancel it through trusted administration.');
    if (!values.apply) console.log('Dry run: one email-bound administrator invitation would be created, valid for seven days. No writes made.');
    else {
      const folder = resolve('.private-invites');
      await mkdir(folder, { recursive: true, mode: 0o700 });
      if (process.platform === 'win32') {
        const account = process.env.USERDOMAIN ? `${process.env.USERDOMAIN}\\${userInfo().username}` : userInfo().username;
        execFileSync('icacls.exe', [folder, '/inheritance:r', '/grant:r', `${account}:(OI)(CI)F`], { stdio: 'ignore', windowsHide: true });
      } else await chmod(folder, 0o700);
      const code = randomBytes(24).toString('base64url');
      const id = createHash('sha256').update(code).digest('hex');
      const now = Date.now();
      const data = { email, role: 'admin', enabled: true, createdBy: 'trusted-bootstrap', createdAt: now, expiresAt: now + 7 * 86400000 };
      output = join(folder, `${now}.json`);
      await writeFile(output, JSON.stringify({ project: values.project, ...data, code }, null, 2), { flag: 'wx', mode: 0o600 });
      await db.doc(`staffInvites/${id}`).create(data);
      console.log(`Administrator invitation created. Retrieve the code privately from ${output}.`);
      output = undefined;
    }
  }
} catch (error) {
  if (output) await unlink(output).catch(() => {});
  const safeMessages = ['Specify ', 'Use a valid', 'Set server-only', 'Service account', 'Do not mix', 'Invalid UID', 'No membership', 'Membership was disabled', 'An administrator', 'A live administrator'];
  const message = error instanceof Error ? error.message : '';
  console.error(safeMessages.some((prefix) => message.startsWith(prefix)) ? message : 'Administration operation failed. No credentials were logged. Check server configuration and permissions.');
  process.exitCode = 1;
} finally {
  if (app) await deleteApp(app);
}
