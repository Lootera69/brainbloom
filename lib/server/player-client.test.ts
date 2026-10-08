import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PlayerApi } from "@/services/player-service";

vi.mock("@/services/firebase", () => ({ getFirebase: () => ({ auth: null }) }));
let uid: string | null;
let requests: Record<string, unknown>[];
const success = () => Response.json({ ok: true, progress: { version: 1, revision: 1, xp: 20, gems: 5, hearts: 4, weeklyXp: 20 }, serverTime: Date.now() });
const actor = () => uid ? { uid, getIdToken: async () => "test-token" } : null;
beforeEach(() => { uid = "player"; requests = []; });
afterEach(() => vi.unstubAllGlobals());

it('attaches attestation when available and preserves guest compatibility when verification is unavailable', async () => {
  const fetcher = vi.fn(async (_url: Parameters<typeof fetch>[0], options?: RequestInit) => {
    requests.push(options?.headers as Record<string, unknown>);
    return success();
  });
  await new PlayerApi(actor, fetcher, async () => 'verified-app-token').send({ action: 'snapshot' });
  expect(requests[0]).toMatchObject({ 'X-Firebase-AppCheck': 'verified-app-token', Authorization: 'Bearer test-token' });
  await new PlayerApi(actor, fetcher, async () => { throw Error('Provider unavailable'); }).send({ action: 'snapshot' });
  expect(requests[1]).not.toHaveProperty('X-Firebase-AppCheck');
});

it('preserves the browser fetch receiver during guest and Google progress restoration', async () => {
  const browserFetch = vi.fn(function(this: unknown) {
    if (this !== globalThis) throw new TypeError('Illegal invocation');
    return Promise.resolve(success());
  });
  vi.stubGlobal('fetch', browserFetch);
  for (const account of ['guest', 'google']) {
    uid = account;
    await expect(new PlayerApi(actor).send({action:'snapshot'})).resolves.toHaveProperty('progress.xp', 20);
  }
  expect(browserFetch).toHaveBeenCalledTimes(2);
});

it("retries the same request id after a lost connection and rejects a changed pending answer", async () => {
  const api = new PlayerApi(actor, vi.fn(async (_url, options) => {
    expect(options?.cache).toBe("no-store");
    requests.push(JSON.parse(options?.body as string));
    if (requests.length === 1) throw new Error("offline");
    return success();
  }));
  const command = { action: "answer" as const, sessionId: "session", answer: "B" };
  await expect(api.send(command)).rejects.toMatchObject({ code: "unavailable" });
  await expect(api.send({ ...command, answer: "A" })).rejects.toMatchObject({ code: "pending-answer" });
  expect((await api.send(command)).progress.xp).toBe(20);
  expect(requests[0].requestId).toBe(requests[1].requestId);
});

it("rejects stale-account responses and never substitutes local rewards on failure", async () => {
  const api = new PlayerApi(actor, vi.fn(async () => { uid = "other"; return success(); }));
  await expect(api.send({ action: "snapshot" })).rejects.toMatchObject({ code: "identity-changed" });
  uid = null;
  await expect(api.send({ action: "snapshot" })).rejects.toMatchObject({ code: "sign-in-required" });
});

it("fails closed on an invalid success payload or a server rejection", async () => {
  const api = new PlayerApi(actor, vi.fn(async () => Response.json({ ok: true, progress: { xp: 100000 } })));
  await expect(api.send({ action: "snapshot" })).rejects.toMatchObject({ code: "invalid-response" });
  const denied = new PlayerApi(actor, vi.fn(async () => Response.json({ error: "No hearts", code: "no-hearts" }, { status: 409 })));
  await expect(denied.send({ action: "snapshot" })).rejects.toMatchObject({ code: "no-hearts" });
});
