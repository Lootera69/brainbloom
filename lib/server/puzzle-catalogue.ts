import { gzipSync, gunzipSync } from 'node:zlib';
import { unstable_cache, revalidateTag } from 'next/cache';
import { FieldPath, type Firestore } from 'firebase-admin/firestore';
import { publicPuzzle, readScoringPuzzle, type PuzzleCandidate } from '@/lib/server/player-puzzles';

export type CataloguePuzzle = Record<string, unknown> & PuzzleCandidate;
const pageSize = 250;
const maxCachedBytes = 1_500_000;
const inFlight = new WeakMap<Firestore, Promise<CataloguePuzzle[]>>();
const tagFor = (db: Firestore, projectId: string) => `published-puzzles:${projectId}:${db.databaseId}`;

async function readPage(db: Firestore, projectId: string, cursor: string | null) {
  const encoded = await unstable_cache(async () => {
    let query = db.collection('puzzles').where('published', '==', true).orderBy(FieldPath.documentId()).limit(pageSize);
    if (cursor !== null) query = query.startAfter(cursor);
    const snapshot = await query.get();
    const projected = snapshot.docs.map((doc) => {
      const puzzle = readScoringPuzzle(doc.id, doc.data());
      return puzzle ? publicPuzzle(puzzle) : null;
    });
    let count = snapshot.docs.length;
    for (;;) {
      const next = count > 0 && (count < snapshot.docs.length || snapshot.docs.length === pageSize)
        ? snapshot.docs[count - 1].id : null;
      const payload = gzipSync(JSON.stringify({ puzzles: projected.slice(0, count).filter((p) => p !== null), next })).toString('base64');
      if (Buffer.byteLength(payload) <= maxCachedBytes) return payload;
      if (count <= 1) throw new Error('Published puzzle exceeds the catalogue cache limit.');
      count = Math.ceil(count / 2);
    }
  }, ['published-catalogue-v1', projectId, db.databaseId, cursor ?? ''], {
    revalidate: 86400, tags: [tagFor(db, projectId)],
  })();
  return JSON.parse(gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8')) as {
    puzzles: CataloguePuzzle[]; next: string | null;
  };
}

export function publishedCatalogue(db: Firestore, projectId: string): Promise<CataloguePuzzle[]> {
  if (!projectId) return Promise.reject(new Error('Catalogue project is not configured.'));
  const pending = inFlight.get(db);
  if (pending) return pending;
  const load = (async () => {
    const puzzles: CataloguePuzzle[] = [];
    let cursor: string | null = null;
    do {
      const page = await readPage(db, projectId, cursor);
      puzzles.push(...page.puzzles);
      cursor = page.next;
    } while (cursor !== null);
    return puzzles;
  })();
  inFlight.set(db, load);
  const clear = () => { if (inFlight.get(db) === load) inFlight.delete(db); };
  void load.then(clear, clear);
  return load;
}

export async function publishedCandidates(db: Firestore, projectId: string): Promise<PuzzleCandidate[]> {
  return (await publishedCatalogue(db, projectId)).map(({ id, type, category }) => ({ id, type, category }));
}

export function invalidatePublishedCatalogue(db: Firestore, projectId: string) {
  if (!projectId) throw new Error('Catalogue project is not configured.');
  inFlight.delete(db);
  revalidateTag(tagFor(db, projectId), { expire: 0 });
}
