import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import seedData from "@/scripts/seed-data/data";
import cipherSeeds from "@/scripts/seed-data/ciphers.generated";
import forgeManifest from "@/scripts/seed-data/private/forge-manifest.json";
import type { SeedData } from "@/scripts/seed-data/importer";
import type { SeedMetadata } from "@/types/seed-content";

const pageSize = 400;
let forgeData: Promise<SeedData> | undefined;

export function seedMetadata(): SeedMetadata {
  return {
    legacy: {
      counts: { puzzles: seedData.puzzles.length, lessonGroups: seedData.lessonGroups.length },
      categories: [...new Set(seedData.lessonGroups.map((group) => group.category))],
    },
    forge: forgeManifest,
    ciphers: {
      count: cipherSeeds.length,
      families: cipherSeeds.reduce<Record<string, number>>((families, cipher) => {
        const family = cipher.cipherData?.cipherType ?? "Other";
        families[family] = (families[family] ?? 0) + 1;
        return families;
      }, {}),
    },
  };
}

export async function seedPage(source: "legacy" | "forge" | "ciphers", page: number) {
  let data: SeedData;
  if (source === "legacy") data = seedData;
  else if (source === "ciphers") data = { lessonGroups: [], puzzles: cipherSeeds };
  else {
    forgeData ??= readFile(path.join(process.cwd(), "scripts/seed-data/private/forge-bundle.json"), "utf8")
      .then((raw) => JSON.parse(raw) as SeedData)
      .catch((error: unknown) => { forgeData = undefined; throw error; });
    data = await forgeData;
  }
  const pages = Math.max(1, Math.ceil(data.puzzles.length / pageSize));
  if (page >= pages) return null;
  return { page, pages, lessonGroups: data.lessonGroups, puzzles: data.puzzles.slice(page * pageSize, (page + 1) * pageSize) };
}
