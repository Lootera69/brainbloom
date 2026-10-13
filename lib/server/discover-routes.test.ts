import { beforeEach, expect, it, vi } from "vitest";
import { SEED_DISCOVER_LESSONS } from "@/lib/discover/seed";

const mocks = vi.hoisted(() => ({ doc: vi.fn(), get: vi.fn(), getFirestore: vi.fn(), requireAdmin: vi.fn() }));
vi.mock("firebase-admin/firestore", () => ({ getFirestore: mocks.getFirestore }));
vi.mock("@/lib/push-send", () => ({ getAdminApp: () => ({}) }));
vi.mock("@/lib/server/staff-auth", () => ({
  privateJson: (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } }),
  requireAdmin: mocks.requireAdmin,
}));

import { GET } from "@/app/api/admin/discover/[id]/route";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getFirestore.mockReturnValue({ doc: mocks.doc });
  mocks.doc.mockReturnValue({ get: mocks.get });
});

it("requires admin access before reading a Discover lesson", async () => {
  mocks.requireAdmin.mockResolvedValue({ ok: false, response: Response.json({ error: "Denied" }, { status: 403 }) });

  const response = await GET(new Request("https://example.com/api/admin/discover/lesson"), { params: Promise.resolve({ id: "lesson" }) });

  expect(response.status).toBe(403);
  expect(mocks.getFirestore).not.toHaveBeenCalled();
  expect(mocks.get).not.toHaveBeenCalled();
});

it("returns one authenticated Discover lesson without loading the catalogue", async () => {
  const lesson = SEED_DISCOVER_LESSONS[0];
  mocks.requireAdmin.mockResolvedValue({ ok: true, app: {}, uid: "admin" });
  mocks.get.mockResolvedValue({ exists: true, id: lesson.id, data: () => lesson });

  const response = await GET(new Request(`https://example.com/api/admin/discover/${lesson.id}`), { params: Promise.resolve({ id: lesson.id }) });
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.lesson).toEqual(lesson);
  expect(mocks.doc).toHaveBeenCalledWith(`discover/${lesson.id}`);
});

it("returns a safe 404 when an authenticated lesson is missing", async () => {
  mocks.requireAdmin.mockResolvedValue({ ok: true, app: {}, uid: "admin" });
  mocks.get.mockResolvedValue({ exists: false });

  const response = await GET(new Request("https://example.com/api/admin/discover/missing"), { params: Promise.resolve({ id: "missing" }) });
  const body = await response.json();

  expect(response.status).toBe(404);
  expect(body).toEqual({ error: "This Discover lesson could not be found." });
});
