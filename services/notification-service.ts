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

function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window;
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

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return "denied";
  return Notification.requestPermission();
}

export async function subscribeToPush(user: PushUser): Promise<string | null> {
  if (!isPushSupported() || !VAPID_KEY) return null;
  const { db } = getFirebase();
  if (!db) return null;

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    const endpoint = existing.toJSON().endpoint;
    if (endpoint) {
      await saveToken(user.uid, endpoint);
      return endpoint;
    }
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_KEY) as unknown as BufferSource,
  });

  const newEndpoint = subscription.toJSON().endpoint;
  if (newEndpoint) {
    await saveToken(user.uid, newEndpoint);
    return newEndpoint;
  }
  return null;
}

export async function unsubscribeFromPush(user: PushUser): Promise<void> {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    const endpoint = subscription.toJSON().endpoint;
    if (endpoint) {
      await subscription.unsubscribe();
      await deleteToken(user.uid, endpoint);
    }
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
    return snap.docs.map((d: typeof snap.docs[0]) => ({ id: d.id, ...d.data() } as PushTokenDoc & { id: string }));
  } catch (e) {
    console.error("Failed to get push tokens:", e);
    return [];
  }
}