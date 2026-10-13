import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fullBundle from "./fixtures/workshop-v2-bundle.json";
import bundles from "./fixtures/workshop-bundles.json";
import { parseWorkshopBundle } from "./workshop-import";
import { clearPuzzlesCache, createPuzzle, createPuzzleWithReceipt, getPuzzle, getPuzzles, updatePuzzleWithReceipt } from "@/services/puzzle-service";

const state = vi.hoisted(() => ({
  cloud: false,
  cloudWriteFails: false,
  localWriteFails: false,
  nextId: 0,
  documents: new Map<string, Record<string, unknown>>(),
}));

vi.mock("@/services/firebase", () => ({ getFirebase: () => ({ db: state.cloud ? {} : null }) }));

function validateFirestoreArrays(value: unknown): void {
  if (Array.isArray(value)) {
    if (value.some(Array.isArray)) throw new Error("Firestore does not support nested arrays");
    value.forEach(validateFirestoreArrays);
  } else if (value !== null && typeof value === "object") {
    Object.values(value).forEach(validateFirestoreArrays);
  }
}

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({})),
  doc: vi.fn((_db, _collection, id: string) => ({ id })),
  query: vi.fn(() => ({})), where: vi.fn(), orderBy: vi.fn(), increment: vi.fn(), deleteDoc: vi.fn(),
  Timestamp: { fromMillis: (value: number) => ({ toMillis: () => value }) },
  addDoc: vi.fn(async (_collection, data: Record<string, unknown>) => {
    if (state.cloudWriteFails) throw new Error("Isolated cloud write failure");
    validateFirestoreArrays(data);
    const id = `test-cloud-${++state.nextId}`;
    state.documents.set(id, data);
    return { id };
  }),
  updateDoc: vi.fn(async ({ id }: { id: string }, data: Record<string, unknown>) => {
    if (state.cloudWriteFails) throw new Error("Isolated cloud write failure");
    validateFirestoreArrays(data);
    state.documents.set(id, { ...state.documents.get(id), ...data });
  }),
  getDoc: vi.fn(async ({ id }: { id: string }) => ({
    id, exists: () => state.documents.has(id), data: () => state.documents.get(id),
  })),
  getDocs: vi.fn(async () => ({ docs: [...state.documents].map(([id, data]) => ({ id, data: () => data })) })),
}));

let storage: Map<string, string>;

beforeEach(() => {
  state.cloud = false;
  state.cloudWriteFails = false;
  state.localWriteFails = false;
  state.nextId = 0;
  state.documents.clear();
  storage = new Map();
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (state.localWriteFails) throw new Error("Isolated storage quota failure");
      storage.set(key, value);
    },
    removeItem: (key: string) => storage.delete(key),
  });
  vi.stubGlobal("sessionStorage", { getItem: (key: string) => key === "studio-role" ? "admin" : "isolated-test" });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  clearPuzzlesCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("workshop persistence with isolated cloud and browser storage", () => {
  it.each(["array", "row-map"])("decodes %s crossword rows in numeric order", async shape => {
    state.cloud = true;
    const grid = Array.from({ length: 11 }, (_, row) => Array(11).fill(String.fromCharCode(65 + row)));
    const rows = Object.fromEntries(grid.map((row, index) => [String(index), row]).reverse());
    state.documents.set("crossword", { type: "crossword", crosswordData: { size: 11, grid: shape === "array" ? grid : rows, clues: [] } });
    const puzzle = await getPuzzle("crossword");
    expect(puzzle?.crosswordData?.grid).toEqual(grid);
  });

  it.each([
    { grid: null }, { grid: "invalid" }, { grid: {} },
    { grid: { "0": ["A", null] } },
    { grid: { "0": ["A", null], "2": [null, "B"] } },
    { grid: { "0": "AB", "1": [null, "B"] } },
    { grid: { "0": ["A"], "1": [null, "B"] } },
    { grid: { "0": ["A", 5], "1": [null, "B"] } },
    { grid: { "0": ["A", null], "1": [null, "B"], "2": [null, null] } },
    { grid: [["A", null]] }, { size: 0 }, { size: 16 }, { size: 2.5 },
    { clues: null }, { clues: [null] },
  ])("ignores malformed crossword data without losing other cloud puzzles: %j", async invalid => {
    state.cloud = true;
    state.documents.set("malformed", { type: "crossword", crosswordData: { size: 2, grid: { "0": ["A", null], "1": [null, "B"] }, clues: [], ...invalid } });
    state.documents.set("valid", { type: "type-answer", title: "Unaffected puzzle" });
    expect((await getPuzzle("malformed"))?.crosswordData).toBeUndefined();
    const bank = await getPuzzles();
    expect(bank.find(puzzle => puzzle.id === "malformed")?.crosswordData).toBeUndefined();
    expect(bank.find(puzzle => puzzle.id === "valid")?.title).toBe("Unaffected puzzle");
  });

  it.each(bundles)("saves and reloads each supported format through the cloud", async bundle => {
    state.cloud = true;
    const [{ item, metadata }] = await parseWorkshopBundle(bundle);
    const saved = await createPuzzleWithReceipt(item, { forceDraft: true });
    expect(saved.persistence.cloud).toBe(true);
    storage.clear();
    clearPuzzlesCache();
    const reloaded = await getPuzzle(saved.puzzle.id);
    expect(reloaded).toMatchObject({ ...item, published: false, reviewStatus: "draft", workshopImport: metadata });
    const updated = await updatePuzzleWithReceipt(saved.puzzle.id, { ...item, title: "Edited after import" });
    expect(updated?.persistence.cloud).toBe(true);
    storage.clear();
    clearPuzzlesCache();
    expect(await getPuzzle(saved.puzzle.id)).toMatchObject({ ...item, title: "Edited after import", workshopImport: metadata });
  });

  it.each([false, true])("reports no save when browser storage fails and cloud is %s", async cloud => {
    state.cloud = cloud;
    state.cloudWriteFails = true;
    state.localWriteFails = true;
    const [{ item }] = await parseWorkshopBundle(fullBundle);
    await expect(createPuzzleWithReceipt(item, { forceDraft: true })).rejects.toThrow("could not be saved");
    await expect(createPuzzle(item, { forceDraft: true })).rejects.toThrow("could not be saved");
    expect(storage.size).toBe(0);
    expect(state.documents.size).toBe(0);
    expect(await getPuzzles()).toEqual([]);
  });

  it.each([false, true])("reloads a clearly marked browser-only draft when cloud is %s", async cloud => {
    state.cloud = cloud;
    state.cloudWriteFails = true;
    const [{ item, metadata }] = await parseWorkshopBundle(fullBundle);
    const result = await createPuzzleWithReceipt(item, { forceDraft: true });
    expect(result.persistence).toEqual({ cloud: false, local: true });
    expect(result.puzzle).toMatchObject({ published: false, reviewStatus: "draft", localOnly: true });
    clearPuzzlesCache();
    const reloaded = await getPuzzle(result.puzzle.id);
    expect(reloaded?.workshopImport).toEqual(metadata);
    expect(reloaded?.localOnly).toBe(true);
    expect(JSON.parse(reloaded!.workshopImport!.replayBundleJson)).toEqual(fullBundle);
  });

  it.each([false, true])("reloads cloud provenance even when local writes fail: %s", async localWriteFails => {
    state.cloud = true;
    state.localWriteFails = localWriteFails;
    const [{ item, metadata }] = await parseWorkshopBundle(fullBundle);
    const result = await createPuzzleWithReceipt(item, { forceDraft: true });
    expect(result.persistence).toEqual({ cloud: true, local: !localWriteFails });
    expect(result.puzzle).toMatchObject({ published: false, reviewStatus: "draft", localOnly: false });
    expect(state.documents.get(result.puzzle.id)?.workshopImport).toEqual(metadata);
    storage.clear();
    clearPuzzlesCache();
    const reloaded = await getPuzzle(result.puzzle.id);
    expect(reloaded?.workshopImport).toEqual(metadata);
    expect(reloaded?.localOnly).not.toBe(true);
    expect(typeof state.documents.get(result.puzzle.id)?.workshopImport).toBe("object");
    expect(typeof reloaded?.workshopImport?.replayBundleJson).toBe("string");
  });

  it("preserves source context through local and cloud edits", async () => {
    const [{ item, metadata }] = await parseWorkshopBundle(fullBundle);
    const local = await createPuzzleWithReceipt(item, { forceDraft: true });
    const localEdit = await updatePuzzleWithReceipt(local.puzzle.id, { title: "Edited locally" });
    expect(localEdit?.persistence).toEqual({ cloud: false, local: true });
    clearPuzzlesCache();
    expect((await getPuzzle(local.puzzle.id))?.workshopImport).toEqual(metadata);
    state.cloud = true;
    const cloud = await createPuzzleWithReceipt(item, { forceDraft: true });
    const cloudEdit = await updatePuzzleWithReceipt(cloud.puzzle.id, { title: "Edited in cloud" });
    expect(cloudEdit?.persistence.cloud).toBe(true);
    storage.clear();
    clearPuzzlesCache();
    expect(await getPuzzle(cloud.puzzle.id)).toMatchObject({ title: "Edited in cloud", workshopImport: metadata });
  });

  it("leaves the last saved draft intact when an edit cannot persist", async () => {
    const [{ item }] = await parseWorkshopBundle(fullBundle);
    const saved = await createPuzzleWithReceipt(item, { forceDraft: true });
    state.localWriteFails = true;
    await expect(updatePuzzleWithReceipt(saved.puzzle.id, { title: "Unsaved change" })).rejects.toThrow("could not be saved");
    clearPuzzlesCache();
    expect((await getPuzzle(saved.puzzle.id))?.title).toBe(item.title);
  });

  it("reloads the newer cloud edit when the older browser copy cannot be updated", async () => {
    state.cloud = true;
    const [{ item }] = await parseWorkshopBundle(fullBundle);
    const saved = await createPuzzleWithReceipt(item, { forceDraft: true });
    state.localWriteFails = true;
    const edited = await updatePuzzleWithReceipt(saved.puzzle.id, { title: "Latest cloud title" });
    expect(edited?.persistence).toEqual({ cloud: true, local: false });
    expect(JSON.parse(storage.get("brainbloom-puzzles")!)[0].title).toBe(item.title);
    clearPuzzlesCache();
    expect((await getPuzzle(saved.puzzle.id))?.title).toBe("Latest cloud title");
  });

  it("reports a local edit fallback when the cloud write fails", async () => {
    state.cloud = true;
    const [{ item }] = await parseWorkshopBundle(fullBundle);
    const saved = await createPuzzleWithReceipt(item, { forceDraft: true });
    state.cloudWriteFails = true;
    const edited = await updatePuzzleWithReceipt(saved.puzzle.id, { title: "Browser-only edit" });
    expect(edited?.persistence).toEqual({ cloud: false, local: true });
    clearPuzzlesCache();
    expect(await getPuzzle(saved.puzzle.id)).toMatchObject({ title: "Browser-only edit", localOnly: true });
    expect(state.documents.get(saved.puzzle.id)?.title).toBe(item.title);
  });

  it("does not erase a corrupt existing browser bank to claim a successful import", async () => {
    storage.set("brainbloom-puzzles", "corrupt existing data");
    const [{ item }] = await parseWorkshopBundle(fullBundle);
    await expect(createPuzzleWithReceipt(item, { forceDraft: true })).rejects.toThrow("could not be saved");
    expect(storage.get("brainbloom-puzzles")).toBe("corrupt existing data");
  });

  it("keeps a browser-only edit through a bank refresh when the clock has not advanced", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_800_000_000_000);
    state.cloud = true;
    const [{ item }] = await parseWorkshopBundle(fullBundle);
    const saved = await createPuzzleWithReceipt(item, { forceDraft: true });
    state.cloudWriteFails = true;
    await updatePuzzleWithReceipt(saved.puzzle.id, { title: "Unsynced browser title" });
    clearPuzzlesCache();
    const refreshed = (await getPuzzles()).find(puzzle => puzzle.id === saved.puzzle.id);
    expect(refreshed?.title).toBe("Unsynced browser title");
    expect(refreshed?.localOnly).toBe(true);
    clearPuzzlesCache();
    expect((await getPuzzle(saved.puzzle.id))?.title).toBe("Unsynced browser title");
  });

  it("reloads a newer cloud edit after a browser-only fallback and local quota failure", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_800_000_000_000);
    state.cloud = true;
    const [{ item, metadata }] = await parseWorkshopBundle(fullBundle);
    const saved = await createPuzzleWithReceipt(item, { forceDraft: true });
    state.cloudWriteFails = true;
    await updatePuzzleWithReceipt(saved.puzzle.id, { title: "Earlier browser-only edit" });
    state.cloudWriteFails = false;
    state.localWriteFails = true;
    const result = await updatePuzzleWithReceipt(saved.puzzle.id, { title: "Latest durable cloud edit" });
    expect(result?.persistence).toEqual({ cloud: true, local: false });
    clearPuzzlesCache();
    const reloaded = await getPuzzle(saved.puzzle.id);
    expect(reloaded?.title).toBe("Latest durable cloud edit");
    expect(reloaded?.workshopImport).toEqual(metadata);
    clearPuzzlesCache();
    expect((await getPuzzles()).find(puzzle => puzzle.id === saved.puzzle.id)?.title).toBe("Latest durable cloud edit");
  });
});
