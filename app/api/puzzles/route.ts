import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/push-send';
import { publicPuzzle, readScoringPuzzle } from '@/lib/server/player-puzzles';
import { privateJson } from '@/lib/server/staff-auth';
import { publishedCatalogue } from '@/lib/server/puzzle-catalogue';

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
    if (id !== null) {
      const document = await db.collection('puzzles').doc(id).get();
      const puzzle = readScoringPuzzle(document.id, document.data());
      return puzzle ? privateJson({ version: 1, puzzles: [publicPuzzle(puzzle)] })
        : privateJson({ error: 'Puzzle not found.' }, 404);
    }
    if (category !== null) {
      // Category browsing is the normal player path. Keep this query scoped to
      // the requested category instead of materialising the entire published
      // bank and filtering it in memory. `readScoringPuzzle` also enforces the
      // published/schema contract, so this stays on a single auto-indexed
      // category field without requiring a composite index.
      const snapshot = await db.collection('puzzles').where('category', '==', category).get();
      const puzzles = snapshot.docs.flatMap((document) => {
        const puzzle = readScoringPuzzle(document.id, document.data());
        return puzzle ? [publicPuzzle(puzzle)] : [];
      });
      return privateJson({ version: 1, puzzles }, 200);
    }
    const puzzles = await publishedCatalogue(db, app.options.projectId!);
    return privateJson({ version: 1, puzzles }, 200);
  } catch {
    return privateJson({ error: 'Puzzles are unavailable. Please retry.' }, 503);
  }
}
