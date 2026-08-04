import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type DocumentReference } from "firebase-admin/firestore";
import webpush from "web-push";

// Web Push is one HTTP request per subscription, so cap how many are in
// flight at once rather than batching them into a single multicast call.
const MAX_CONCURRENT_SENDS = 25;

export interface PushSubscriptionDoc {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  ref: DocumentReference;
  uid?: string;
}

export interface PushSendResult {
  tokenCount: number;
  delivered: number;
  failed: number;
  /** Expired subscriptions pruned from Firestore during this send. */
  removed: number;
}

export function getAdminApp(): App | null {
  const existing = getApps().find((a) => a.name === "brainbloom");
  if (existing) return existing;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT ?? "";
  if (!raw) return null;
  try {
    const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const serviceAccount = JSON.parse(json);
    return initializeApp({ credential: cert(serviceAccount) }, "brainbloom");
  } catch (e) {
    console.error("Failed to initialize Firebase Admin:", e);
    return null;
  }
}

/** Configures the VAPID keypair. Returns false when the keys are missing. */
function configureVapid(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
  if (!publicKey || !privateKey) {
    console.error("VAPID keys are not configured — set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.");
    return false;
  }
  const subject = process.env.VAPID_SUBJECT ?? "https://brainblooms.vercel.app";
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    return true;
  } catch (e) {
    console.error("Invalid VAPID configuration:", e);
    return false;
  }
}

export async function verifyAdminCredentials(code: string, password: string): Promise<boolean> {
  const app = getAdminApp();
  if (!app) return false;
  try {
    const snap = await getFirestore(app).doc("settings/studio").get();
    if (!snap.exists) return false;
    const codes = (snap.data()?.codes ?? []) as { code?: string; password?: string; role?: string }[];
    const entry = codes.find((c) => c.code === code && c.password === password);
    return entry?.role === "admin";
  } catch (e) {
    console.error("verifyAdminCredentials failed:", e);
    return false;
  }
}

async function readUserSubscriptions(userRef: DocumentReference, seen: Set<string>, uid: string): Promise<PushSubscriptionDoc[]> {
  const subs: PushSubscriptionDoc[] = [];
  try {
    const snap = await userRef.collection("pushTokens").get();
    snap.forEach((d) => {
      const data = d.data() ?? {};
      const endpoint = data.endpoint ?? data.token;
      const keys = data.keys ?? {};
      // Both encryption keys are required — a subscription without them
      // predates the web-push migration and can never be delivered.
      if (
        typeof endpoint === "string" &&
        endpoint.startsWith("http") &&
        typeof keys.p256dh === "string" &&
        typeof keys.auth === "string" &&
        !seen.has(endpoint)
      ) {
        seen.add(endpoint);
        subs.push({ endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth }, ref: d.ref, uid });
      }
    });
  } catch {
    // skip users without token subcollection access
  }
  return subs;
}

async function getAllSubscriptions(): Promise<PushSubscriptionDoc[]> {
  const app = getAdminApp();
  if (!app) return [];
  const db = getFirestore(app);
  const subs: PushSubscriptionDoc[] = [];
  const seen = new Set<string>();
  try {
    const users = await db.collection("users").listDocuments();
    await Promise.all(
      users.map(async (userRef) => {
        subs.push(...(await readUserSubscriptions(userRef, seen, userRef.id)));
      }),
    );
  } catch (e) {
    console.error("Failed to list push tokens:", e);
  }
  return subs;
}

async function deliverSubscriptions(subs: PushSubscriptionDoc[], payload: string): Promise<{ delivered: number; removed: number }> {
  if (subs.length === 0) return { delivered: 0, removed: 0 };
  const app = getAdminApp();
  if (!app) return { delivered: 0, removed: 0 };
  const db = getFirestore(app);

  let delivered = 0;
  const stale: DocumentReference[] = [];
  let cursor = 0;

  const worker = async () => {
    while (cursor < subs.length) {
      const sub = subs[cursor++];
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload, { TTL: 86400 });
        delivered++;
      } catch (e) {
        const status = (e as { statusCode?: number })?.statusCode;
        // 404/410 mean the browser dropped the subscription for good.
        if (status === 404 || status === 410) {
          stale.push(sub.ref);
        } else {
          console.error(`Push send failed (${status ?? "no status"}):`, (e as Error)?.message);
        }
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT_SENDS, subs.length) }, worker));

  let removed = 0;
  if (stale.length) {
    for (let i = 0; i < stale.length; i += 400) {
      const batch = db.batch();
      const chunk = stale.slice(i, i + 400);
      chunk.forEach((ref) => batch.delete(ref));
      try {
        await batch.commit();
        removed += chunk.length;
      } catch (e) {
        console.error("Failed to prune expired push subscriptions:", e);
      }
    }
  }

  return { delivered, removed };
}

export async function sendPushToAll(title: string, body: string, url: string): Promise<PushSendResult> {
  const empty: PushSendResult = { tokenCount: 0, delivered: 0, failed: 0, removed: 0 };
  const app = getAdminApp();
  if (!app) return empty;
  if (!configureVapid()) return empty;

  const subs = await getAllSubscriptions();
  // Matches the shape public/sw.js reads in its `push` handler.
  const payload = JSON.stringify({ title, body, data: { url }, tag: "brainbloom-notification" });

  const { delivered, removed } = await deliverSubscriptions(subs, payload);
  return { tokenCount: subs.length, delivered, failed: subs.length - delivered, removed };
}

/** Local hour (0-23) in the given IANA timezone at the given instant. Returns -1 when the zone is invalid. */
function localHourAt(now: Date, timeZone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", hourCycle: "h23" }).formatToParts(now);
    const hour = parts.find((p) => p.type === "hour")?.value;
    return hour ? Number(hour) : -1;
  } catch {
    return -1;
  }
}

export interface HourlyPushResult extends PushSendResult {
  hour: number;
  /** True when this (UTC date, UTC hour) bucket was already handled by another run. */
  skipped: boolean;
  eligibleUsers: number;
}

/**
 * Sends the reminder to users whose local time is 7 AM during the given UTC hour.
 * The (date, hour) bucket is claimed atomically in Firestore so a backup trigger
 * (Vercel cron at 01:30 UTC) never double-sends what the hourly cron already delivered.
 */
/**
 * Sends the reminder to users whose local time matches `targetLocalHour`
 * during the given UTC hour. The (date, hour) bucket is claimed atomically
 * in Firestore so a backup trigger never double-sends.
 */
export async function sendPushForLocalHour(
  utcHour: number,
  targetLocalHour: number,
  title: string,
  body: string,
  url: string,
): Promise<HourlyPushResult> {
  const empty: HourlyPushResult = { tokenCount: 0, delivered: 0, failed: 0, removed: 0, hour: utcHour, skipped: false, eligibleUsers: 0 };
  const app = getAdminApp();
  if (!app) return empty;
  if (!configureVapid()) return empty;
  const db = getFirestore(app);

  const today = new Date().toISOString().split("T")[0];
  const markerRef = db.doc("settings/reminder-hourly");

  let claimed: boolean;
  try {
    claimed = await db.runTransaction(async (t) => {
      const snap = await t.get(markerRef);
      const cur = snap.exists ? (snap.data() ?? {}) : {};
      if (cur.date === today && cur.hour === utcHour) return false;
      t.set(markerRef, { date: today, hour: utcHour, updatedAt: Date.now() });
      return true;
    });
  } catch (e) {
    console.error("reminder-hourly marker claim failed:", e);
    return { ...empty, skipped: true };
  }
  if (!claimed) return { ...empty, skipped: true };

  const now = new Date();
  const subs: PushSubscriptionDoc[] = [];
  const seen = new Set<string>();
  let eligibleUsers = 0;
  try {
    const users = await db.collection("users").listDocuments();
    await Promise.all(
      users.map(async (userRef) => {
        let timeZone: string | null = null;
        try {
          const userSnap = await userRef.get();
          timeZone = (userSnap.data()?.timeZone as string | null) ?? null;
        } catch {
          // fall back to the legacy default below
        }
        // Users without a stored timezone keep the India-morning default so
        // pre-regional builds never silently lose their reminder.
        if (localHourAt(now, timeZone ?? "Asia/Kolkata") !== targetLocalHour) return;
        eligibleUsers++;
        subs.push(...(await readUserSubscriptions(userRef, seen, userRef.id)));
      }),
    );
  } catch (e) {
    console.error("Failed to list users for hourly push:", e);
  }

  const payload = JSON.stringify({ title, body, data: { url }, tag: "brainbloom-notification" });
  const { delivered, removed } = await deliverSubscriptions(subs, payload);
  return { tokenCount: subs.length, delivered, failed: subs.length - delivered, removed, hour: utcHour, skipped: false, eligibleUsers };
}

/** Local `toDateString()` (e.g. "Tue Aug 04 2026") in the given timezone. Matches the client's stored date formats. */
function localDateStringAt(now: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return `${get("weekday")} ${get("month")} ${get("day")} ${get("year")}`;
  } catch {
    return now.toDateString();
  }
}

export interface EveningTemplateCounts {
  completedStreak: number;
  completedFresh: number;
  streakWarning: number;
  freezeSafe: number;
  restart: number;
  newUser: number;
}

const EMPTY_TEMPLATE_COUNTS: EveningTemplateCounts = {
  completedStreak: 0,
  completedFresh: 0,
  streakWarning: 0,
  freezeSafe: 0,
  restart: 0,
  newUser: 0,
};

export interface EveningPushResult extends HourlyPushResult {
  /** Subscription counts per message template. */
  byTemplate: EveningTemplateCounts;
}

type EveningTemplate = keyof EveningTemplateCounts;

interface EveningUser {
  uid: string;
  template: EveningTemplate;
  streak: number;
  subs: PushSubscriptionDoc[];
}

const EVENING_TEMPLATES: Record<EveningTemplate, { title: string; body: string }> = {
  completedStreak: {
    title: "Nice work today!",
    body: "You're on a {streak}-day streak. Keep it going tomorrow!",
  },
  completedFresh: {
    title: "Great job today!",
    body: "You started a fresh streak. Come back tomorrow to keep it alive!",
  },
  streakWarning: {
    title: "Don't lose your {streak}-day streak!",
    body: "Complete today's puzzle before midnight to keep it alive.",
  },
  freezeSafe: {
    title: "Your streak is safe for today",
    body: "A streak freeze covered today. Come back tomorrow!",
  },
  restart: {
    title: "Start fresh",
    body: "Your streak ended — but a new one starts today. Rebuild it!",
  },
  newUser: {
    title: "Your daily puzzle is waiting",
    body: "A fresh brain workout is ready. Start your first streak today!",
  },
};

function renderTemplate(template: EveningTemplate, streak: number): { title: string; body: string } {
  const t = EVENING_TEMPLATES[template];
  return { title: t.title.replace("{streak}", String(streak)), body: t.body.replace("{streak}", String(streak)) };
}

/**
 * Sends a streak-aware evening reminder to users whose local time is 7 PM.
 * Each user's message is picked from the current state, in the user's own
 * local date:
 *  - Played today + streak>0   → completedStreak (celebrate)
 *  - Played today, no streak   → completedFresh (first step)
 *  - Freeze covering today     → freezeSafe (no warning needed)
 *  - Didn't play + streak live → streakWarning (endangered)
 *  - Didn't play + broken      → restart (rebuild)
 *  - Didn't play + brand new   → newUser (welcome nudge)
 * `forceLocalHour` is a CRON_SECRET-gated test override — it filters by that
 * local hour instead of 19 and bypasses the dedup marker.
 */
export async function sendEveningPushForLocalHour(utcHour: number, forceLocalHour?: number): Promise<EveningPushResult> {
  const empty: EveningPushResult = { tokenCount: 0, delivered: 0, failed: 0, removed: 0, hour: utcHour, skipped: false, eligibleUsers: 0, byTemplate: EMPTY_TEMPLATE_COUNTS };
  const app = getAdminApp();
  if (!app) return empty;
  if (!configureVapid()) return empty;
  const db = getFirestore(app);

  const today = new Date().toISOString().split("T")[0];
  const isTest = forceLocalHour !== undefined;

  if (!isTest) {
    const markerRef = db.doc("settings/reminder-hourly-evening");
    let claimed: boolean;
    try {
      claimed = await db.runTransaction(async (t) => {
        const snap = await t.get(markerRef);
        const cur = snap.exists ? (snap.data() ?? {}) : {};
        if (cur.date === today && cur.hour === utcHour) return false;
        t.set(markerRef, { date: today, hour: utcHour, updatedAt: Date.now() });
        return true;
      });
    } catch (e) {
      console.error("reminder-hourly-evening marker claim failed:", e);
      return { ...empty, skipped: true };
    }
    if (!claimed) return { ...empty, skipped: true };
  }

  const now = new Date();
  const eveningUsers: EveningUser[] = [];
  const seen = new Set<string>();

  try {
    const users = await db.collection("users").listDocuments();
    await Promise.all(
      users.map(async (userRef) => {
        let timeZone: string | null = null;
        let streak = 0;
        let lastActiveDate: string | null = null;
        let dailyPuzzleCompletedDate: string | null = null;
        let frozenDays: string[] = [];
        let activeDates: string[] = [];
        try {
          const userSnap = await userRef.get();
          const d = userSnap.data() ?? {};
          timeZone = (d.timeZone as string | null) ?? null;
          streak = (d.streak as number) ?? 0;
          lastActiveDate = (d.lastActiveDate as string | null) ?? null;
          dailyPuzzleCompletedDate = (d.dailyPuzzleCompletedDate as string | null) ?? null;
          frozenDays = (d.frozenDays as string[]) ?? [];
          activeDates = (d.activeDates as string[]) ?? [];
        } catch {
          // fall back to defaults
        }
        if (localHourAt(now, timeZone ?? "Asia/Kolkata") !== (forceLocalHour ?? 19)) return;

        const subs = await readUserSubscriptions(userRef, seen, userRef.id);
        if (subs.length === 0) return;

        const tz = timeZone ?? "Asia/Kolkata";
        const todayLocal = localDateStringAt(now, tz);
        const yesterdayLocal = localDateStringAt(new Date(now.getTime() - 86400000), tz);

        const playedToday = activeDates.includes(todayLocal) || dailyPuzzleCompletedDate === todayLocal;
        const freezeCoversToday = frozenDays.includes(todayLocal);
        const streakAlive = lastActiveDate === todayLocal || lastActiveDate === yesterdayLocal;
        const hasHistory = activeDates.length > 0 || streak > 0;

        let template: EveningTemplate;
        if (playedToday && streak > 0) {
          template = "completedStreak";
        } else if (playedToday) {
          template = "completedFresh";
        } else if (freezeCoversToday) {
          template = "freezeSafe";
        } else if (streakAlive && streak > 0) {
          template = "streakWarning";
        } else if (hasHistory) {
          template = "restart";
        } else {
          template = "newUser";
        }

        eveningUsers.push({ uid: userRef.id, template, streak, subs });
      }),
    );
  } catch (e) {
    console.error("Failed to list users for evening push:", e);
  }

  // Group subscriptions by message template, then send one batch per group.
  const byTemplate: EveningTemplateCounts = { ...EMPTY_TEMPLATE_COUNTS };
  const groups: Record<EveningTemplate, PushSubscriptionDoc[]> = {
    completedStreak: [],
    completedFresh: [],
    streakWarning: [],
    freezeSafe: [],
    restart: [],
    newUser: [],
  };

  for (const u of eveningUsers) {
    groups[u.template].push(...u.subs);
    byTemplate[u.template] += u.subs.length;
  }

  const url = "/learn";
  const tag = "brainbloom-notification";

  let totalDelivered = 0;
  let totalRemoved = 0;
  let totalFailed = 0;

  for (const template of Object.keys(groups) as EveningTemplate[]) {
    const subs = groups[template];
    if (subs.length === 0) continue;
    const streak = eveningUsers.find((u) => u.template === template)?.streak ?? 0;
    const { title, body } = renderTemplate(template, streak);
    const payload = JSON.stringify({ title, body, data: { url }, tag });
    const r = await deliverSubscriptions(subs, payload);
    totalDelivered += r.delivered;
    totalRemoved += r.removed;
    totalFailed += subs.length - r.delivered;
  }

  const tokenCount = eveningUsers.reduce((sum, u) => sum + u.subs.length, 0);
  return {
    tokenCount,
    delivered: totalDelivered,
    failed: totalFailed,
    removed: totalRemoved,
    hour: utcHour,
    skipped: false,
    eligibleUsers: eveningUsers.length,
    byTemplate,
  };
}
