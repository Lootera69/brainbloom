import { createHash } from 'node:crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/push-send';
import { cipherPhase, cipherWeek, publicWeeklyCipher, readScoringPuzzle, selectCipher } from '@/lib/server/player-puzzles';
import { requirePlayer } from '@/lib/server/player-http';
import { privateJson } from '@/lib/server/staff-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const app = getAdminApp();
  if (!app) return privateJson({ error: 'Ciphers are unavailable.' }, 503);
  try {
    const now = Date.now();
    const db = getFirestore(app);
    const [records, pin] = await Promise.all([
      db.collection('puzzles').where('type', '==', 'cipher').get(),
      db.doc('settings/weekly-cipher').get(),
    ]);
    const puzzles = records.docs.map((doc) => readScoringPuzzle(doc.id, doc.data())).filter((p) => p !== null);
    const weekStart = cipherWeek(now);
    const puzzle = puzzles.find((p) => p.id === selectCipher(puzzles, now, pin.data()));
    let solved = false;
    if (puzzle && cipherPhase(now) !== 'closed' && request.headers.has('authorization')) {
      const actor = await requirePlayer(request);
      if (!actor.ok) return actor.response;
      const awardId = createHash('sha256').update(JSON.stringify(['cipher', weekStart])).digest('hex');
      const [award, deletion] = await Promise.all([
        db.doc(`playerProgress/${actor.uid}/awards/${awardId}`).get(), db.doc(`accountDeletions/${actor.uid}`).get(),
      ]);
      if (deletion.exists) return privateJson({ error: 'Account deletion is in progress.' }, 403);
      solved = award.data()?.puzzleId === puzzle.id;
    }
    return privateJson({ version: 1, serverTime: now, phase: cipherPhase(now), weekStart,
      setBy: pin.data()?.weekStart === weekStart && pin.data()?.puzzleId === puzzle?.id ? 'admin' : 'auto',
      puzzle: puzzle ? publicWeeklyCipher(puzzle, now, solved) : null,
    });
  } catch {
    return privateJson({ error: 'Ciphers are unavailable. Please retry.' }, 503);
  }
}
