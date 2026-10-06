import { beforeEach, expect, it, vi } from "vitest";
import { loadUserData } from "@/services/user-service";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/services/firebase", () => ({ getFirebase: () => ({ db: {} }) }));
vi.mock("firebase/firestore", () => ({ doc: () => ({}), getDocFromServer: mocks.get, setDoc: vi.fn() }));
beforeEach(() => { mocks.get.mockReset(); });
it("rejects unavailable server reads instead of reporting a new user", async () => {
  mocks.get.mockRejectedValue(new Error("offline"));
  await expect(loadUserData("owner")).rejects.toThrow("offline");
});
it("returns null for a server-confirmed missing document", async () => {
  mocks.get.mockResolvedValue({ exists: () => false });
  await expect(loadUserData("owner")).resolves.toBeNull();
});
