import { beforeEach, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/puzzles/route';
import { publicPuzzle, readScoringPuzzle } from '@/lib/server/player-puzzles';

const mocks = vi.hoisted(() => ({ get: vi.fn(), where: vi.fn(), doc: vi.fn(), catalogue: vi.fn() }));
vi.mock('@/lib/server/puzzle-catalogue', () => ({ publishedCatalogue: mocks.catalogue }));
vi.mock('@/lib/push-send', () => ({ getAdminApp: () => ({ options: { projectId: 'demo-catalogue' } }) }));
vi.mock('firebase-admin/firestore', () => ({ getFirestore: () => ({
  collection: () => ({ where: mocks.where, doc: mocks.doc }),
}) }));
const puzzle = { type: 'multiple-choice', title: 'Quiz', category: 'logic',
  choices: ['one', 'two'], correctAnswer: 'two', xpReward: 20, published: true,
  acceptedAnswers: ['2'], correctExplanation: 'private explanation',
  reviewedBy: 'private reviewer', reviewComments: [{ text: 'private comment' }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.where.mockReturnValue({ get: mocks.get });
  mocks.doc.mockReturnValue({ get: mocks.get });
  mocks.catalogue.mockImplementation(async () => {
    const snapshot = await mocks.get();
    return snapshot.docs.map((doc: {id: string; data: () => unknown}) => readScoringPuzzle(doc.id, doc.data()))
      .filter((p: ReturnType<typeof readScoringPuzzle>) => p !== null).map(publicPuzzle);
  });
});

it('delivers only published projections without answers or review information', async () => {
  mocks.get.mockResolvedValue({ docs: [
    { id: 'published', data: () => puzzle },
    { id: 'draft', data: () => ({ ...puzzle, published: false }) },
  ] });
  const response = await GET(new Request('https://example.test/api/puzzles'));
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(mocks.catalogue).toHaveBeenCalledOnce();
  expect(mocks.where).not.toHaveBeenCalled();
  expect(body.puzzles).toHaveLength(1);
  expect(body.puzzles[0]).toMatchObject({ id: 'published', choices: ['one', 'two'], xpReward: 20 });
  for (const key of ['correctAnswer', 'acceptedAnswers', 'correctExplanation', 'reviewedBy', 'reviewComments']) {
    expect(body.puzzles[0]).not.toHaveProperty(key);
  }
});

it('direct reads cannot retrieve drafts, invalid paths, or database diagnostics', async () => {
  mocks.get.mockResolvedValue({ id: 'draft', data: () => ({ ...puzzle, published: false }) });
  expect((await GET(new Request('https://example.test/api/puzzles?id=draft'))).status).toBe(404);
  expect((await GET(new Request('https://example.test/api/puzzles?id=a%2Fb'))).status).toBe(400);
  mocks.get.mockRejectedValue(new Error('private credentials'));
  const response = await GET(new Request('https://example.test/api/puzzles'));
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain('private credentials');
});

it('converts Firestore row maps and preserves crossword navigation without disclosing letters', () => {
  const source = readScoringPuzzle('crossword', { ...puzzle, type: 'crossword', crosswordData: {
    size: 2, grid: { '0': ['A', 'B'], '1': [null, null] },
    clues: [{ number: 1, clue: 'First two', answer: 'AB', startRow: 0, startCol: 0, direction: 'across' }],
  } });
  expect(source).not.toBeNull();
  expect(publicPuzzle(source!).crosswordData).toEqual({ size: 2, grid: [['', ''], [null, null]],
    clues: [{ number: 1, clue: 'First two', length: 2, startRow: 0, startCol: 0, direction: 'across' }],
  });
});
