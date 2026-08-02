"use client";

import { getFirebase } from "@/services/firebase";
import { collection, addDoc, deleteDoc, query, where, getDocs } from "firebase/firestore";

interface PushUser {
  uid: string;
}

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "";

export interface PushTokenDoc {
  token: string;
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
      const endpoint = existing.toJSON().endpoint;
      if (endpoint) {
        await saveToken(user.uid, endpoint);
        return { success: true };
      }
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_KEY) as unknown as BufferSource,
    });

    const newEndpoint = subscription.toJSON().endpoint;
    if (newEndpoint) {
      await saveToken(user.uid, newEndpoint);
      return { success: true };
    }
    return { success: false, error: "Failed to create push subscription." };
  } catch (e) {
    const msg = (e as Error)?.message ?? "";
    if (msg.includes("permission") || msg.includes("denied")) {
      return { success: false, error: "Notification permission was denied." };
    }
    if (msg.includes("VAPID") || msg.includes("applicationServerKey")) {
      return { success: false, error: "Push notification setup failed. Please contact support." };
    }
    return { success: false, error: "Push subscription failed. Please try again." };
  }
}

export async function unsubscribeFromPush(user: PushUser): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.toJSON().endpoint;
      if (endpoint) {
        await subscription.unsubscribe();
        await deleteToken(user.uid, endpoint);
      }
    }
  } catch (e) {
    console.error("Failed to unsubscribe from push:", e);
  }
}

async function saveToken(uid: string, token: string): Promise<void> {
  const { db } = getFirebase();
  if (!db) return;
  try {
    const ref = collection(db, "users", uid, "pushTokens");
    await addDoc(ref, {
      token,
      userAgent: navigator.userAgent,
      createdAt: Date.now(),
    });
  } catch (e) {
    console.error("Failed to save push token:", e);
  }
}

async function deleteToken(uid: string, token: string): Promise<void> {
  const { db } = getFirebase();
  if (!db) return;
  try {
    const ref = collection(db, "users", uid, "pushTokens");
    const q = query(ref, where("token", "==", token));
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
  } catch (e) {
    console.error("Failed to delete push token:", e);
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
