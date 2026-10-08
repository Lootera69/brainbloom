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
    const catalogue = await publishedCatalogue(db, app.options.projectId!);
    const puzzles = category === null ? catalogue : catalogue.filter((puzzle) => puzzle.category === category);
    return privateJson({ version: 1, puzzles }, 200);
  } catch {
    return privateJson({ error: 'Puzzles are unavailable. Please retry.' }, 503);
  }
}
