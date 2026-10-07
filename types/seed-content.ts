export interface SeedManifest {
  counts: { puzzles: number; lessonGroups: number };
  categories: string[];
  generatedAt?: string;
}

export interface SeedMetadata {
  legacy: SeedManifest;
  forge: SeedManifest;
  ciphers: { count: number; families: Record<string, number> };
}
