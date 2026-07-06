export type PuzzleType = "multiple-choice" | "true-false" | "crossword" | "type-answer";
export type Difficulty = "easy" | "medium" | "hard";

export interface CrosswordClue {
  number: number;
  clue: string;
  answer: string;
  startRow: number;
  startCol: number;
  direction: "across" | "down";
}

export interface CrosswordData {
  size: number;
  grid: (string | null)[][];
  clues: CrosswordClue[];
}

export interface Puzzle {
  id: string;
  type: PuzzleType;
  category: string;
  difficulty: Difficulty;
  title: string;
  question: string;
  choices: string[];
  correctAnswer: string;
  acceptedAnswers?: string[];
  imageUrl?: string;
  crosswordData?: CrosswordData;
  xpReward: number;
  published: boolean;
  requiresExplanation: boolean;
  explanation: string;
  createdBy: string;
  createdAt: number;
  lastModifiedBy: string;
  updatedAt: number;
  completedBy: number;
}

export interface PuzzleFormData {
  type: PuzzleType;
  category: string;
  difficulty: Difficulty;
  title: string;
  question: string;
  choices: string[];
  correctAnswer: string;
  acceptedAnswers?: string[];
  imageUrl?: string;
  crosswordData?: CrosswordData;
  xpReward: number;
  requiresExplanation: boolean;
  explanation: string;
}
