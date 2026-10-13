import { describe, expect, it, afterEach, vi } from "vitest";
import bundles from "./fixtures/workshop-bundles.json";
import fullBundle from "./fixtures/workshop-v2-bundle.json";
import { parseWorkshopBundle } from "./workshop-import";
import { createPuzzle, setStudioRole, setStudioSession } from "@/services/puzzle-service";
import { checkAnswer } from "@/lib/utils";

vi.mock("@/services/firebase", () => ({ getFirebase: () => ({ db: null }) }));
afterEach(() => vi.unstubAllGlobals());

describe("workshop import", () => {
  it.each(bundles)("reads real engine exports for all supported formats", async bundle => {
    const drafts = await parseWorkshopBundle(bundle);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].item.type).toBe(bundle.items[0].type);
    expect(drafts[0].item.reviewStatus).toBe("draft");
    expect(drafts[0].item.correctAnswer).toBe(bundle.items[0].correctAnswer);
  });

  it("rejects changes made after the engine check", async () => {
    const bundle = structuredClone(bundles[0]);
    bundle.items[0].question += " Changed.";
    await expect(parseWorkshopBundle(bundle)).rejects.toThrow("changed since");
  });

  it("retains the complete current source, license, request and proof for replay", async () => {
    const [draft] = await parseWorkshopBundle(fullBundle);
    expect(JSON.parse(draft.metadata.replayBundleJson)).toEqual(fullBundle);
    expect(draft.item.workshopImport).toEqual(draft.metadata);
    expect(draft.metadata.replayContextAvailable).toBe(true);
    expect(draft.metadata.sources[0].license).toContain("Creative Commons");
    expect(draft.metadata.sources[0].attribution).toContain("Princeton");
    expect(draft.metadata.sources[0].licenseUrl).toBe("https://creativecommons.org/licenses/by/4.0/");
    expect(draft.metadata.itemSha256).toBe(fullBundle.proofs[0].item_sha256);
    expect(draft.metadata.bundleSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("does not claim full replay context for trimmed legacy handoffs", async () => {
    const [draft] = await parseWorkshopBundle(bundles[0]);
    expect(draft.metadata.replayContextAvailable).toBe(false);
    expect(JSON.parse(draft.metadata.replayBundleJson)).toEqual(bundles[0]);
  });

  it("keeps every combined-topic source notice", async () => {
    const source = fullBundle.dictionary.source;
    const second = { name: "Second retained source", sha256: "f".repeat(64), license: "Second license" };
    const [draft] = await parseWorkshopBundle({ ...fullBundle, dictionary: { ...fullBundle.dictionary, sources: [source, second] } });
    expect(draft.metadata.sources.map(notice => notice.name)).toEqual([source.name, second.name]);
    expect(draft.metadata.sources[1].license).toBe(second.license);
  });

  it("rejects malformed source notices instead of dropping them", async () => {
    await expect(parseWorkshopBundle({ ...fullBundle, dictionary: { ...fullBundle.dictionary, source: { ...fullBundle.dictionary.source, license: "" } } })).rejects.toThrow();
  });

  it("rejects publication flags and mismatched proofs", async () => {
    await expect(parseWorkshopBundle({ ...bundles[0], intendedImport: { ...bundles[0].intendedImport, published: true } })).rejects.toThrow();
    await expect(parseWorkshopBundle({ ...bundles[0], proofs: [] })).rejects.toThrow("counts differ");
  });

  it("accepts the requested contradiction letter in the real web grader", async () => {
    const [{ item }] = await parseWorkshopBundle(bundles[2]);
    expect(checkAnswer(item.correctAnswer.slice(-1), item.correctAnswer, item.acceptedAnswers).correct).toBe(true);
    expect(checkAnswer("Z", item.correctAnswer, item.acceptedAnswers).correct).toBe(false);
  });

  it("keeps imported puzzles unpublished drafts for an administrator", async () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
    vi.stubGlobal("sessionStorage", localStorage);
    setStudioSession("workshop-import-test");
    setStudioRole("admin");
    const [{ item }] = await parseWorkshopBundle(bundles[0]);
    const saved = await createPuzzle(item, { forceDraft: true });
    expect(saved.published).toBe(false);
    expect(saved.reviewStatus).toBe("draft");
    expect((await createPuzzle(item)).reviewStatus).toBe("approved");
  });
});
