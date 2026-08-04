"use client";

import { getFirebase } from "@/services/firebase";
import { collection, doc, setDoc, deleteDoc, query, where, getDocs } from "firebase/firestore";

interface PushUser {
  uid: string;
}

// Must be the public half of the VAPID pair the server signs with
// (VAPID_PRIVATE_KEY). Firebase's own Web Push certificate does not work here —
// its private half is never exposed, so web-push cannot sign for it.
const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export interface PushTokenDoc {
  token: string;
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
  userAgent: string;
  createdAt: number;
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window;
}

export function isPushConfigured(): boolean {
  return !!VAPID_KEY && VAPID_KEY.length > 0;
}

export function getPushStatus(): { supported: boolean; configured: boolean; permission: NotificationPermission } {
  return {
    supported: isPushSupported(),
    configured: isPushConfigured(),
    permission: typeof Notification !== "undefined" ? Notification.permission : "denied",
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function checkExistingSubscription(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return "denied";
  return Notification.requestPermission();
}

/**
 * True when the subscription was created with the VAPID key we currently sign
 * with. A stale key (e.g. one left over from the Firebase/FCM setup) produces a
 * subscription the server can never deliver to, so it has to be replaced.
 */
function matchesCurrentVapidKey(subscription: PushSubscription): boolean {
  const applied = subscription.options?.applicationServerKey;
  if (!applied) return false;
  const current = urlBase64ToUint8Array(VAPID_KEY);
  const existing = new Uint8Array(applied);
  if (existing.length !== current.length) return false;
  return existing.every((byte, i) => byte === current[i]);
}

export async function subscribeToPush(user: PushUser): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: "Push notifications are not supported on this browser." };
  }
  if (!isPushConfigured()) {
    return { success: false, error: "Push notifications are not configured yet. Please contact support." };
  }
  const { db } = getFirebase();
  if (!db) {
    return { success: false, error: "Unable to connect. Please try again." };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      if (matchesCurrentVapidKey(existing)) {
        await saveToken(user.uid, existing);
        return { success: true };
      }
      // Subscribed under a different VAPID key — drop it, then re-subscribe
      // below. Otherwise the browser throws InvalidStateError.
      await existing.unsubscribe();
      await deleteToken(user.uid, existing);
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_KEY) as unknown as BufferSource,
    });

    await saveToken(user.uid, subscription);
    return { success: true };
  } catch (e) {
    const msg = (e as Error)?.message ?? "";
    if (msg.includes("permission") || msg.includes("denied")) {
      return { success: false, error: "Notification permission was denied." };
    }
    if (msg.includes("VAPID") || msg.includes("applicationServerKey") || msg.includes("InvalidState")) {
      return { success: false, error: "Push notification setup failed. Please contact support." };
    }
    return { success: false, error: "Push subscription failed. Please try again." };
  }
}

export async function unsubscribeFromPush(user: PushUser): Promise<{ success: boolean }> {
  if (!isPushSupported()) return { success: true };
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      await deleteToken(user.uid, subscription);
    }
    return { success: true };
  } catch (e) {
    console.error("Failed to unsubscribe from push:", e);
    return { success: false };
  }
}

/**
 * Stable Firestore doc id for an endpoint URL, so re-subscribing overwrites the
 * same doc instead of piling up a duplicate on every toggle. Endpoints contain
 * "/" and cannot be used as ids directly.
 */
async function endpointDocId(endpoint: string): Promise<string> {
  try {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    // crypto.subtle needs a secure context; base64url is a fine fallback.
    return window.btoa(endpoint).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
}

async function saveToken(uid: string, subscription: PushSubscription): Promise<void> {
  const { db } = getFirebase();
  if (!db) return;
  try {
    const { endpoint } = subscription;
    const keys = subscription.toJSON().keys ?? {};
    const id = await endpointDocId(endpoint);
    await setDoc(doc(db, "users", uid, "pushTokens", id), {
      token: endpoint,
      endpoint,
      keys,
      userAgent: navigator.userAgent,
      createdAt: Date.now(),
    });
  } catch (e) {
    console.error("Failed to save push token:", e);
  }
}

async function deleteToken(uid: string, subscription: PushSubscription): Promise<void> {
  const { db } = getFirebase();
  if (!db) return;
  const { endpoint } = subscription;
  try {
    const id = await endpointDocId(endpoint);
    await deleteDoc(doc(db, "users", uid, "pushTokens", id));
  } catch (e) {
    console.error("Failed to delete push token:", e);
  }
  // Also clear any duplicates left behind by the older addDoc-based writes.
  try {
    const ref = collection(db, "users", uid, "pushTokens");
    const [byEndpoint, byToken] = await Promise.all([
      getDocs(query(ref, where("endpoint", "==", endpoint))),
      getDocs(query(ref, where("token", "==", endpoint))),
    ]);
    const seen = new Set<string>();
    for (const d of [...byEndpoint.docs, ...byToken.docs]) {
      if (seen.has(d.id)) continue;
      seen.add(d.id);
      await deleteDoc(d.ref);
    }
  } catch (e) {
    console.error("Failed to clear legacy push tokens:", e);
  }
}

/**
 * Cleans up push subscription for a given uid: deletes the Firestore token
 * doc and unsubscribes the browser.  Call on account switch (old uid) and
 * sign-out so stale tokens stop receiving reminders keyed to the old account.
 */
export async function cleanupPushTokens(uid: string): Promise<void> {
  if (!uid || !isPushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await deleteToken(uid, subscription);
      await subscription.unsubscribe();
    }
  } catch (e) {
    console.error("Failed to cleanup push tokens:", e);
  }
}

export async function getPushTokens(uid: string): Promise<PushTokenDoc[]> {
  const { db } = getFirebase();
  if (!db) return [];
  try {
    const ref = collection(db, "users", uid, "pushTokens");
    const snap = await getDocs(ref);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PushTokenDoc & { id: string }));
  } catch (e) {
    console.error("Failed to get push tokens:", e);
    return [];
  }
}
