"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, X, Heart, Shield } from "lucide-react";
import { AvatarDisplay } from "@/components/avatars/AvatarDisplay";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deleteUserData } from "@/services/user-service";
import { useUserStore } from "@/store/user-store";
import { toast } from "sonner";

const SOFT_MESSAGES = [
  "Are you sure? Your avatar will miss you!",
  "Wait... we were just getting started!",
  "Think of all the puzzles you've conquered!",
  "Your brain has come so far...",
];

const SAD_MESSAGES = [
  "Your avatar has abandonment issues...",
  "Your streak will miss you so much!",
  "Who will solve the puzzles now?",
  "Your XP is crying in binary...",
  "The puzzles need a hero like you!",
  "Your achievements are gathering dust...",
  "Even your hearts are broken 💔",
  "Your gems will lose their sparkle...",
  "The daily puzzle will be lonely...",
  "Your brain training streak... gone forever.",
];

interface DeleteAccountDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  isGuest: boolean;
  avatarId: string | null;
  photoURL: string | null;
  displayName: string;
  email?: string;
}

type Step = "soft" | "final" | "reauth" | "processing" | "done";

export function DeleteAccountDialog({
  open,
  onClose,
  userId,
  isGuest,
  avatarId,
  photoURL,
  displayName,
  email,
}: DeleteAccountDialogProps) {
  const logout = useUserStore((s) => s.logout);
  const [step, setStep] = useState<Step>("soft");
  const [softTimer, setSoftTimer] = useState(5);
  const [finalTimer, setFinalTimer] = useState(10);
  const [messageIdx, setMessageIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reauthPassword, setReauthPassword] = useState("");
  const [reauthError, setReauthError] = useState<string | null>(null);
  const [isGoogle, setIsGoogle] = useState(true);

  useEffect(() => {
    if (!open || step !== "soft") return;
    setSoftTimer(5);
    const id = setInterval(() => {
      setSoftTimer((t) => (t <= 1 ? (clearInterval(id), 0) : t - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [open, step]);

  useEffect(() => {
    if (!open || step !== "final") return;
    setFinalTimer(10);
    const id = setInterval(() => {
      setFinalTimer((t) => (t <= 1 ? (clearInterval(id), 0) : t - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [open, step]);

  useEffect(() => {
    if (!open || step !== "final") return;
    const id = setInterval(() => {
      setMessageIdx((i) => (i + 1) % SAD_MESSAGES.length);
    }, 3500);
    return () => clearInterval(id);
  }, [open, step]);

  useEffect(() => {
    if (!open) {
      setStep("soft");
      setError(null);
      setDeleting(false);
      setMessageIdx(0);
      setReauthPassword("");
      setReauthError(null);
    }
  }, [open]);

  const cleanupAfterDelete = useCallback(async () => {
    try {
      await deleteUserData(userId);
    } catch { /* Auth user deleted — Firestore orphan is acceptable */ }

    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith("brainbloom")) localStorage.removeItem(key);
    }
    logout();
    setStep("done");
    toast.success("Your account was deleted. Sorry to see you go!", { position: "top-center" });
    setTimeout(() => { window.location.href = "/login"; }, 1200);
  }, [userId, logout]);

  const performDelete = useCallback(async () => {
    setDeleting(true);
    setStep("processing");
    setError(null);

    if (!navigator.onLine) {
      setDeleting(false);
      setStep("final");
      setError("You appear to be offline. Please check your connection and try again.");
      return;
    }

    if (isGuest) {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith("brainbloom")) localStorage.removeItem(key);
      }
      logout();
      setStep("done");
      toast.success("Guest data cleared. See you next time!", { position: "top-center" });
      setTimeout(() => { window.location.href = "/login"; }, 1200);
      return;
    }

    try {
      const { deleteAccount, isGoogleUser } = await import("@/services/firebase");
      const result = await deleteAccount();

      if (!result.success) {
        if (result.needsReauth) {
          const googleUser = isGoogleUser();
          setIsGoogle(googleUser);
          setDeleting(false);
          setStep("reauth");
          return;
        }
        setDeleting(false);
        setStep("final");
        setError(result.error ?? "Deletion failed. Please try again.");
        return;
      }

      await cleanupAfterDelete();
    } catch {
      setDeleting(false);
      setStep("final");
      setError("An unexpected error occurred. Please try again.");
    }
  }, [isGuest, logout, cleanupAfterDelete]);

  const handleReauthGoogle = useCallback(async () => {
    setReauthError(null);
    setDeleting(true);
    const { reauthenticateGoogle, deleteAccount } = await import("@/services/firebase");
    const authResult = await reauthenticateGoogle();
    if (!authResult.success) {
      setDeleting(false);
      setReauthError("Google sign-in was cancelled or failed. Try again.");
      return;
    }
    const result = await deleteAccount();
    if (!result.success) {
      setDeleting(false);
      setReauthError("Deletion still failed after re-authentication. Please try again later.");
      return;
    }
    await cleanupAfterDelete();
  }, [cleanupAfterDelete]);

  const handleReauthEmail = useCallback(async () => {
    setReauthError(null);
    if (!reauthPassword.trim() || !email) {
      setReauthError("Please enter your password.");
      return;
    }
    setDeleting(true);
    const { reauthenticateEmail, deleteAccount } = await import("@/services/firebase");
    const authResult = await reauthenticateEmail(email, reauthPassword);
    if (!authResult.success) {
      setDeleting(false);
      setReauthError("Wrong password. Please try again.");
      return;
    }
    const result = await deleteAccount();
    if (!result.success) {
      setDeleting(false);
      setReauthError("Deletion still failed after re-authentication. Please try again later.");
      return;
    }
    await cleanupAfterDelete();
  }, [email, reauthPassword, cleanupAfterDelete]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-6"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={step === "processing" || step === "done" ? undefined : onClose}
          />
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-border/50 bg-card shadow-2xl"
          >
            {step !== "processing" && step !== "done" && (
              <button
                onClick={onClose}
                className="absolute right-4 top-4 z-10 flex size-8 items-center justify-center rounded-full bg-muted/30 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}

            <div className="p-6 pt-10">
              <div className="relative mx-auto mb-5 flex size-24 items-center justify-center">
                <motion.div
                  animate={
                    step === "final" || step === "reauth"
                      ? { rotate: [-3, 3, -3, 3, 0], scale: [1, 1.02, 1] }
                      : { scale: [1, 1.01, 1] }
                  }
                  transition={{ repeat: Infinity, duration: step === "final" ? 1.5 : 3 }}
                >
                  <div className={cn("rounded-full", (step === "final" || step === "reauth") && "opacity-70")}>
                    <AvatarDisplay avatarId={avatarId} photoURL={photoURL} name={displayName} size={96} />
                  </div>
                </motion.div>
                <CryingTears active={step !== "done"} intense={step === "final" || step === "reauth"} />
                <motion.div
                  className="absolute -right-2 -top-2 text-2xl"
                  animate={{
                    y: [0, -6, 0],
                    rotate: [0, -15, 0, 15, 0],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  💔
                </motion.div>
              </div>

              <AnimatePresence mode="wait">
                {step === "done" ? (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                  >
                    <p className="text-sm font-bold">Goodbye, {displayName || "friend"}!</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      We hope to see you again someday.
                    </p>
                    <div className="mx-auto mt-4 size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </motion.div>
                ) : step === "processing" ? (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                  >
                    <p className="text-sm font-bold">Deleting everything...</p>
                    <p className="mt-1 text-xs text-muted-foreground">Goodbye, friend.</p>
                    <div className="mx-auto mt-4 size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </motion.div>
                ) : step === "reauth" ? (
                  <motion.div
                    key="reauth"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center"
                  >
                    <h2 className="text-lg font-bold">One more step</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      For your security, please verify your identity before we delete your account.
                    </p>

                    {isGoogle ? (
                      <div className="mt-5 flex flex-col gap-2.5">
                        <Button
                          variant="outline"
                          onClick={handleReauthGoogle}
                          disabled={deleting}
                          className="h-12 w-full rounded-xl text-sm font-semibold"
                        >
                          <Shield className="mr-2 size-4" />
                          {deleting ? "Verifying..." : "Verify with Google"}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={onClose}
                          className="h-11 rounded-xl text-sm font-semibold"
                        >
                          <Heart className="size-4" />
                          I&apos;ll stay!
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-5 flex flex-col gap-2.5">
                        <input
                          type="password"
                          placeholder="Enter your password"
                          value={reauthPassword}
                          onChange={(e) => { setReauthPassword(e.target.value); setReauthError(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter") handleReauthEmail(); }}
                          className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                          autoFocus
                        />
                        {reauthError && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="text-xs text-destructive text-left"
                          >
                            {reauthError}
                          </motion.p>
                        )}
                        <Button
                          variant="destructive"
                          onClick={handleReauthEmail}
                          disabled={deleting || !reauthPassword.trim()}
                          className="h-12 w-full rounded-xl text-sm"
                        >
                          <Trash2 className="mr-2 size-4" />
                          {deleting ? "Deleting..." : "Verify & Delete"}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={onClose}
                          className="h-11 rounded-xl text-sm font-semibold"
                        >
                          <Heart className="size-4" />
                          I&apos;ll stay!
                        </Button>
                      </div>
                    )}
                  </motion.div>
                ) : step === "soft" ? (
                  <motion.div
                    key="soft"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center"
                  >
                    <h2 className="text-lg font-bold">Don&apos;t go!</h2>
                    <AnimatePresence mode="wait">
                      <motion.p
                        key="soft-msg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-1 text-xs text-muted-foreground"
                      >
                        {SOFT_MESSAGES[0]}
                      </motion.p>
                    </AnimatePresence>
                    <div className="mt-5 flex flex-col gap-2.5">
                      <TimerButton timer={softTimer} max={5} onClick={() => setStep("final")} destructive>
                        <Trash2 className="size-4" />
                        {softTimer > 0 ? `Delete in ${softTimer}s` : "Yes, delete"}
                      </TimerButton>
                      <Button
                        variant="ghost"
                        onClick={onClose}
                        className="h-11 rounded-xl text-sm font-semibold"
                      >
                        <Heart className="size-4" />
                        Keep my account
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="final"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center"
                  >
                    <h2 className="text-lg font-bold">This is your LAST chance</h2>
                    <div className="mt-1 h-4 overflow-hidden">
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={messageIdx}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="text-xs text-muted-foreground"
                        >
                          {SAD_MESSAGES[messageIdx]}
                        </motion.p>
                      </AnimatePresence>
                    </div>

                    <motion.div
                      className="mt-3 rounded-xl bg-destructive/5 p-3 text-left"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.15 }}
                    >
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">
                        You will lose everything:
                      </p>
                      <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                        <span>• All your XP</span>
                        <span>• Your streak</span>
                        <span>• Achievements</span>
                        <span>• Completed puzzles</span>
                        <span>• Gems &amp; hearts</span>
                        <span>• Account data</span>
                      </div>
                    </motion.div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-3 overflow-hidden rounded-xl bg-destructive/10 p-3 text-xs text-destructive"
                      >
                        {error}
                      </motion.div>
                    )}

                    <div className="mt-5 flex flex-col gap-2.5">
                      <TimerButton
                        timer={finalTimer}
                        max={10}
                        onClick={performDelete}
                        destructive
                        disabled={deleting}
                      >
                        <Trash2 className="size-4" />
                        {finalTimer > 0 ? `DELETE in ${finalTimer}s` : "DELETE EVERYTHING"}
                      </TimerButton>
                      <Button
                        variant="ghost"
                        onClick={onClose}
                        className="h-11 rounded-xl text-sm font-semibold"
                      >
                        <Heart className="size-4" />
                        I&apos;ll stay!
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CryingTears({ active, intense }: { active: boolean; intense?: boolean }) {
  if (!active) return null;
  const count = intense ? 6 : 2;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none"
          style={{ left: `${20 + (i * 60) / (count - 1 || 1)}%`, top: "30%" }}
          animate={{
            top: ["30%", "95%"],
            opacity: [0, 1, 1, 0],
            x: [0, (i % 2 === 0 ? -1 : 1) * (intense ? 8 : 4), 0],
          }}
          transition={{
            repeat: Infinity,
            duration: intense ? 1.1 : 1.6,
            delay: i * (intense ? 0.25 : 0.8),
            ease: "easeIn",
          }}
        >
          <svg width={intense ? "9" : "7"} height={intense ? "13" : "10"} viewBox="0 0 9 13">
            <path
              d="M4.5 0C4.5 0 0 6.5 0 8.5C0 10.5 2 13 4.5 13C7 13 9 10.5 9 8.5C9 6.5 4.5 0 4.5 0Z"
              fill="#60a5fa"
              opacity={intense ? "0.9" : "0.8"}
            />
          </svg>
        </motion.div>
      ))}
    </>
  );
}

function TimerButton({
  timer,
  max,
  onClick,
  children,
  destructive,
  disabled,
}: {
  timer: number;
  max: number;
  onClick: () => void;
  children: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}) {
  const progress = timer > 0 ? timer / max : 1;
  const circumference = 2 * Math.PI * 14;

  return (
    <button
      onClick={onClick}
      disabled={timer > 0 || disabled}
      className={cn(
        "relative flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed",
        destructive
          ? "bg-destructive text-white hover:bg-destructive/90 disabled:opacity-60"
          : "bg-primary text-white hover:bg-primary/90 disabled:opacity-60",
      )}
    >
      {timer > 0 && (
        <svg className="absolute left-3 size-7 -rotate-90" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" />
          <circle
            cx="16"
            cy="16"
            r="14"
            fill="none"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="2.5"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
      )}
      {children}
    </button>
  );
}
