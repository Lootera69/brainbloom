import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn(), requireAdmin: vi.fn(), doc: vi.fn() }));
vi.mock("firebase-admin/firestore", () => ({ getFirestore: () => ({ doc: mocks.doc }) }));
vi.mock("@/lib/push-send", () => ({ getAdminApp: () => ({}) }));
vi.mock("@/lib/server/staff-auth", () => ({ requireAdmin: mocks.requireAdmin,
  privateJson: (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } }) }));

import { GET as publicEvents } from "@/app/api/events/route";
import { GET as adminEvents } from "@/app/api/admin/events/route";
import { SEED_EVENTS } from "@/lib/server/event-seed";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.doc.mockReturnValue({ get: mocks.get });
  mocks.get.mockResolvedValue({ exists: true, data: () => ({ events: SEED_EVENTS, seasonalThemesEnabled: false }) });
});

it("serves answerless public Moments with the published switch", async () => {
  const response = await publicEvents();
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.seasonalThemesEnabled).toBe(false);
  expect(body.events).toHaveLength(SEED_EVENTS.length);
  expect(JSON.stringify(body)).not.toContain("correctIndex");
  expect(JSON.stringify(body)).not.toContain("factoid");
  expect(mocks.doc).toHaveBeenCalledWith("settings/events");
});

it("denies the authored seed before reading any event data without admin access", async () => {
  mocks.requireAdmin.mockResolvedValue({ ok: false, response: Response.json({ error: "Denied" }, { status: 403 }) });
  const response = await adminEvents(new Request("https://example.com/api/admin/events"));
  expect(response.status).toBe(403);
  expect(mocks.get).not.toHaveBeenCalled();
});

it("keeps authored answers available to an authenticated admin", async () => {
  mocks.requireAdmin.mockResolvedValue({ ok: true, app: {}, uid: "admin" });
  const response = await adminEvents(new Request("https://example.com/api/admin/events"));
  const body = await response.json();
  expect(body.events[0].question.correctIndex).toBe(SEED_EVENTS[0].question!.correctIndex);
  expect(body.events[0].question.factoid).toBe(SEED_EVENTS[0].question!.factoid);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
});
