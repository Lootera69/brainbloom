import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

describe("service worker private requests", () => {
  it.each([
    ["https://example.test/api/admin/users", false],
    ["https://example.test/api/admin/invites", false],
    ["https://example.test/studio", false],
    ["https://example.test/studio/settings", false],
    ["https://example.test/anywhere", true],
    ["https://firestore.googleapis.com/data", false],
  ])("never caches %s (authenticated: %s)", (url, authenticated) => {
    const listeners = new Map<string, (event: object) => void>();
    const caches = { match: vi.fn(), open: vi.fn() };
    runInNewContext(readFileSync("public/sw.js", "utf8"), {
      URL, caches, self: { location: { origin: "https://example.test" }, addEventListener: (name: string, fn: (event: object) => void) => listeners.set(name, fn) },
    });
    const respondWith = vi.fn();
    listeners.get("fetch")!({ request: { method: "GET", url, headers: new Headers(authenticated ? { authorization: "Bearer test" } : {}) }, respondWith });
    expect(respondWith).not.toHaveBeenCalled(); expect(caches.match).not.toHaveBeenCalled(); expect(caches.open).not.toHaveBeenCalled();
  });
});
