export type PuzzleType = "multiple-choice" | "true-false" | "crossword" | "type-answer" | "sudoku";
export type Difficulty = "easy" | "medium" | "hard";
export type ReviewStatus = "draft" | "pending" | "approved" | "rejected" | "needs-discussion";

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

export interface SudokuData {
  puzzle: number[];   // 81 cells, 0 = empty, 1-9 = clue
  solution: number[]; // 81 cells, 1-9
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
  sudokuData?: SudokuData;
  xpReward: number;
  published: boolean;
  reviewStatus: ReviewStatus;
  reviewedBy?: string;
  reviewNote?: string;
  correctExplanation?: string;
  incorrectExplanation?: string;
  createdBy: string;
  createdAt: number;
  lastModifiedBy: string;
  updatedAt: number;
  completedBy: number;
  lessonContent?: string;
  lessonOrder?: number;
  lessonGroup?: string;
  lessonGroupOrder?: number;
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
  sudokuData?: SudokuData;
  xpReward: number;
  reviewStatus?: ReviewStatus;
  correctExplanation?: string;
  incorrectExplanation?: string;
  lessonContent?: string;
  lessonOrder?: number;
  lessonGroup?: string;
  lessonGroupOrder?: number;
}
