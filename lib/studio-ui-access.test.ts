import { describe, expect, it } from "vitest";
import { canVisitStudioPath, memberActions, type StudioMember } from "@/lib/studio-ui-access";

const member: StudioMember = { uid: "member", email: "member@example.test", role: "contributor", status: "active", createdAt: 1 };

describe("Studio role navigation", () => {
  it("limits reviewers to dashboard and review queue including direct URLs", () => {
    expect(canVisitStudioPath("reviewer", "/studio")).toBe(true);
    expect(canVisitStudioPath("reviewer", "/studio/review")).toBe(true);
    for (const path of ["/studio/create", "/studio/import", "/studio/edit/example", "/studio/settings", "/studio/analytics", "/studio/events", "/studio/users", "/studio/seed", "/studio/ciphers", "/studio/unknown"]) {
      expect(canVisitStudioPath("reviewer", path), path).toBe(false);
    }
  });
  it("keeps contributor authoring and administrator management access", () => {
    expect(canVisitStudioPath("contributor", "/studio/create")).toBe(true);
    expect(canVisitStudioPath("contributor", "/studio/edit/example")).toBe(true);
    expect(canVisitStudioPath("contributor", "/studio/review")).toBe(false);
    expect(canVisitStudioPath("contributor", "/studio/users/example")).toBe(false);
    expect(canVisitStudioPath("admin", "/studio/users")).toBe(true);
    expect(canVisitStudioPath("admin", "/studio/review")).toBe(true);
    expect(canVisitStudioPath(null, "/studio")).toBe(false);
  });
});

describe("Studio membership controls", () => {
  it("offers reversible freeze and remove for contributors and reviewers", () => {
    expect(memberActions(member, "administrator", "admin")).toEqual(["freeze", "remove"]);
    expect(memberActions({ ...member, role: "reviewer", status: "frozen" }, "administrator", "admin")).toEqual(["unfreeze", "remove"]);
  });
  it("never offers controls for self, administrators, or removed members", () => {
    expect(memberActions(member, member.uid, "admin")).toEqual([]);
    expect(memberActions({ ...member, role: "admin" }, "administrator", "admin")).toEqual([]);
    expect(memberActions({ ...member, status: "removed" }, "administrator", "admin")).toEqual([]);
  });
  it("does not offer management controls to non-administrators", () => {
    for (const role of ["reviewer", "contributor", null]) expect(memberActions(member, "other", role)).toEqual([]);
    expect(memberActions(member, null, "admin")).toEqual([]);
  });
});
