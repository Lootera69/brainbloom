"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Lock, LogOut, Key, User, Shield, PenTool, LayoutDashboard, Plus, BarChart3, Settings, Database, ChevronRight } from "lucide-react";
import { getStudioSession, setStudioSession, clearStudioSession } from "@/services/puzzle-service";
import { verifyStudioCredentials } from "@/services/studio-settings";
import { setStudioRole, getStudioRole, clearStudioRole } from "@/services/puzzle-service";
import { Toaster } from "sonner";

const navItems = [
  { href: "/studio", label: "Dashboard", icon: LayoutDashboard },
  { href: "/studio/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/studio/create", label: "Create Puzzle", icon: Plus },
  { href: "/studio/seed", label: "Seed Data", icon: Database },
  { href: "/studio/settings", label: "Settings", icon: Settings },
];

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const pathname = usePathname();

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
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/70 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4">
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

      <div className="flex flex-1">
        <StudioSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <Toaster position="top-center" />
          {children}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="sticky bottom-0 z-40 flex items-center border-t bg-card/70 backdrop-blur-xl px-1 pb-safe md:hidden">
        {navItems.map((item, idx) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const isCreate = idx === 2;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-all ${
                isCreate
                  ? "relative -mt-3"
                  : isActive
                    ? "text-primary"
                    : "text-muted-foreground/60 hover:text-foreground"
              }`}
            >
              {isCreate ? (
                <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] text-white shadow-md shadow-primary/25">
                  <Icon className="size-5" />
                </span>
              ) : (
                <Icon className={`size-[18px] ${isActive ? "text-primary" : ""}`} />
              )}
              <span className={isCreate ? "text-[10px] font-semibold text-foreground" : ""}>
                {isCreate ? "Create" : item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );

  function StudioSidebar() {
    return (
      <aside className="sticky top-14 z-40 hidden h-[calc(100dvh-3.5rem)] w-72 shrink-0 border-r bg-card/30 backdrop-blur-sm md:block">
        <nav className="flex flex-col gap-1 p-3 pt-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-primary/10 to-primary/5 text-primary shadow-sm shadow-primary/5"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <Icon className={`size-[18px] shrink-0 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground/60 group-hover:text-foreground"
                }`} />
                <span className="leading-tight">{item.label}</span>
                {isActive && (
                  <ChevronRight className="ml-auto size-3.5 text-primary/40" />
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    );
  }
}
