import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/push-send';
import { publicPuzzle, readScoringPuzzle } from '@/lib/server/player-puzzles';
import { privateJson } from '@/lib/server/staff-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get('id');
  const category = params.get('category');
  if (id !== null && !/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
    return privateJson({ error: 'Invalid puzzle.' }, 400);
  }
  if (category !== null && (category.length === 0 || category.length > 100 || id !== null)) {
    return privateJson({ error: 'Invalid category.' }, 400);
  }
  const app = getAdminApp();
  if (!app) return privateJson({ error: 'Puzzles are unavailable.' }, 503);
  try {
    const db = getFirestore(app);
    const documents = id === null
      ? (await db.collection('puzzles').where(category === null ? 'published' : 'category', '==', category ?? true).get()).docs
      : [await db.collection('puzzles').doc(id).get()];
    const puzzles = documents.map((doc) => readScoringPuzzle(doc.id, doc.data()))
      .filter((puzzle) => puzzle !== null).map(publicPuzzle);
    if (id !== null && puzzles.length === 0) return privateJson({ error: 'Puzzle not found.' }, 404);
    return privateJson({ version: 1, puzzles }, 200);
  } catch {
    return privateJson({ error: 'Puzzles are unavailable. Please retry.' }, 503);
  }
}
