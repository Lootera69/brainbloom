import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { changeStudioMember, loadStudioMembers } from "@/services/studio-members";

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), headers: vi.fn() }));
vi.mock("@/services/staff-session", () => ({ staffHeaders: mocks.headers }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.headers.mockResolvedValue({ Authorization: "Bearer staff-token" });
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => vi.unstubAllGlobals());

it("loads member status with a verified staff token and no cached response", async () => {
  const members = [{ uid: "member", role: "reviewer", status: "frozen" }];
  mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true, members }) });
  expect(await loadStudioMembers()).toEqual(members);
  expect(mocks.fetch).toHaveBeenCalledWith("/api/admin/staff", { headers: { Authorization: "Bearer staff-token" }, cache: "no-store" });
});

it("freezes and restores through the Studio membership endpoint", async () => {
  mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  await changeStudioMember("member", "freeze");
  expect(mocks.fetch).toHaveBeenLastCalledWith("/api/admin/staff", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ uid: "member", action: "freeze" }) }));
  await changeStudioMember("member", "unfreeze");
  expect(mocks.fetch).toHaveBeenLastCalledWith("/api/admin/staff", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ uid: "member", action: "unfreeze" }) }));
});

it("removal targets only Studio access and safely encodes the member id", async () => {
  mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  await changeStudioMember("member&other=value", "remove");
  expect(mocks.fetch).toHaveBeenCalledExactlyOnceWith("/api/admin/staff?uid=member%26other%3Dvalue", { method: "DELETE", headers: { Authorization: "Bearer staff-token" } });
});

it("does not report a denied mutation as success", async () => {
  mocks.fetch.mockResolvedValue({ ok: false, json: async () => ({ error: "Administrator access required" }) });
  await expect(changeStudioMember("member", "remove")).rejects.toThrow("Administrator access required");
  await expect(loadStudioMembers()).rejects.toThrow("Administrator access required");
});
