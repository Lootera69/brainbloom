import { gunzipSync } from 'node:zlib';
import { randomBytes } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { beforeEach, expect, it, vi } from 'vitest';
import { invalidatePublishedCatalogue, publishedCandidates, publishedCatalogue } from '@/lib/server/puzzle-catalogue';

const cache = vi.hoisted(() => ({ values: new Map<string, Promise<string>>(), options: vi.fn(), invalidated: vi.fn() }));
vi.mock('next/cache', () => ({
  unstable_cache: (read: () => Promise<string>, keys: string[], options: unknown) => () => {
    cache.options(options);
    const key = JSON.stringify(keys);
    if (!cache.values.has(key)) {
      const pending = read();
      cache.values.set(key, pending);
      void pending.catch(() => cache.values.delete(key));
    }
    return cache.values.get(key);
  },
  revalidateTag: (...args: unknown[]) => { cache.invalidated(...args); cache.values.clear(); },
}));

const quiz = { type: 'multiple-choice', title: 'Question', category: 'logic', published: true,
  xpReward: 20, choices: ['A', 'B'], correctAnswer: 'B', acceptedAnswers: ['secret answer'],
  correctExplanation: 'private solution', reviewComments: ['private discussion'], createdBy: 'private author' };

function fixture(count = 501, projectId = 'demo-catalogue') {
  const docs = Array.from({ length: count }, (_, i) => ({ id: `puzzle-${String(i).padStart(5, '0')}`, raw: { ...quiz } }));
  const reads = vi.fn();
  const createQuery = (cursor: string | null = null, limit = 0) => ({
    where: vi.fn((...args: unknown[]) => { expect(args).toEqual(['published', '==', true]); return createQuery(cursor, limit); }),
    orderBy: () => createQuery(cursor, limit),
    limit: (value: number) => createQuery(cursor, value),
    startAfter: (value: string) => createQuery(value, limit),
    get: async () => {
      const page = docs.filter((doc) => cursor === null || doc.id > cursor).slice(0, limit);
      reads(page.length);
      return { docs: page.map((doc) => ({ id: doc.id, data: () => doc.raw })) };
    },
  });
  const db = { projectId, databaseId: '(default)', collection: () => createQuery() } as unknown as Firestore;
  return { db, docs, reads };
}

beforeEach(() => { cache.values.clear(); vi.clearAllMocks(); });

it('shares one paginated catalogue between concurrent and subsequent requests without rereading Firestore', async () => {
  const { db, reads } = fixture();
  const lists = await Promise.all([publishedCatalogue(db, 'demo-catalogue'), publishedCatalogue(db, 'demo-catalogue'), publishedCandidates(db, 'demo-catalogue')]);
  expect(lists.map((value) => value.length)).toEqual([501, 501, 501]);
  expect(reads.mock.calls).toEqual([[250], [250], [1]]);
  expect(await publishedCatalogue(db, 'demo-catalogue')).toHaveLength(501);
  expect(reads).toHaveBeenCalledTimes(3);
  expect(cache.options).toHaveBeenCalledWith({ revalidate: 86400, tags: ['published-puzzles:demo-catalogue:(default)'] });
  expect(lists[2][0]).toEqual({ id: 'puzzle-00000', type: 'multiple-choice', category: 'logic' });
});

it('stores only sanitized content, omitting drafts, malformed puzzles, solutions and staff information', async () => {
  const { db, docs } = fixture(3);
  docs[1].raw.published = false;
  docs[2].raw.correctAnswer = 'not a choice';
  const catalogue = await publishedCatalogue(db, 'demo-catalogue');
  expect(catalogue).toHaveLength(1);
  const encoded = await [...cache.values.values()][0];
  const stored = JSON.parse(gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8'));
  for (const key of ['correctAnswer', 'acceptedAnswers', 'correctExplanation', 'reviewComments', 'createdBy']) {
    expect(stored.puzzles[0]).not.toHaveProperty(key);
  }
});

it('invalidates every page on publishing changes and isolates different Firebase projects', async () => {
  const first = fixture(2);
  await publishedCatalogue(first.db, 'demo-catalogue');
  first.docs[0].raw.title = 'Updated title';
  expect((await publishedCatalogue(first.db, 'demo-catalogue'))[0].title).toBe('Question');
  invalidatePublishedCatalogue(first.db, 'demo-catalogue');
  expect(cache.invalidated).toHaveBeenCalledExactlyOnceWith('published-puzzles:demo-catalogue:(default)', { expire: 0 });
  expect((await publishedCatalogue(first.db, 'demo-catalogue'))[0].title).toBe('Updated title');
  const second = fixture(1, 'demo-other');
  expect(await publishedCatalogue(second.db, 'demo-other')).toHaveLength(1);
  expect(second.reads).toHaveBeenCalledOnce();
});

it('splits large content into bounded cache entries without dropping or duplicating puzzles', async () => {
  const { db, docs } = fixture(90);
  for (const doc of docs) Object.assign(doc.raw, { question: randomBytes(24000).toString('base64') });
  const catalogue = await publishedCatalogue(db, 'demo-catalogue');
  expect(catalogue.map((puzzle) => puzzle.id)).toEqual(docs.map((doc) => doc.id));
  expect(cache.values.size).toBeGreaterThan(1);
  for (const pending of cache.values.values()) expect(Buffer.byteLength(await pending)).toBeLessThanOrEqual(1_500_000);
});
