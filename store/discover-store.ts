"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface DiscoverProgress {
  stepIndex: number;
  completed: boolean;
  bookmarked: boolean;
  lessonUpdatedAt: number;
}

interface DiscoverState {
  readers: Record<string, Record<string, DiscoverProgress>>;
  update: (reader: string, lesson: string, progress: Partial<DiscoverProgress>) => void;
}

export const EMPTY_DISCOVER_PROGRESS: DiscoverProgress = {
  stepIndex: 0, completed: false, bookmarked: false, lessonUpdatedAt: 0,
};

export const useDiscoverStore = create<DiscoverState>()(persist((set) => ({
  readers: {},
  update: (reader, lesson, progress) => set((state) => ({
    readers: {
      ...state.readers,
      [reader]: {
        ...state.readers[reader],
        [lesson]: { ...EMPTY_DISCOVER_PROGRESS, ...state.readers[reader]?.[lesson], ...progress },
      },
    },
  })),
}), { name: "brainbloom-discover-progress", version: 1 }));
