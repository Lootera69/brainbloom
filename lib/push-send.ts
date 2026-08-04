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

/** Fetch today's daily puzzle ID from Firestore (admin SDK). Returns null when unavailable. */
async function getDailyPuzzleIdForServer(): Promise<string | null> {
  const app = getAdminApp();
  if (!app) return null;
  const db = getFirestore(app);
  const today = new Date().toISOString().split("T")[0];
  try {
    const snap = await db.doc("settings/daily-puzzle").get();
    if (snap.exists) {
      const data = snap.data() ?? {};
      if (data.date === today && typeof data.puzzleId === "string") return data.puzzleId;
    }
  } catch {
    // ignore
  }
  return null;
}

interface EveningUser {
  uid: string;
  streak: number;
  completedToday: boolean;
  subs: PushSubscriptionDoc[];
}

export interface EveningPushResult extends HourlyPushResult {
  completedCount: number;
  missedCount: number;
  freshCount: number;
}

/**
 * Sends a streak-aware evening reminder to users whose local time is 7 PM.
 * Reads each user's streak + completedPuzzleIds to personalise the message:
 *  - Completed today  → congratulatory
 *  - Missed + streak>0 → streak warning
 *  - Missed + streak=0 → fresh start nudge
 */
export async function sendEveningPushForLocalHour(utcHour: number): Promise<EveningPushResult> {
  const empty: EveningPushResult = { tokenCount: 0, delivered: 0, failed: 0, removed: 0, hour: utcHour, skipped: false, eligibleUsers: 0, completedCount: 0, missedCount: 0, freshCount: 0 };
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

  const dailyPuzzleId = await getDailyPuzzleIdForServer();
  const now = new Date();
  const eveningUsers: EveningUser[] = [];
  const seen = new Set<string>();

  try {
    const users = await db.collection("users").listDocuments();
    await Promise.all(
      users.map(async (userRef) => {
        let timeZone: string | null = null;
        let streak = 0;
        let completedPuzzleIds: string[] = [];
        try {
          const userSnap = await userRef.get();
          const d = userSnap.data() ?? {};
          timeZone = (d.timeZone as string | null) ?? null;
          streak = (d.streak as number) ?? 0;
          completedPuzzleIds = (d.completedPuzzleIds as string[]) ?? [];
        } catch {
          // fall back to defaults
        }
        if (localHourAt(now, timeZone ?? "Asia/Kolkata") !== 19) return;

        const subs = await readUserSubscriptions(userRef, seen, userRef.id);
        if (subs.length === 0) return;

        eveningUsers.push({
          uid: userRef.id,
          streak,
          completedToday: dailyPuzzleId ? completedPuzzleIds.includes(dailyPuzzleId) : false,
          subs,
        });
      }),
    );
  } catch (e) {
    console.error("Failed to list users for evening push:", e);
  }

  // Group subscriptions by message type, then send one batch per group.
  const completedSubs: PushSubscriptionDoc[] = [];
  const missedSubs: PushSubscriptionDoc[] = [];
  const freshSubs: PushSubscriptionDoc[] = [];

  for (const u of eveningUsers) {
    if (u.completedToday) {
      completedSubs.push(...u.subs);
    } else if (u.streak > 0) {
      missedSubs.push(...u.subs);
    } else {
      freshSubs.push(...u.subs);
    }
  }

  const url = "/learn";
  const tag = "brainbloom-notification";

  let totalDelivered = 0;
  let totalRemoved = 0;
  let totalFailed = 0;

  if (completedSubs.length) {
    const payload = JSON.stringify({
      title: "Nice work today!",
      body: `Your streak is ${eveningUsers.find((u) => u.completedToday)?.streak ?? 0} days. Keep it going tomorrow!`,
      data: { url },
      tag,
    });
    const r = await deliverSubscriptions(completedSubs, payload);
    totalDelivered += r.delivered;
    totalRemoved += r.removed;
    totalFailed += completedSubs.length - r.delivered;
  }

  if (missedSubs.length) {
    const payload = JSON.stringify({
      title: "Don't lose your streak!",
      body: "Complete today's puzzle before midnight to keep it alive.",
      data: { url },
      tag,
    });
    const r = await deliverSubscriptions(missedSubs, payload);
    totalDelivered += r.delivered;
    totalRemoved += r.removed;
    totalFailed += missedSubs.length - r.delivered;
  }

  if (freshSubs.length) {
    const payload = JSON.stringify({
      title: "Your daily puzzle is waiting",
      body: "Start a new streak today!",
      data: { url },
      tag,
    });
    const r = await deliverSubscriptions(freshSubs, payload);
    totalDelivered += r.delivered;
    totalRemoved += r.removed;
    totalFailed += freshSubs.length - r.delivered;
  }

  const tokenCount = completedSubs.length + missedSubs.length + freshSubs.length;
  return {
    tokenCount,
    delivered: totalDelivered,
    failed: totalFailed,
    removed: totalRemoved,
    hour: utcHour,
    skipped: false,
    eligibleUsers: eveningUsers.length,
    completedCount: completedSubs.length,
    missedCount: missedSubs.length,
    freshCount: freshSubs.length,
  };
}
