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
}

export interface PushSendResult {
  tokenCount: number;
  delivered: number;
  failed: number;
  /** Expired subscriptions pruned from Firestore during this send. */
  removed: number;
}

function getAdminApp(): App | null {
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
              subs.push({ endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth }, ref: d.ref });
            }
          });
        } catch {
          // skip users without token subcollection access
        }
      }),
    );
  } catch (e) {
    console.error("Failed to list push tokens:", e);
  }
  return subs;
}

export async function sendPushToAll(title: string, body: string, url: string): Promise<PushSendResult> {
  const empty: PushSendResult = { tokenCount: 0, delivered: 0, failed: 0, removed: 0 };
  const app = getAdminApp();
  if (!app) return empty;
  if (!configureVapid()) return empty;

  const subs = await getAllSubscriptions();
  // Matches the shape public/sw.js reads in its `push` handler.
  const payload = JSON.stringify({ title, body, data: { url }, tag: "brainbloom-notification" });

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
    const db = getFirestore(app);
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

  return { tokenCount: subs.length, delivered, failed: subs.length - delivered, removed };
}
