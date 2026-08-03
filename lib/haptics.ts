import { useUserStore } from "@/store/user-store";

export function haptic(pattern: number | number[]): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  if (!useUserStore.getState().hapticsEnabled) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* vibration unavailable */
  }
}
