import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/leaderboard/route";

type UserData = Record<string, unknown>;
type Snapshot = { id: string; exists: boolean; data: () => UserData | undefined };
type Filter = { field: string; operator: string; value: number };
type Order = { field: string; direction: string };

const state = vi.hoisted(() => ({
  users: new Map<string, UserData>(),
  reads: [] as number[],
  aggregates: 0,
  configured: true,
  fail: false,
}));

class Query {
  constructor(
    private filters: Filter[] = [],
    private orders: Order[] = [],
    private maximum: number | null = null,
    private before: Snapshot | null = null,
    private fields: string[] | null = null,
  ) {}

  where(field: string, operator: string, value: number) {
    return new Query([...this.filters, { field, operator, value }], this.orders, this.maximum, this.before, this.fields);
  }

  orderBy(field: string, direction: string) {
    return new Query(this.filters, [...this.orders, { field, direction }], this.maximum, this.before, this.fields);
  }

  limit(maximum: number) {
    return new Query(this.filters, this.orders, maximum, this.before, this.fields);
  }

  select(...fields: string[]) {
    return new Query(this.filters, this.orders, this.maximum, this.before, fields);
  }

  endBefore(before: Snapshot) {
    return new Query(this.filters, this.orders, this.maximum, before, this.fields);
  }

  private compare(a: Snapshot, b: Snapshot) {
    for (const { field, direction } of this.orders) {
      const left = (field === "__name__" ? a.id : a.data()?.[field]) as string | number;
      const right = (field === "__name__" ? b.id : b.data()?.[field]) as string | number;
      const comparison = left < right ? -1 : left > right ? 1 : 0;
      if (comparison) return direction === "desc" ? -comparison : comparison;
    }
    return 0;
  }

  private matches() {
    if (state.fail) throw new Error("unavailable");
    return [...state.users].map(([id, data]) => ({ id, exists: true, data: () => data }))
      .filter((doc) => this.filters.every(({ field, operator, value }) => {
        const actual = doc.data()[field];
        if (typeof actual !== "number") return false;
        if (operator === ">") return actual > value;
        if (operator === ">=") return actual >= value;
        if (operator === "<") return actual < value;
        throw new Error(`Unexpected operator ${operator}`);
      }))
      .sort((a, b) => this.compare(a, b))
      .filter((doc) => !this.before || this.compare(doc, this.before) < 0);
  }

  async get() {
    expect(this.maximum).toBe(10);
    const docs = this.matches().slice(0, this.maximum ?? undefined);
    state.reads.push(docs.length);
    return {
      docs: docs.map((doc) => ({ ...doc, data: () => Object.fromEntries(
        Object.entries(doc.data()).filter(([key]) => !this.fields || this.fields.includes(key)),
      ) })),
    };
  }

  count() {
    expect(this.maximum).toBeNull();
    return { get: async () => {
      state.aggregates++;
      return { data: () => ({ count: this.matches().length }) };
    } };
  }

  doc(id: string) {
    return { get: async (): Promise<Snapshot> => ({ id, exists: state.users.has(id), data: () => state.users.get(id) }) };
  }
}

vi.mock("@/lib/push-send", () => ({ getAdminApp: () => state.configured ? {} : null }));
vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({ collection: (name: string) => {
    expect(name).toBe("users");
    return new Query();
  } }),
  FieldPath: { documentId: () => "__name__" },
}));

const monday = Date.parse("2026-10-05T00:00:00Z");
const week = 7 * 24 * 60 * 60 * 1000;
const request = (uid?: string, xp?: number) => new NextRequest(
  `https://example.test/api/leaderboard?${new URLSearchParams({ ...(uid ? { uid } : {}), ...(xp ? { xp: String(xp) } : {}) })}`,
);
const add = (uid: string, weeklyXp: number, weeklyStartDate = monday, extra: UserData = {}) => {
  state.users.set(uid, { weeklyXp, weeklyStartDate, ...extra });
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-06T08:00:00Z"));
  state.users.clear(); state.reads = []; state.aggregates = 0; state.configured = true; state.fail = false;
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

it("filters the current week before taking the top ten despite hundreds of stale high scores", async () => {
  for (let i = 0; i < 250; i++) add(`stale-${i}`, 10000 + i, monday - week);
  for (let i = 0; i < 12; i++) add(`current-${i}`, 100 + i, monday + i * 60_000);
  const response = await GET(request("current-11"));
  const body = await response.json();
  expect(body.leaders.map((entry: { uid: string }) => entry.uid)).toEqual(
    Array.from({ length: 10 }, (_, i) => `current-${11 - i}`),
  );
  expect(body.rank).toBe(1);
  expect(state.reads).toEqual([10]);
  expect(state.aggregates).toBe(0);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
});

it("returns an exact rank beyond the previous 200-record slice using the stored score", async () => {
  for (let i = 0; i < 240; i++) add(`player-${i}`, 1000 - i);
  for (let i = 0; i < 240; i++) add(`old-${i}`, 2000, monday - week);
  const body = await (await GET(request("player-239", 999999))).json();
  expect(body.rank).toBe(240);
  expect(state.reads).toEqual([10]);
  expect(state.aggregates).toBe(1);
});

it("supports both Monday-normalized and activity timestamps and excludes the next week", async () => {
  add("monday", 70, monday);
  add("later", 90, monday + 30 * 60 * 60 * 1000);
  add("sunday", 80, monday + week - 1);
  add("old", 1000, monday - 1);
  add("future", 1000, monday + week);
  add("empty", 0);
  add("negative", -1);
  const body = await (await GET(request("future"))).json();
  expect(body.leaders.map((entry: { uid: string }) => entry.uid)).toEqual(["later", "sunday", "monday"]);
  expect(body.rank).toBeNull();
  expect(state.aggregates).toBe(0);
});

it("uses stable week-timestamp and UID tie breaks for both listed and unlisted ranks", async () => {
  for (let i = 14; i >= 0; i--) add(`tied-${String(i).padStart(2, "0")}`, 100, monday + (i >= 12 ? 1000 : 0));
  const listed = await (await GET(request("tied-09"))).json();
  const unlisted = await (await GET(request("tied-14"))).json();
  expect(listed.leaders.map((entry: { uid: string }) => entry.uid)).toEqual(
    Array.from({ length: 10 }, (_, i) => `tied-${String(i).padStart(2, "0")}`),
  );
  expect(listed.rank).toBe(10);
  expect(unlisted.rank).toBe(15);
});

it("rolls over at Monday midnight UTC", async () => {
  add("ending-week", 100, monday);
  add("new-week", 20, monday + week);
  vi.setSystemTime(new Date(monday + week - 1));
  expect((await (await GET(request())).json()).leaders[0].uid).toBe("ending-week");
  vi.setSystemTime(new Date(monday + week));
  expect((await (await GET(request())).json()).leaders[0].uid).toBe("new-week");
});

it("returns only safe profile fields", async () => {
  add("safe", 10, monday, { displayName: " ", email: "private@example.test", timeZone: "Private", gems: 500, tier: "invalid", level: "bad" });
  expect((await (await GET(request())).json()).leaders).toEqual([{
    uid: "safe", displayName: "Anonymous", avatarId: null, photoURL: null, weeklyXp: 10, level: 1, tier: "free",
  }]);
});

it("keeps the leaderboard available when a supplied UID is absent or malformed", async () => {
  add("safe", 10);
  for (const uid of ["missing", "nested/path", "x".repeat(129)]) {
    const body = await (await GET(request(uid))).json();
    expect(body.leaders).toHaveLength(1);
    expect(body.rank).toBeNull();
    expect(body.unavailable).toBeUndefined();
  }
});

it("reports unavailable rather than presenting a failed query as an empty active week", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  state.fail = true;
  expect(await (await GET(request())).json()).toEqual({ leaders: [], rank: null, unavailable: true });
  state.configured = false;
  expect(await (await GET(request())).json()).toEqual({ leaders: [], rank: null, unavailable: true });
});
