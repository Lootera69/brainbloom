"use client";

import { getFirebase } from "@/services/firebase";
import type { PlayerAction, PlayerResponse } from "@/lib/player-contract";

export class PlayerRequestError extends Error {
  constructor(message: string, public code = "unavailable") { super(message); }
}

export class PlayerApi {
  private pending = new Map<string, Record<string, unknown>>();

  constructor(private identity: () => { uid: string; getIdToken: () => Promise<string> } | null,
    private request: typeof fetch = fetch) {}

  send(action: PlayerAction): Promise<PlayerResponse> {
    return this.execute(action);
  }

  private async execute(action: PlayerAction): Promise<PlayerResponse> {
    const user = this.identity();
    if (!user) throw new PlayerRequestError("Sign in to earn rewards.", "sign-in-required");
    let token: string;
    try { token = await user.getIdToken(); }
    catch { throw new PlayerRequestError("Connect to the internet and sign in to earn rewards.", "sign-in-required"); }
    if (this.identity()?.uid !== user.uid) throw new PlayerRequestError("Your sign-in changed. Please retry.", "identity-changed");
    const key = `${user.uid}:${action.action === "answer" ? `answer:${action.sessionId}` : JSON.stringify(action)}`;
    const previous = this.pending.get(key);
    if (previous && JSON.stringify(Object.fromEntries(Object.entries(previous).filter(([key]) => key !== "requestId"))) !== JSON.stringify(action)) {
      throw new PlayerRequestError("Retry your previous answer before changing it.", "pending-answer");
    }
    const mutates = action.action !== "snapshot" && action.action !== "daily-set" && action.action !== "event-result";
    const command = previous ?? { ...action, ...(mutates ? { requestId: crypto.randomUUID() } : {}) };
    if (mutates) this.pending.set(key, command);
    let response: Response;
    let body;
    try {
      response = await this.request("/api/player", {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(command), cache: "no-store", signal: AbortSignal.timeout(20000),
      });
      body = await response.json();
    } catch { throw new PlayerRequestError("Your reward could not be confirmed. Connect to the internet and retry."); }
    if (this.identity()?.uid !== user.uid) {
      this.pending.delete(key);
      throw new PlayerRequestError("Your sign-in changed. Please retry.", "identity-changed");
    }
    if (!response.ok || body?.ok !== true) {
      if (response.status >= 400 && response.status < 500) this.pending.delete(key);
      throw new PlayerRequestError(typeof body?.error === "string" ? body.error : "Your reward could not be confirmed. Please retry.", body?.code);
    }
    const progress = body.progress;
    if (progress?.version !== 1 || !Number.isSafeInteger(progress.revision) || !Number.isFinite(body.serverTime)
      || !["xp", "gems", "hearts", "weeklyXp"].every((key) => Number.isSafeInteger(progress[key]) && progress[key] >= 0)) {
      throw new PlayerRequestError("Update the app to continue earning rewards.", "invalid-response");
    }
    this.pending.delete(key);
    return body as PlayerResponse;
  }
}

export const playerApi = new PlayerApi(() => getFirebase().auth?.currentUser ?? null);
