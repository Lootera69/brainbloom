import { beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { GET } from "@/app/api/admin/seed/route";

const state = vi.hoisted(() => ({ verify: vi.fn(), access: {} as Record<string, unknown> | undefined, deleting: false }));
vi.mock("@/lib/push-send", () => ({ getAdminApp: () => ({}) }));
vi.mock("firebase-admin/auth", () => ({ getAuth: () => ({ verifyIdToken: state.verify }) }));
vi.mock("firebase-admin/firestore", () => ({ getFirestore: () => ({
  doc: (name: string) => ({ get: async () => name.startsWith("accountDeletions/")
    ? { exists: state.deleting } : { data: () => state.access } }),
}) }));

const request = (query = "", token: string | null = "valid") => new Request(`https://example.test/api/admin/seed${query}`, {
  headers: token ? { Authorization: `Bearer ${token}` } : {},
});

beforeEach(() => {
  vi.clearAllMocks();
  state.verify.mockResolvedValue({ uid: "admin", email: "admin@example.test", email_verified: true });
  state.access = { role: "admin", enabled: true };
  state.deleting = false;
});

describe("private Studio seed delivery", () => {
  it.each(["", "?source=legacy", "?source=forge", "?source=ciphers"])("requires verified authentication for %s", async (query) => {
    expect((await GET(request(query, null))).status).toBe(401);
    state.verify.mockRejectedValue(new Error("revoked"));
    const response = await GET(request(query, "revoked"));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it.each([undefined, { role: "contributor", enabled: true }, { role: "reviewer", enabled: true },
    { role: "admin", enabled: false }, { role: "admin", enabled: true, status: "frozen" }])("rejects non-admin membership %j", async (access) => {
    state.access = access;
    const response = await GET(request("?source=ciphers"));
    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain("correctAnswer");
  });

  it("rejects deleting accounts and unverified email", async () => {
    state.deleting = true;
    expect((await GET(request())).status).toBe(403);
    state.deleting = false;
    state.verify.mockResolvedValue({ uid: "admin", email: "admin@example.test", email_verified: false });
    expect((await GET(request())).status).toBe(403);
  });

  it("loads answer-free metadata and preserves authenticated legacy and cipher imports", async () => {
    const response = await GET(request());
    const metadata = await response.json();
    expect(response.status).toBe(200);
    expect(JSON.stringify(metadata)).not.toMatch(/correctAnswer|acceptedAnswers|correctExplanation|encodedMessage/);
    expect(metadata.legacy.counts.puzzles).toBeGreaterThan(0);
    for (const source of ["legacy", "ciphers"]) {
      const result = await GET(request(`?source=${source}`));
      expect(result.headers.get("cache-control")).toBe("no-store");
      const body = await result.json();
      expect(body.puzzles.length).toBe(source === "legacy" ? metadata.legacy.counts.puzzles : metadata.ciphers.count);
      expect(body.puzzles.some((puzzle: { correctAnswer?: string }) => puzzle.correctAnswer)).toBe(true);
    }
  });

  it("delivers the complete Forge bank in pages below the hosting response limit", async () => {
    const metadata = await (await GET(request())).json();
    let pages = 1;
    let total = 0;
    for (let page = 0; page < pages; page++) {
      const response = await GET(request(`?source=forge&page=${page}`));
      expect(response.status).toBe(200);
      const raw = await response.text();
      expect(Buffer.byteLength(raw)).toBeLessThan(4_000_000);
      const body = JSON.parse(raw);
      expect(body.page).toBe(page);
      expect(body.lessonGroups).toHaveLength(metadata.forge.counts.lessonGroups);
      total += body.puzzles.length;
      pages = body.pages;
    }
    expect(pages).toBeGreaterThan(1);
    expect(total).toBe(metadata.forge.counts.puzzles);
    expect((await GET(request(`?source=forge&page=${pages}`))).status).toBe(404);
  });

  it.each(["?source=../../secrets", "?source=forge&page=-1", "?source=forge&page=1.2"])("rejects malformed selections %s", async (query) => {
    expect((await GET(request(query))).status).toBe(400);
  });

  it("keeps raw seeds outside public assets and client imports", () => {
    const root = process.cwd();
    for (const file of ["forge-bundle.json", "forge-manifest.json"]) {
      expect(existsSync(path.join(root, "public/seed", file))).toBe(false);
      expect(existsSync(path.join(root, "scripts/seed-data/private", file))).toBe(true);
    }
    const publicFiles = readdirSync(path.join(root, "public"), { recursive: true, withFileTypes: true });
    for (const entry of publicFiles.filter((entry) => entry.isFile() && /\.(json|js)$/.test(entry.name))) {
      expect(readFileSync(path.join(entry.parentPath, entry.name), "utf8")).not.toMatch(/"(?:correctAnswer|acceptedAnswers)"\s*:/);
    }
    for (const file of ["app/studio/seed/page.tsx", "app/studio/ciphers/page.tsx", "services/seed-content.ts"]) {
      expect(readFileSync(path.join(root, file), "utf8")).not.toMatch(/seed-data\/(?:data|ciphers\.generated|private\/)/);
    }
    for (const file of ["scripts/seed-data/data.ts", "scripts/seed-data/ciphers.generated.ts", "lib/server/seed-content.ts"]) {
      expect(readFileSync(path.join(root, file), "utf8")).toContain('import "server-only"');
    }
    const generator = readFileSync(path.join(root, "scripts/seed-data/ai-batch/build-bundle.mjs"), "utf8");
    expect(generator).toContain("path.join(root, 'scripts', 'seed-data', 'private')");
    expect(generator).not.toContain("path.join(root, 'public'");
  });
});
