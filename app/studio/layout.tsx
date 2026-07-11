"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Lock, LogOut, Key, User, Shield, PenTool, LayoutDashboard, Plus, BarChart3, Settings, Database, ChevronRight, Eye, EyeOff, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const [showPassword, setShowPassword] = useState(false);
  const [inputFocus, setInputFocus] = useState<"code" | "password" | null>(null);
  const pathname = usePathname();

  // Reduced-motion check runs on mount (client only)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPrefersReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }
  }, []);

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
    // Premium Studio Login — dark mode only, no rotation, luxury feel
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleLogin(e);
      if (e.key === "Escape") setError(false);
    };

    return (
      <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background p-6">
        {/* Layered background: base → noise → slow orbs → dot grid */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {/* Noise texture */}
          <div className="absolute inset-0 opacity-[0.015] bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />
          {/* Slow-drifting orbs */}
          <motion.div
            className="absolute -left-40 -top-40 size-[40rem] rounded-full bg-primary/5 blur-3xl"
            animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            style={{ display: prefersReducedMotion ? "none" : "block" }}
          />
          <motion.div
            className="absolute -right-40 -bottom-40 size-[35rem] rounded-full bg-[#8b5cf6]/5 blur-3xl"
            animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear", delay: 12 }}
            style={{ display: prefersReducedMotion ? "none" : "block" }}
          />
          <motion.div
            className="absolute left-1/2 top-1/3 -translate-x-1/2 size-[15rem] rounded-full bg-primary/3 blur-3xl"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            style={{ display: prefersReducedMotion ? "none" : "block" }}
          />
          {/* Subtle dot grid */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.025)_1px,transparent_1px)] bg-[length:32px_32px]" />
        </div>

        {/* Entrance choreography */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.01 : 0.6, ease: "easeOut" }}
          className="relative w-full max-w-sm"
        >
          {/* Glass card — true glassmorphism */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: prefersReducedMotion ? 0.01 : 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-2xl border border-white/10 bg-white/5 p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] shadow-primary/10 backdrop-blur-xl sm:p-10"
          >
            {/* Logo — static, subtle pulse on hover */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 0.15,
                type: "spring",
                stiffness: 150,
                damping: 12,
              }}
              className="mx-auto mb-6 flex size-14 items-center justify-center"
              whileHover={{ scale: 1.05, transition: { type: "spring", stiffness: 400, damping: 17 } }}
            >
              <div className="relative">
                {/* Ambient glow ring */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-[#8b5cf6]/20 blur-xl opacity-60" />
                {/* Logo container */}
                <div className="relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] shadow-lg shadow-primary/30">
                  <Sparkles className="size-6 text-white" />
                </div>
              </div>
            </motion.div>

            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: prefersReducedMotion ? 0.01 : 0.4, ease: "easeOut" }}
              className="mb-8 text-center"
            >
              <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Puzzle Studio</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Authorized access only. Enter your credentials to continue.
              </p>
            </motion.div>

            {/* Form */}
            <form onSubmit={handleLogin} onKeyDown={handleKeyDown} className="space-y-5" noValidate>
              {/* Invite Code Field */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: prefersReducedMotion ? 0.01 : 0.4, ease: "easeOut" }}
                className="space-y-2"
              >
                <label htmlFor="invite-code" className="text-xs font-medium text-muted-foreground">
                  Invite Code
                </label>
                <div className="relative">
                  <Key
                    className={cn(
                      "pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 transition-colors duration-200",
                      inputFocus === "code" ? "text-primary" : "text-muted-foreground/50"
                    )}
                    aria-hidden="true"
                  />
                  <input
                    id="invite-code"
                    type="text"
                    value={inviteCode}
                    onChange={(e) => { setInviteCode(e.target.value); setError(false); }}
                    onFocus={() => setInputFocus("code")}
                    onBlur={() => setInputFocus(null)}
                    placeholder="Enter your invite code"
                    autoComplete="username"
                    autoFocus
                    className={cn(
                      "w-full rounded-xl border bg-white/5 px-4 py-3 pl-10 pr-4 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/40",
                      "focus:border-primary focus:bg-white/10 focus:ring-4 focus:ring-primary/15 focus:ring-offset-0",
                      error && "border-destructive/50 focus:border-destructive focus:ring-destructive/15"
                    )}
                  />
                </div>
              </motion.div>

              {/* Password Field */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.38, duration: prefersReducedMotion ? 0.01 : 0.4, ease: "easeOut" }}
                className="space-y-2"
              >
                <label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className={cn(
                      "pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 transition-colors duration-200",
                      inputFocus === "password" ? "text-primary" : "text-muted-foreground/50"
                    )}
                    aria-hidden="true"
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(false); }}
                    onFocus={() => setInputFocus("password")}
                    onBlur={() => setInputFocus(null)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className={cn(
                      "w-full rounded-xl border bg-white/5 px-4 py-3 pl-10 pr-12 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/40",
                      "focus:border-primary focus:bg-white/10 focus:ring-4 focus:ring-primary/15 focus:ring-offset-0",
                      error && "border-destructive/50 focus:border-destructive focus:ring-destructive/15"
                    )}
                  />
                  {/* Password visibility toggle */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    onFocus={() => setInputFocus("password")}
                    onBlur={() => setInputFocus(null)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center p-1 text-muted-foreground/50 hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </motion.div>

              {/* Error state — slides down, shakes on appear */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="relative overflow-hidden rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3"
                >
                  <motion.span
                    initial={{ x: 0 }}
                    animate={{ x: [0, -6, 6, -6, 6, 0] }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="flex items-center gap-2 text-sm text-destructive"
                  >
                    <span className="flex size-5 items-center justify-center rounded-full bg-destructive/20">
                      <XCircle className="size-3" />
                    </span>
                    Invalid invite code or password. Please try again.
                  </motion.span>
                </motion.div>
              )}

              {/* Submit button — shimmer sweep */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.46, duration: prefersReducedMotion ? 0.01 : 0.4, ease: "easeOut" }}
              >
                <button
                  type="submit"
                  className={cn(
                    "relative overflow-hidden flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#8b5cf6] text-sm font-semibold text-white transition-all duration-300",
                    "before:absolute before:inset-0 before:-translate-x-full before:skew-x-12 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
                    "hover:brightness-110 hover:shadow-xl hover:shadow-primary/25",
                    "active:scale-[0.98] active:brightness-100",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  )}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Lock className="size-4" aria-hidden="true" />
                    Unlock Studio
                  </span>
                  {/* Shimmer sweep on hover */}
                  <motion.div
                    className="absolute inset-0"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "200%" }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    style={{ display: prefersReducedMotion ? "none" : "block" }}
                  />
                </button>
              </motion.div>
            </form>

            {/* Divider + version badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.3 }}
              className="mt-6 flex flex-col items-center gap-3"
            >
              <div className="w-full flex items-center gap-3">
                <span className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40">Internal tool</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/30">
                v1.0.0 · Studio
              </span>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.3 }}
              className="mt-4 text-center text-[11px] text-muted-foreground/30"
            >
              &copy; {new Date().getFullYear()} BrainBloom. Authorized personnel only.
            </motion.p>
          </motion.div>
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