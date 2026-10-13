export type DiscoverAccent = "sky" | "violet" | "amber" | "emerald" | "rose";

export interface DiscoverStep {
  id: string;
  title: string;
  body: string;
  imageUrl: string;
  imageAlt: string;
  caption?: string;
  keyFact?: string;
}

/** Portable content shared by the web reader, Studio, and the mobile API. */
export interface DiscoverLesson {
  id: string;
  title: string;
  summary: string;
  category: string;
  coverImageUrl: string;
  coverImageAlt: string;
  accent: DiscoverAccent;
  difficulty: "beginner" | "intermediate";
  durationMinutes: number;
  steps: DiscoverStep[];
  takeaways: string[];
  published: boolean;
  featured: boolean;
  createdAt: number;
  updatedAt: number;
}

export type DiscoverLessonInput = Omit<DiscoverLesson, "id" | "createdAt" | "updatedAt">;
