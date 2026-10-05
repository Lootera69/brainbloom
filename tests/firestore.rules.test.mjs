import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, test } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

let env;
const draft = { createdBy: 'writer', createdAt: 1, published: false, reviewStatus: 'draft', title: 'Draft', completedBy: 0, reviewedBy: null, reviewComments: null };
const publicSettings = ['pricing', 'lesson-groups', 'daily-puzzle', 'weekly-cipher', 'cipher-history', 'events'];
const dbFor = (uid, verified = true, extra = {}) => env.authenticatedContext(uid, { email: `${uid}@example.test`, email_verified: verified, ...extra }).firestore();

before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('A local Firestore emulator is required.');
  env = await initializeTestEnvironment({ projectId: 'demo-security', firestore: { rules: await readFile('firestore.rules', 'utf8') } });
});
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const seed = {
      'staffAccess/admin': { role: 'admin', enabled: true },
      'staffAccess/writer': { role: 'contributor', enabled: true },
      'staffAccess/disabled': { role: 'admin', enabled: false },
      'staffInvites/private': { email: 'person@example.test', role: 'admin' },
      'settings/studio': { codes: [{ code: 'legacy-code', password: 'exposed' }] },
      'settings/cron-hourly': { delivered: true },
      'puzzles/draft': draft,
      'puzzles/published': { ...draft, published: true, reviewStatus: 'approved' },
      'users/player': { xp: 20 },
      ...Object.fromEntries(publicSettings.map((id) => [`settings/${id}`, { version: 1 }])),
    };
    await Promise.all(Object.entries(seed).map(([path, value]) => setDoc(doc(db, path), value)));
  });
});

for (const identity of ['guest', 'player', 'disabled', 'unverified', 'forged']) {
  test(`${identity} cannot modify global content or settings`, async () => {
    const db = identity === 'guest' ? env.unauthenticatedContext().firestore()
      : identity === 'unverified' ? dbFor('admin', false)
      : identity === 'forged' ? dbFor('player', true, { admin: true, role: 'admin' }) : dbFor(identity);
    await assertFails(setDoc(doc(db, 'puzzles/injected'), draft));
    await assertFails(updateDoc(doc(db, 'puzzles/published'), { title: 'Replaced' }));
    await assertFails(deleteDoc(doc(db, 'puzzles/published')));
    for (const id of publicSettings) await assertFails(setDoc(doc(db, 'settings', id), { poisoned: true }));
  });
}

test('public reads remain available while credentials and cron markers are private', async () => {
  const db = env.unauthenticatedContext().firestore();
  for (const id of publicSettings) await assertSucceeds(getDoc(doc(db, 'settings', id)));
  await assertSucceeds(getDoc(doc(db, 'puzzles/published')));
  await assertFails(getDoc(doc(db, 'settings/studio')));
  await assertFails(getDoc(doc(db, 'settings/cron-hourly')));
  await assertFails(getDocs(collection(db, 'settings')));
  await assertFails(getDocs(query(collection(db, 'settings'), where('codes', '!=', null))));
});

for (const uid of ['player', 'writer', 'admin']) {
  test(`${uid} cannot issue invitations or change membership through Firestore`, async () => {
    const db = dbFor(uid);
    await assertFails(setDoc(doc(db, 'staffAccess', uid), { enabled: true, role: 'admin' }));
    await assertFails(deleteDoc(doc(db, 'staffAccess', uid)));
    await assertFails(setDoc(doc(db, 'staffInvites/fake'), { role: 'admin' }));
    await assertFails(getDoc(doc(db, 'staffInvites/private')));
    await assertFails(getDocs(collection(db, 'staffAccess')));
    await assertFails(getDoc(doc(db, 'staffAccess/disabled')));
    await assertSucceeds(getDoc(doc(db, 'staffAccess', uid)));
    await assertFails(getDoc(doc(db, 'settings/studio')));
  });
}

test('profile role forgery grants no authority', async () => {
  const db = dbFor('player');
  await assertSucceeds(updateDoc(doc(db, 'users/player'), { role: 'admin', admin: true }));
  await assertFails(updateDoc(doc(db, 'settings/pricing'), { version: 2 }));
});

test('verified enabled admin can manage published content and public settings', async () => {
  const db = dbFor('admin');
  await assertSucceeds(setDoc(doc(db, 'puzzles/new'), { ...draft, published: true, reviewStatus: 'approved' }));
  await assertSucceeds(updateDoc(doc(db, 'puzzles/published'), { title: 'Reviewed' }));
  await assertSucceeds(deleteDoc(doc(db, 'puzzles/new')));
  for (const id of publicSettings) await assertSucceeds(updateDoc(doc(db, 'settings', id), { version: 2 }));
  await assertFails(setDoc(doc(db, 'settings/studio'), { codes: [] }));
});

test('revocation blocks an already signed-in admin immediately', async () => {
  const db = dbFor('admin');
  await assertSucceeds(updateDoc(doc(db, 'settings/pricing'), { version: 2 }));
  await env.withSecurityRulesDisabled((context) => updateDoc(doc(context.firestore(), 'staffAccess/admin'), { enabled: false }));
  await assertFails(updateDoc(doc(db, 'settings/pricing'), { version: 3 }));
});

test('contributor can create, edit, submit and delete own unpublished draft', async () => {
  const db = dbFor('writer');
  await assertSucceeds(setDoc(doc(db, 'puzzles/new'), draft));
  await assertSucceeds(updateDoc(doc(db, 'puzzles/new'), { title: 'Edited', reviewStatus: 'pending' }));
  await assertSucceeds(deleteDoc(doc(db, 'puzzles/new')));
  await assertSucceeds(updateDoc(doc(db, 'settings/lesson-groups'), { version: 2 }));
});

for (const changes of [{ published: true }, { createdBy: 'admin' }, { createdAt: 2 }, { completedBy: 99 }, { reviewStatus: 'approved' }, { reviewStatus: 'rejected' }, { reviewedBy: 'admin' }, { reviewNote: 'Forged' }, { reviewComments: [{ author: 'admin', text: 'Forged', timestamp: 2 }] }]) {
  test(`contributor cannot forge ${Object.keys(changes)[0]}=${JSON.stringify(Object.values(changes)[0])}`, async () => {
    const db = dbFor('writer');
    await assertFails(updateDoc(doc(db, 'puzzles/draft'), changes));
    if (!('createdAt' in changes)) await assertFails(setDoc(doc(db, 'puzzles/new'), { ...draft, ...changes, createdBy: changes.createdBy ?? 'writer' }));
  });
}

test('contributor cannot change other drafts, published content, pricing or invitations', async () => {
  const db = dbFor('writer');
  await assertFails(updateDoc(doc(db, 'puzzles/published'), { title: 'Changed' }));
  await assertFails(deleteDoc(doc(db, 'puzzles/published')));
  await assertFails(setDoc(doc(db, 'puzzles/other'), { ...draft, createdBy: 'other' }));
  await assertFails(updateDoc(doc(db, 'settings/pricing'), { version: 2 }));
});

test('contributor can append their own comment but cannot rewrite review history', async () => {
  const db = dbFor('writer');
  const comment = { text: 'Ready for review', author: 'writer', timestamp: 123 };
  await assertSucceeds(updateDoc(doc(db, 'puzzles/draft'), { reviewComments: [comment] }));
  await assertSucceeds(updateDoc(doc(db, 'puzzles/draft'), { reviewComments: [comment, { ...comment, text: 'Second' }] }));
  await assertFails(updateDoc(doc(db, 'puzzles/draft'), { reviewComments: [] }));
});

test('editing an approved unpublished draft requires a fresh review', async () => {
  await env.withSecurityRulesDisabled((context) => updateDoc(doc(context.firestore(), 'puzzles/draft'), { reviewStatus: 'approved', reviewedBy: 'admin' }));
  const db = dbFor('writer');
  await assertFails(updateDoc(doc(db, 'puzzles/draft'), { title: 'Unreviewed edit' }));
  await assertSucceeds(updateDoc(doc(db, 'puzzles/draft'), { title: 'Fresh draft', reviewStatus: 'draft' }));
});

test('owner profile and push token writes remain available; other accounts are blocked', async () => {
  const db = dbFor('player');
  await assertSucceeds(updateDoc(doc(db, 'users/player'), { xp: 30 }));
  await assertSucceeds(setDoc(doc(db, 'users/player/pushTokens/device'), { token: 'test' }));
  await assertFails(getDoc(doc(dbFor('writer'), 'users/player')));
  await assertFails(setDoc(doc(dbFor('writer'), 'users/player/pushTokens/device'), { token: 'attack' }));
});
