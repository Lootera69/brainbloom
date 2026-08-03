import { useUserStore } from "@/store/user-store";

export function haptic(pattern: number | number[], force = false): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  if (!force && !useUserStore.getState().hapticsEnabled) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* vibration unavailable */
  }
}
