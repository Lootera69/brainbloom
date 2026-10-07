import type { Puzzle } from '@/types/puzzle';
import type { PlayerAction, PlayerProgress, PlayerResponse } from '@/lib/player-contract';
import { closeAnswer, crosswordFeedback, gradeAnswer, puzzleSolution, readScoringPuzzle } from '@/lib/server/player-puzzles';

export function previewTransport(source: Puzzle, progress: PlayerProgress) {
  const puzzle = readScoringPuzzle(source.id, { ...source, published: true });
  return async (command: PlayerAction): Promise<PlayerResponse> => {
    if (!puzzle) throw new Error('This draft needs valid puzzle content before it can be previewed.');
    const snapshot = { progress, serverTime: Date.now() };
    if (command.action === 'start') return { ...snapshot, session: { id: 'preview' } };
    if (command.action !== 'answer') throw new Error('Preview does not support rewards.');
    const correct = gradeAnswer(puzzle, command.answer);
    const completed = correct || ['multiple-choice', 'true-false', 'riddle'].includes(puzzle.type);
    return { ...snapshot, correct, completed, xpEarned: 0, gemsEarned: 0, replayed: true,
      close: closeAnswer(puzzle, command.answer), cellResults: crosswordFeedback(puzzle, command.answer),
      ...(completed ? { solution: puzzleSolution(puzzle) } : {}),
    };
  };
}
