import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getCipherSeeds, getSeedData, getSeedMetadata } from "@/services/seed-content";

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), user: null as null | { uid: string; getIdToken: () => Promise<string> } }));
vi.mock("@/services/firebase", () => ({ getFirebase: () => ({ auth: { currentUser: mocks.user } }) }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { uid: "admin", getIdToken: async () => "verified-token" };
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => vi.unstubAllGlobals());

it("authenticates every private seed page and assembles the import before mutation", async () => {
  mocks.fetch.mockImplementation(async (url: string) => {
    const page = Number(new URL(url, "https://example.test").searchParams.get("page"));
    return Response.json({ page, pages: 2, lessonGroups: [{ name: "Logic" }], puzzles: [{ title: `Part ${page}`, correctAnswer: "private" }] });
  });
  const bundle = await getSeedData("forge");
  expect(bundle.puzzles.map((puzzle) => puzzle.title)).toEqual(["Part 0", "Part 1"]);
  expect(bundle.lessonGroups).toHaveLength(1);
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
  for (const [, init] of mocks.fetch.mock.calls) {
    expect(init).toMatchObject({ cache: "no-store", headers: { Authorization: "Bearer verified-token" } });
  }
});

it("rejects missing sessions without fetching answer data", async () => {
  mocks.user = null;
  await expect(getSeedMetadata()).rejects.toThrow("Sign in");
  expect(mocks.fetch).not.toHaveBeenCalled();
});

it("preserves stable cipher IDs and rejects entries that could duplicate imports", async () => {
  mocks.fetch.mockResolvedValueOnce(Response.json({ page: 0, pages: 1, lessonGroups: [], puzzles: [{ id: "cipher-stable", title: "Cipher" }] }));
  expect((await getCipherSeeds())[0].id).toBe("cipher-stable");
  mocks.fetch.mockResolvedValueOnce(Response.json({ page: 0, pages: 1, lessonGroups: [], puzzles: [{ title: "Cipher" }] }));
  await expect(getCipherSeeds()).rejects.toThrow("stable ID");
});

it("rejects admin denial and a sign-in change while loading private content", async () => {
  mocks.fetch.mockResolvedValueOnce(Response.json({ error: "Administrator access required." }, { status: 403 }));
  await expect(getSeedData("ciphers")).rejects.toThrow("Administrator access");
  mocks.fetch.mockImplementationOnce(async () => {
    mocks.user = { uid: "other", getIdToken: async () => "other-token" };
    return Response.json({ page: 0, pages: 1, lessonGroups: [], puzzles: [{ title: "Private" }] });
  });
  await expect(getSeedData("ciphers")).rejects.toThrow("sign-in changed");
});

it("rejects partial or changing downloads before the importer receives a bundle", async () => {
  mocks.fetch.mockResolvedValueOnce(Response.json({ page: 0, pages: 2, lessonGroups: [], puzzles: [{ title: "First" }] }));
  mocks.fetch.mockResolvedValueOnce(Response.json({ page: 1, pages: 3, lessonGroups: [], puzzles: [{ title: "Changed" }] }));
  await expect(getSeedData("forge")).rejects.toThrow("changed during download");
});
