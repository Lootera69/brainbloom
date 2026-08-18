import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type DocumentReference } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import webpush from "web-push";

// Web Push is one HTTP request per subscription, so cap how many are in
// flight at once rather than batching them into a single multicast call.
const MAX_CONCURRENT_SENDS = 25;
// FCM multicast is a single API call, but capped at 500 tokens per batch.
const FCM_BATCH_SIZE = 500;

export interface PushSubscriptionDoc {
  /** Browser web-push endpoint (when the entry is a web subscription). */
  endpoint?: string;
  keys?: { p256dh: string; auth: string };
  /** Native FCM registration token (`{ type: "fcm" }` entries). */
  fcmToken?: string;
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
      // Browser web-push subscription — both encryption keys are required;
      // anything without them predates the web-push migration and can never
      // be delivered.
      if (
        typeof endpoint === "string" &&
        endpoint.startsWith("http") &&
        typeof keys.p256dh === "string" &&
        typeof keys.auth === "string" &&
        !seen.has(endpoint)
      ) {
        seen.add(endpoint);
        subs.push({ endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth }, ref: d.ref, uid });
        return;
      }
      // Native FCM token (Flutter app, Phase-7 shape `{ type: "fcm", token }`).
      const fcmToken = typeof data.token === "string" && data.type === "fcm" ? data.token : "";
      if (fcmToken && !seen.has(fcmToken)) {
        seen.add(fcmToken);
        subs.push({ fcmToken, ref: d.ref, uid });
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

/** Payload fields shared by both delivery channels. */
interface PushPayload {
  title: string;
  body: string;
  url: string;
}

function parsePayload(payload: string): PushPayload | null {
  try {
    const parsed = JSON.parse(payload) as { title?: unknown; body?: unknown; data?: { url?: unknown } };
    return {
      title: String(parsed.title ?? "BrainBloom"),
      body: String(parsed.body ?? ""),
      url: String(parsed.data?.url ?? "/"),
    };
  } catch {
    return null;
  }
}

async function deliverWebPush(
  webSubs: PushSubscriptionDoc[],
  payload: string,
  db: ReturnType<typeof getFirestore>,
  stale: DocumentReference[],
): Promise<number> {
  let delivered = 0;
  let cursor = 0;
  const worker = async () => {
    while (cursor < webSubs.length) {
      const sub = webSubs[cursor++];
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint!, keys: sub.keys! }, payload, { TTL: 86400 });
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
  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT_SENDS, webSubs.length) }, worker));
  return delivered;
}

async function deliverFcm(
  fcmSubs: PushSubscriptionDoc[],
  payload: string,
  app: App,
  stale: DocumentReference[],
): Promise<number> {
  const parsed = parsePayload(payload);
  if (!parsed || fcmSubs.length === 0) return 0;
  const messaging = getMessaging(app);
  let delivered = 0;

  for (let i = 0; i < fcmSubs.length; i += FCM_BATCH_SIZE) {
    const chunk = fcmSubs.slice(i, i + FCM_BATCH_SIZE);
    const tokens = chunk.map((s) => s.fcmToken!);
    try {
      const res = await messaging.sendEachForMulticast({
        tokens,
        notification: { title: parsed.title, body: parsed.body },
        data: { url: parsed.url, tag: "brainbloom-notification" },
        android: { priority: "high" },
        apns: {
          payload: { aps: { "content-available": 1, sound: "default" } },
        },
      });
      res.responses.forEach((r, idx) => {
        if (r.success) {
          delivered++;
        } else {
          const code = r.error?.code;
          // A dead or revoked registration token can never be delivered again.
          if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token" || code === "messaging/registration-token-not-found") {
            stale.push(chunk[idx].ref);
          } else {
            console.error(`FCM send failed (${code}):`, r.error?.message);
          }
        }
      });
    } catch (e) {
      console.error("FCM multicast failed:", (e as Error)?.message);
    }
  }
  return delivered;
}

async function deliverSubscriptions(subs: PushSubscriptionDoc[], payload: string): Promise<{ delivered: number; removed: number }> {
  if (subs.length === 0) return { delivered: 0, removed: 0 };
  const app = getAdminApp();
  if (!app) return { delivered: 0, removed: 0 };
  const db = getFirestore(app);

  // FCM does not need VAPID — only browser web-push does. Without the VAPID
  // keys configured, FCM tokens are still delivered, web subscriptions are
  // skipped with a clear log line.
  const vapidOk = configureVapid();
  const webSubs = subs.filter((s) => s.endpoint && s.keys);
  const fcmSubs = subs.filter((s) => s.fcmToken);
  if (webSubs.length > 0 && !vapidOk) {
    console.error(`Skipping ${webSubs.length} web-push subscription(s) — VAPID keys are not configured.`);
  }

  const stale: DocumentReference[] = [];
  const [webDelivered, fcmDelivered] = await Promise.all([
    vapidOk ? deliverWebPush(webSubs, payload, db, stale) : Promise.resolve(0),
    deliverFcm(fcmSubs, payload, app, stale),
  ]);
  const delivered = webDelivered + fcmDelivered;

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
    title: "Rhythm, {streak} days deep",
    body: "Consistency is its own discipline. Return tomorrow and let the chain hold.",
  },
  completedFresh: {
    title: "The first stone is laid",
    body: "Your first completion is recorded. Step back tomorrow and a streak begins its hold.",
  },
  streakWarning: {
    title: "Your chain is still breathing",
    body: "A {streak}-day streak waits to endure. Finish today's challenge before midnight.",
  },
  freezeSafe: {
    title: "A shield stands ready",
    body: "Your {streak}-day chain is insured for tonight, but freezes are meant to stay unspent. Play and keep it clean.",
  },
  restart: {
    title: "Conclusions are not the end",
    body: "Your streak paused, but your training endures. One session today opens the next chapter.",
  },
  newUser: {
    title: "Your mind, exercised",
    body: "A single session begins the regimen. Start your first streak tonight.",
  },
};

function renderTemplate(template: EveningTemplate, streak: number): { title: string; body: string } {
  const t = EVENING_TEMPLATES[template];
  return { title: t.title.replace("{streak}", String(streak)), body: t.body.replace("{streak}", String(streak)) };
}

interface StreakState {
  playedToday: boolean;
  alive: boolean;
  streak: number;
}

const DAY_MS = 86400000;

/**
 * Mirrors the client's streak evaluation:
 *  - alive → the last active day is today/yesterday, or every missed day
 *    since then is covered by a streak freeze (same rule as the store's
 *    `freezesToConsume === missedDays` check)
 *  - streak → the stored count while alive, 0 once broken. The stored field
 *    is stale after a break (the app only rewrites it on its next open), so
 *    it can never be trusted without the liveness check above.
 */
function computeStreakState(
  now: Date,
  timeZone: string,
  lastActiveDate: string | null,
  storedStreak: number,
  activeDates: string[],
  frozenDays: string[],
): StreakState {
  const tz = timeZone || "Asia/Kolkata";
  const todayLocal = localDateStringAt(now, tz);
  const playedToday = lastActiveDate === todayLocal || activeDates.includes(todayLocal);

  let alive = false;
  if (lastActiveDate && /^[A-Z][a-z]{2} [A-Z][a-z]{2} \d{2} \d{4}$/.test(lastActiveDate)) {
    const lastMs = new Date(lastActiveDate).getTime();
    const todayMs = new Date(todayLocal).getTime();
    if (!Number.isNaN(lastMs) && !Number.isNaN(todayMs) && lastMs <= todayMs && todayMs - lastMs <= 370 * DAY_MS) {
      alive = true;
      for (let ms = lastMs + DAY_MS; ms < todayMs; ms += DAY_MS) {
        const gapDay = localDateStringAt(new Date(ms), tz);
        if (!frozenDays.includes(gapDay)) {
          alive = false;
          break;
        }
      }
    }
  }

  return { playedToday, alive, streak: alive ? Math.max(1, storedStreak) : 0 };
}

/**
 * Sends a streak-aware evening reminder to users whose local time is 7 PM.
 * Each user's message is picked from their own state, in their own local
 * date, and rendered with their own streak count:
 *  - Played today, chain ≥2 days  → completedStreak (rhythm deep)
 *  - Played today, chain ≤1 day   → completedFresh (first stone)
 *  - Chain alive, freezes in hand → freezeSafe (shield, don't spend it)
 *  - Chain alive, no freezes      → streakWarning (endangered tonight)
 *  - Chain broken, has history    → restart (rebuild)
 *  - Chain broken, brand new      → newUser (welcome nudge)
 * `forceLocalHour` is a CRON_SECRET-gated test override — it filters by that
 * local hour instead of 19 and bypasses the dedup marker.
 */
export async function sendEveningPushForLocalHour(utcHour: number, forceLocalHour?: number): Promise<EveningPushResult> {
  const empty: EveningPushResult = { tokenCount: 0, delivered: 0, failed: 0, removed: 0, hour: utcHour, skipped: false, eligibleUsers: 0, byTemplate: EMPTY_TEMPLATE_COUNTS };
  const app = getAdminApp();
  if (!app) return empty;
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
        let streakFreezes = 0;
        let lastActiveDate: string | null = null;
        let frozenDays: string[] = [];
        let activeDates: string[] = [];
        try {
          const userSnap = await userRef.get();
          const d = userSnap.data() ?? {};
          timeZone = (d.timeZone as string | null) ?? null;
          streak = (d.streak as number) ?? 0;
          streakFreezes = (d.streakFreezes as number) ?? 0;
          lastActiveDate = (d.lastActiveDate as string | null) ?? null;
          frozenDays = (d.frozenDays as string[]) ?? [];
          activeDates = (d.activeDates as string[]) ?? [];
        } catch {
          // fall back to defaults
        }
        if (localHourAt(now, timeZone ?? "Asia/Kolkata") !== (forceLocalHour ?? 19)) return;

        const subs = await readUserSubscriptions(userRef, seen, userRef.id);
        if (subs.length === 0) return;

        const st = computeStreakState(now, timeZone ?? "Asia/Kolkata", lastActiveDate, streak, activeDates, frozenDays);
        const hasHistory = activeDates.length > 0 || streak > 0;

        let template: EveningTemplate;
        if (st.playedToday && st.streak >= 2) {
          template = "completedStreak";
        } else if (st.playedToday) {
          template = "completedFresh";
        } else if (st.alive && st.streak >= 1 && streakFreezes > 0) {
          template = "freezeSafe";
        } else if (st.alive && st.streak >= 1) {
          template = "streakWarning";
        } else if (hasHistory) {
          template = "restart";
        } else {
          template = "newUser";
        }

        eveningUsers.push({ uid: userRef.id, template, streak: st.streak, subs });
      }),
    );
  } catch (e) {
    console.error("Failed to list users for evening push:", e);
  }

  // Group subscriptions by (template, streak) — every user's count must be
  // rendered on their own payload, never stamped from the first member.
  const byTemplate: EveningTemplateCounts = { ...EMPTY_TEMPLATE_COUNTS };
  const groups = new Map<string, { template: EveningTemplate; streak: number; subs: PushSubscriptionDoc[] }>();

  for (const u of eveningUsers) {
    byTemplate[u.template] += u.subs.length;
    const key = `${u.template}|${u.streak}`;
    const g = groups.get(key) ?? { template: u.template, streak: u.streak, subs: [] };
    g.subs.push(...u.subs);
    groups.set(key, g);
  }

  const url = "/learn";
  const tag = "brainbloom-notification";

  let totalDelivered = 0;
  let totalRemoved = 0;
  let totalFailed = 0;

  for (const g of groups.values()) {
    const { title, body } = renderTemplate(g.template, g.streak);
    const payload = JSON.stringify({ title, body, data: { url }, tag });
    const r = await deliverSubscriptions(g.subs, payload);
    totalDelivered += r.delivered;
    totalRemoved += r.removed;
    totalFailed += g.subs.length - r.delivered;
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
