import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, test } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

let env;
const draft = { createdBy: 'writer', createdAt: 1, published: false, reviewStatus: 'draft', title: 'Draft', completedBy: 0, reviewedBy: null, reviewComments: null };
const publicSettings = ['pricing', 'lesson-groups', 'daily-puzzle', 'weekly-cipher', 'cipher-history'];
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
      'staffAccess/reviewer': { role: 'reviewer', enabled: true, status: 'active' },
      'staffAccess/disabled': { role: 'admin', enabled: false },
      'staffInvites/private': { email: 'person@example.test', role: 'admin' },
      'settings/studio': { codes: [{ code: 'legacy-code', password: 'exposed' }] },
      'settings/cron-hourly': { delivered: true },
      'settings/events': { version: 1, events: [{ question: { correctIndex: 1, factoid: 'Private answer' } }] },
      'puzzles/draft': draft,
      'puzzles/pending': { ...draft, reviewStatus: 'pending' },
      'puzzles/discussion': { ...draft, reviewStatus: 'needs-discussion' },
      'puzzles/approved': { ...draft, reviewStatus: 'approved' },
      'puzzles/published': { ...draft, published: true, reviewStatus: 'approved' },
      'users/player': { xp: 20 },
      ...Object.fromEntries(publicSettings.map((id) => [`settings/${id}`, { version: 1 }])),
    };
    await Promise.all(Object.entries(seed).map(([path, value]) => setDoc(doc(db, path), value)));
  });
});

test('anonymous clients cannot create profiles or push registrations before server admission', async () => {
  const db = env.authenticatedContext('new-guest', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
  await assertFails(setDoc(doc(db, 'users/new-guest'), { displayName: 'Guest' }));
  await assertFails(setDoc(doc(db, 'users/new-guest/pushTokens/device'), { token: 'test' }));
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users/new-guest'), { displayName: 'Old profile' });
  });
  await assertFails(updateDoc(doc(db, 'users/new-guest'), { displayName: 'Changed' }));
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'playerProgress/new-guest'), { version: 1, xp: 0 });
  });
  await assertSucceeds(updateDoc(doc(db, 'users/new-guest'), { displayName: 'Guest' }));
  await assertSucceeds(setDoc(doc(db, 'users/new-guest/pushTokens/device'), { token: 'test' }));
});

for (const identity of ['guest', 'player', 'admin']) {
  test(`${identity} cannot read, modify or reset guest abuse counters`, async () => {
    const db = identity === 'guest' ? env.unauthenticatedContext().firestore() : dbFor(identity);
    await assertFails(getDoc(doc(db, 'playerAbuse/network')));
    await assertFails(getDocs(collection(db, 'playerAbuse')));
    await assertFails(setDoc(doc(db, 'playerAbuse/network'), { tokens: 100000 }));
    await assertFails(deleteDoc(doc(db, 'playerAbuse/network')));
  });
}

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
  await assertFails(getDoc(doc(db, 'puzzles/published')));
  await assertFails(getDoc(doc(db, 'puzzles/draft')));
  await assertFails(getDoc(doc(db, 'settings/studio')));
  await assertFails(getDoc(doc(db, 'settings/cron-hourly')));
  await assertFails(getDocs(collection(db, 'settings')));
  await assertFails(getDocs(query(collection(db, 'settings'), where('codes', '!=', null))));
});

for (const uid of ['player', 'writer', 'reviewer', 'admin']) {
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

const review = (reviewStatus = 'approved') => ({ reviewStatus, reviewedBy: 'reviewer', lastModifiedBy: 'reviewer', updatedAt: 123 });

for (const status of ['approved', 'rejected', 'needs-discussion']) {
  test(`reviewer can mark submitted puzzles ${status} without changing content`, async () => {
    const db = dbFor('reviewer');
    for (const id of ['pending', 'discussion']) {
      await assertSucceeds(updateDoc(doc(db, 'puzzles', id), {
        ...review(status), reviewNote: 'Reviewed for clarity',
        reviewComments: [{ author: 'reviewer', text: 'Reviewed for clarity', timestamp: 123 }],
      }));
      const saved = (await getDoc(doc(db, 'puzzles', id))).data();
      if (saved.title !== draft.title || saved.published !== false) throw new Error('Review changed content.');
    }
  });
}

test('reviewer can query submissions but cannot create, delete, publish or edit content', async () => {
  const db = dbFor('reviewer');
  await assertSucceeds(getDocs(query(collection(db, 'puzzles'), where('published', '==', false), where('reviewStatus', 'in', ['pending', 'needs-discussion']))));
  await assertFails(setDoc(doc(db, 'puzzles/new'), { ...draft, createdBy: 'reviewer' }));
  await assertFails(deleteDoc(doc(db, 'puzzles/pending')));
  for (const change of [{ title: 'Changed' }, { correctAnswer: 'Changed' }, { published: true }, { createdBy: 'reviewer' }, { completedBy: 999 }]) {
    await assertFails(updateDoc(doc(db, 'puzzles/pending'), { ...review(), ...change }));
  }
  for (const id of publicSettings) await assertFails(updateDoc(doc(db, 'settings', id), { version: 2 }));
});

for (const id of ['draft', 'approved', 'published']) {
  test(`reviewer cannot review ${id} puzzles`, async () => {
    await assertFails(updateDoc(doc(dbFor('reviewer'), 'puzzles', id), review()));
  });
}

test('reviewer cannot forge the actor or replace another review comment', async () => {
  const previous = { author: 'writer', text: 'Please review', timestamp: 1 };
  await env.withSecurityRulesDisabled((context) => updateDoc(doc(context.firestore(), 'puzzles/pending'), { reviewComments: [previous] }));
  const db = dbFor('reviewer');
  for (const change of [
    { reviewedBy: 'admin' }, { lastModifiedBy: 'admin' }, { reviewStatus: 'draft' },
    { reviewComments: [{ author: 'admin', text: 'Approved', timestamp: 123 }] },
    { reviewComments: [] }, { reviewNote: 'x'.repeat(2001) },
    { reviewComments: [previous, { author: 'reviewer', text: 'Approved', timestamp: 'bad' }] },
  ]) await assertFails(updateDoc(doc(db, 'puzzles/pending'), { ...review(), ...change }));
  await assertSucceeds(updateDoc(doc(db, 'puzzles/pending'), {
    ...review(), reviewComments: [previous, { author: 'reviewer', text: 'Approved', timestamp: 123 }],
  }));
});

for (const status of ['frozen', 'removed']) {
  test(`${status} membership denies contributor and reviewer writes while preserving player access`, async () => {
    const reviewerDb = dbFor('reviewer');
    const writerDb = dbFor('writer');
    await assertSucceeds(updateDoc(doc(reviewerDb, 'puzzles/pending'), review('needs-discussion')));
    await assertSucceeds(updateDoc(doc(writerDb, 'puzzles/draft'), { title: 'Before freeze' }));
    await env.withSecurityRulesDisabled(async (context) => {
      for (const uid of ['writer', 'reviewer']) await updateDoc(doc(context.firestore(), 'staffAccess', uid), { status, enabled: false });
    });
    await assertFails(updateDoc(doc(reviewerDb, 'puzzles/pending'), review()));
    await assertFails(updateDoc(doc(writerDb, 'puzzles/draft'), { title: 'After freeze' }));
    await assertSucceeds(setDoc(doc(writerDb, 'users/writer'), { displayName: 'Writer' }));
    await assertSucceeds(getDoc(doc(writerDb, 'staffAccess/writer')));
    if (status === 'frozen') {
      await env.withSecurityRulesDisabled(async (context) => {
        for (const uid of ['writer', 'reviewer']) await updateDoc(doc(context.firestore(), 'staffAccess', uid), { status: 'active', enabled: true });
      });
      await assertSucceeds(updateDoc(doc(reviewerDb, 'puzzles/pending'), review()));
      await assertSucceeds(updateDoc(doc(writerDb, 'puzzles/draft'), { title: 'After unfreeze' }));
    }
  });
}

test('profile role forgery grants no authority', async () => {
  const db = dbFor('player');
  await assertFails(updateDoc(doc(db, 'users/player'), { role: 'admin', admin: true }));
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
  await assertSucceeds(updateDoc(doc(db, 'puzzles/new'), { title: 'Edited' }));
  await assertSucceeds(updateDoc(doc(db, 'puzzles/new'), { reviewStatus: 'pending' }));
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

test('changing submitted content sends it back to draft even if timestamps are forged', async () => {
  const db = dbFor('writer');
  await assertFails(updateDoc(doc(db, 'puzzles/pending'), { title: 'Unreviewed replacement', updatedAt: 1 }));
  await assertSucceeds(updateDoc(doc(db, 'puzzles/pending'), { title: 'Revised draft', reviewStatus: 'draft', updatedAt: 1 }));
  await assertSucceeds(updateDoc(doc(db, 'puzzles/pending'), { reviewStatus: 'pending', updatedAt: 1 }));
});

test('owner profile and push token writes remain available; other accounts are blocked', async () => {
  const db = dbFor('player');
  await assertSucceeds(updateDoc(doc(db, 'users/player'), { displayName: 'Player', theme: 'dark' }));
  await assertSucceeds(setDoc(doc(db, 'users/player/pushTokens/device'), { token: 'test' }));
  await assertFails(getDoc(doc(dbFor('writer'), 'users/player')));
  await assertFails(setDoc(doc(dbFor('writer'), 'users/player/pushTokens/device'), { token: 'attack' }));
});

for (const uid of ['player', 'writer', 'reviewer', 'admin']) {
  test(`${uid} cannot assign rewards, forge server receipts, or reset progress`, async () => {
    const db = dbFor(uid);
    for (const data of [{ xp: 9999 }, { gems: 9999 }, { hearts: 5 }, { tier: 'premium' }, { subscriptionExpiry: 9999999999999 },
      { weeklyXp: 9999 }, { completedPuzzleIds: ['injected'] }, { lastRewardClaim: null }, { timeZone: 'UTC', xp: 5 }]) {
      await assertFails(setDoc(doc(db, 'users', uid), data, { merge: true }));
    }
    for (const path of [`playerProgress/${uid}`, `playerProgress/${uid}/sessions/fake`, `playerProgress/${uid}/awards/fake`,
      `playerProgress/${uid}/receipts/fake`, `playerMigrations/fake`, 'settings/player-security']) {
      await assertFails(setDoc(doc(db, path), { xp: 9999, enabled: true, migrationComplete: true }));
      await assertFails(getDoc(doc(db, path)));
    }
    await assertFails(deleteDoc(doc(db, 'users', uid)));
    await assertSucceeds(setDoc(doc(db, 'users', uid), { displayName: 'Learner', soundEnabled: false }, { merge: true }));
  });
}

test('profile-only updates reject oversized and ill-typed fields', async () => {
  const db = dbFor('player');
  for (const value of [{ displayName: 'a'.repeat(101) }, { theme: 'injected' }, { soundEnabled: 'false' }, { avatarId: { admin: true } }]) {
    await assertFails(updateDoc(doc(db, 'users/player'), value));
  }
});

for (const status of ['pending', 'complete']) {
  test(`a ${status} deletion blocks profile recreation, token writes and staff changes`, async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'accountDeletions/admin'), { status });
      await setDoc(doc(context.firestore(), 'accountDeletions/player'), { status });
    });
    const db = dbFor('player');
    await assertFails(setDoc(doc(db, 'users/player'), { xp: 5 }));
    await assertFails(setDoc(doc(db, 'users/player/pushTokens/new'), { token: 'test' }));
    await assertFails(deleteDoc(doc(db, 'accountDeletions/player')));
    await assertFails(getDoc(doc(db, 'accountDeletions/player')));
    await assertFails(updateDoc(doc(dbFor('admin'), 'settings/pricing'), { version: 2 }));
    await assertFails(updateDoc(doc(dbFor('admin'), 'puzzles/published'), { title: 'Changed' }));
  });
}

for (const identity of ['guest', 'player', 'disabled', 'unverified', 'forged']) {
  test(`${identity} cannot download puzzle answers or drafts`, async () => {
    const db = identity === 'guest' ? env.unauthenticatedContext().firestore()
      : identity === 'unverified' ? dbFor('admin', false)
      : identity === 'forged' ? dbFor('player', true, { admin: true, role: 'admin' }) : dbFor(identity);
    for (const id of ['published', 'draft', 'pending']) await assertFails(getDoc(doc(db, 'puzzles', id)));
    await assertFails(getDocs(query(collection(db, 'puzzles'), where('published', '==', true))));
  });
}

for (const uid of ['writer', 'reviewer', 'admin']) {
  test(`${uid} retains authorized Studio content reads`, async () => {
    const db = dbFor(uid);
    await assertSucceeds(getDoc(doc(db, 'puzzles/published')));
    await assertSucceeds(getDoc(doc(db, 'puzzles/draft')));
    await assertSucceeds(getDocs(collection(db, 'puzzles')));
  });
}

for (const identity of ['guest', 'player', 'writer', 'reviewer', 'disabled', 'unverified', 'forged']) {
  test(`${identity} cannot read or modify raw Moment answers`, async () => {
    const db = identity === 'guest' ? env.unauthenticatedContext().firestore()
      : identity === 'unverified' ? dbFor('admin', false)
      : identity === 'forged' ? dbFor('player', true, { admin: true, role: 'admin' }) : dbFor(identity);
    await assertFails(getDoc(doc(db, 'settings/events')));
    await assertFails(setDoc(doc(db, 'settings/events'), { events: [] }));
  });
}

test('active verified admin retains access to authored Moment answers', async () => {
  const db = dbFor('admin');
  await assertSucceeds(getDoc(doc(db, 'settings/events')));
  await assertSucceeds(updateDoc(doc(db, 'settings/events'), { version: 2 }));
});
