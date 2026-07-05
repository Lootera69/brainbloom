export type PuzzleType = "multiple-choice" | "true-false";
export type Difficulty = "easy" | "medium" | "hard";

export interface Puzzle {
  id: string;
  type: PuzzleType;
  category: string;
  difficulty: Difficulty;
  title: string;
  question: string;
  choices: string[];
  correctAnswer: string;
  xpReward: number;
  published: boolean;
  createdBy: string;
  createdAt: number;
  lastModifiedBy: string;
  updatedAt: number;
}

export interface PuzzleFormData {
  type: PuzzleType;
  category: string;
  difficulty: Difficulty;
  title: string;
  question: string;
  choices: string[];
  correctAnswer: string;
  xpReward: number;
}
