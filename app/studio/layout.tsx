"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Lock, LogOut, Key, User, Shield, PenTool } from "lucide-react";
import { getStudioSession, setStudioSession, clearStudioSession } from "@/services/puzzle-service";
import { verifyStudioCredentials } from "@/services/studio-settings";
import { setStudioRole, getStudioRole, clearStudioRole } from "@/services/puzzle-service";
import { Toaster } from "sonner";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const session = getStudioSession();
    if (session) {
      setAuthed(true);
      setRole(getStudioRole());
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const entry = await verifyStudioCredentials(inviteCode, password);
    if (entry) {
      setStudioSession(inviteCode);
      setStudioRole(entry.role);
      setAuthed(true);
      setRole(entry.role);
      setError(false);
    } else {
      setError(true);
    }
  };

  const handleLogout = () => {
    clearStudioSession();
    clearStudioRole();
    setAuthed(false);
    setRole(null);
  };

  if (!mounted) return null;

  if (!authed) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm space-y-6 text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] shadow-lg"
          >
            <Lock className="size-7 text-white" />
          </motion.div>

          <h1 className="font-heading text-2xl font-bold">Puzzle Studio</h1>
          <p className="text-sm text-muted-foreground">
            Authorized access only. Enter your invite code and password.
          </p>

          <form onSubmit={handleLogin} className="space-y-3">
            <div className="relative">
              <Key className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={inviteCode}
                onChange={(e) => { setInviteCode(e.target.value); setError(false); }}
                placeholder="Invite code"
                className="w-full rounded-xl border bg-card py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary"
                autoComplete="off"
              />
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                placeholder="Password"
                className="w-full rounded-xl border bg-card py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary"
              />
            </div>
            {error && (
              <p className="text-xs text-destructive">Invalid invite code or password.</p>
            )}
            <button
              type="submit"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <Lock className="size-4" />
              Unlock Studio
            </button>
          </form>

          <p className="text-xs text-muted-foreground">
            Internal tool. Authorized access only.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[#8b5cf6]">
              <Sparkles className="size-4 text-white" />
            </span>
            <span className="text-sm font-semibold">Puzzle Studio</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="size-3.5" />
              {getStudioSession()}
            </span>
            {role && (
              <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
                role === "admin"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}>
                {role === "admin" ? <Shield className="size-3" /> : <PenTool className="size-3" />}
                {role}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
            >
              <LogOut className="size-3.5" />
              Lock
            </button>
          </div>
        </div>
      </header>
      <Toaster position="top-center" />
      {children}
    </div>
  );
}
