"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  User,
  Flame,
  Zap,
  Heart,
  Trophy,
  LogOut,
  Sparkles,
  ChevronRight,
  Gem,
  ShoppingBag,
  Clock,
  Volume2,
  VolumeX,
  TrendingUp,
  Mail,
  Shield,
  KeyRound,
  Loader2,
  Crown,
  Lock,
  Compass,
  Sun,
  Target,
  Brain,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { useUserStore, getLevelProgress } from "@/store/user-store";
import { useUIStore } from "@/store/ui-store";
import { achievementsList } from "@/constants/achievements";
import { AvatarDisplay } from "@/components/avatars/AvatarDisplay";
import { PremiumBadge } from "@/components/paywall/PremiumBadge";
import { hasPremiumAccess, daysRemaining, formatExpiry } from "@/services/entitlement-service";
import { AvatarSelector } from "@/components/avatars/AvatarSelector";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { signOutUser, sendPasswordReset } from "@/services/firebase";
import { playToggleOn, playToggleOff } from "@/services/sound-service";

function getLevel(xp: number) {
  return getLevelProgress(xp);
}

function formatHeartTimer(ms: number): string {
  if (ms <= 0) return "Full";
  const totalHours = Math.floor(ms / 3600000);
  const totalMinutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (totalHours > 0) return `${totalHours}h ${totalMinutes}m`;
  if (totalMinutes > 0) return `${totalMinutes}m ${seconds}s`;
  return `${seconds}s`;
}



const statCards = [
  { icon: Zap, label: "Total XP", color: "text-primary", bg: "bg-primary/10" },
  { icon: Flame, label: "Streak", color: "text-warning", bg: "bg-warning/10" },
  { icon: Gem, label: "Gems", color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { icon: Heart, label: "Hearts", color: "text-destructive", bg: "bg-destructive/10" },
];

export default function ProfilePage() {
  const router = useRouter();
  const {
    displayName,
    email,
    photoURL,
    avatarId,
    isGuest,
    xp,
    streak,
    hearts,
    level: storeLevel,
    gems,
    logout,
    setAvatarId,
  } = useUserStore();
  const soundEnabled = useUserStore((s) => s.soundEnabled);
  const setSoundEnabled = useUserStore((s) => s.setSoundEnabled);
  const tier = useUserStore((s) => s.tier);
  const subscriptionExpiry = useUserStore((s) => s.subscriptionExpiry);
  const setShowShop = useUIStore((s) => s.setShowShop);
  const isPremium = hasPremiumAccess(tier, subscriptionExpiry);
  const userAchievements = useUserStore((s) => s.achievements);

  const iconMap: Record<string, typeof Trophy> = {
    Brain, Flame, Zap, Compass: Trophy, Sun: Trophy,
    TrendingUp: Trophy, Heart: Trophy, Target: Trophy,
  };

  const unlockedIds = new Set(userAchievements.map((a) => a.id));
  const previewAchievements = achievementsList
    .slice()
    .sort((a, b) => {
      const aUnlocked = unlockedIds.has(a.id) ? 0 : 1;
      const bUnlocked = unlockedIds.has(b.id) ? 0 : 1;
      return aUnlocked - bUnlocked;
    })
    .slice(0, 3);

  const processHeartRefill = useUserStore((s) => s.processHeartRefill);
  const getHeartTimer = useUserStore((s) => s.getHeartTimer);
  const [timer, setTimer] = useState(0);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  useEffect(() => {
    const tick = () => {
      processHeartRefill();
      setTimer(getHeartTimer());
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [processHeartRefill, getHeartTimer]);

  const { level, progress, xpToNext } = useMemo(() => getLevel(xp), [xp]);

  const handleLogout = async () => {
    await signOutUser();
    logout();
    router.push("/login");
  };

  const handleChangePassword = async () => {
    if (!email) return;
    toast.loading("Sending reset link…", { id: "reset-pw" });
    const result = await sendPasswordReset(email);
    toast.dismiss("reset-pw");
    if (result.success) {
      toast.success("Password reset link sent! Check your email.", { position: "top-center" });
    } else {
      toast.error(result.error ?? "Failed to send reset link", { position: "top-center" });
    }
  };

  const authType = isGuest ? "guest" : photoURL ? "google" : email ? "email" : "guest";

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-5 sm:p-6">
      {/* Profile Header */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-6 overflow-hidden rounded-3xl"
      >
        <div className={`absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5`} />
        {isPremium && (
          <>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-yellow-500/5" />
            <div className="pointer-events-none absolute -inset-1 rounded-3xl border border-amber-500/20" />
            <motion.div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                background: "linear-gradient(135deg, transparent 0%, rgba(251,191,36,0.15) 50%, transparent 100%)",
                backgroundSize: "200% 200%",
              }}
              animate={{
                backgroundPosition: ["0% 0%", "100% 100%"],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />
          </>
        )}
        <GlassCard className={`relative p-6 sm:p-8 ${isPremium ? "shadow-lg shadow-amber-500/10" : ""}`}>
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="relative mb-4 group"
            >
              <div className={`absolute -inset-1 rounded-full blur-sm ${
                isPremium
                  ? "bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 opacity-70"
                  : "bg-gradient-to-br from-primary via-secondary to-warning opacity-50"
              }`} />
              <button
                onClick={() => setShowAvatarSelector(true)}
                className="relative block cursor-pointer"
                aria-label="Change avatar"
              >
                {isPremium ? (
                  <AvatarDisplay
                    avatarId={avatarId}
                    photoURL={photoURL}
                    name={displayName}
                    size={96}
                    premium
                  />
                ) : (
                  <div className="size-24 overflow-hidden rounded-full ring-4 ring-background">
                    <AvatarDisplay
                      avatarId={avatarId}
                      photoURL={photoURL}
                      name={displayName}
                      size={96}
                    />
                  </div>
                )}
                {isPremium && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                    className="absolute -right-1 -top-1 flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg"
                  >
                    <Crown className="size-4 text-white" />
                  </motion.span>
                )}
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                    Edit
                  </span>
                </div>
              </button>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className={`font-heading text-2xl font-bold ${isPremium ? "bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 bg-clip-text text-transparent" : ""}`}
            >
              {displayName}
            </motion.h1>

            {email && (
              <p className="mt-0.5 text-sm text-muted-foreground">{email}</p>
            )}

            <div className="mt-2 flex items-center gap-2">
              {authType === "guest" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted/80 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                  <User className="size-3" />
                  Guest
                </span>
              )}
              {authType === "google" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                  <svg viewBox="0 0 24 24" className="size-3"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Google
                </span>
              )}
              {authType === "email" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-500">
                  <Mail className="size-3" />
                  Email
                </span>
              )}
            </div>

            {/* Level Badge + XP Bar */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-5 w-full max-w-xs"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1 ${
                  isPremium ? "bg-amber-500/15" : "bg-primary/10"
                }`}>
                  <Sparkles className={`size-3.5 ${isPremium ? "text-amber-400" : "text-primary"}`} />
                  <span className={`text-xs font-bold ${isPremium ? "text-amber-400" : "text-primary"}`}>Level {level}</span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {xpToNext} XP to next level
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    isPremium
                      ? "bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500"
                      : "bg-gradient-to-r from-primary to-secondary"
                  }`}
                />
              </div>
            </motion.div>

            {/* Total XP display */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="mt-3 flex items-center gap-1 text-xs text-muted-foreground"
            >
              <TrendingUp className="size-3" />
              {xp.toLocaleString()} XP earned
            </motion.p>
          </div>
        </GlassCard>
      </motion.section>

      {/* Stats Grid */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statCards.map(({ icon: Icon, label, color, bg }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <GlassCard intensity="light" className="flex flex-col items-center gap-2 p-3 sm:p-4 text-center">
                <span className={cn("flex size-10 items-center justify-center rounded-xl", bg)}>
                  <Icon className={cn("size-5", color)} />
                </span>
                <div>
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                  <p className="font-heading text-lg font-bold tabular-nums leading-tight">
                    {label === "Streak" ? `${streak}d` : label === "Hearts" ? (isPremium ? "∞" : hearts) : label === "Total XP" ? xp.toLocaleString() : gems}
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* Heart timer banner — shows when hearts < 5 */}
        {!isPremium && hearts < 5 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3"
          >
            <GlassCard intensity="light" className="flex items-center justify-center gap-2 px-4 py-3">
              <Heart className="size-4 fill-destructive text-destructive" />
              <span className="text-xs text-muted-foreground">
                {hearts}/5 hearts &middot; refills in
              </span>
              <span className="font-mono text-xs font-bold tabular-nums text-foreground">
                {formatHeartTimer(timer)}
              </span>
              <Clock className="size-3 text-muted-foreground" />
            </GlassCard>
          </motion.div>
        )}
      </motion.section>

      {/* Achievements & Streak Freeze row */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="h-full"
        >
          <GlassCard intensity="light" className="flex h-full flex-col p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="flex size-6 items-center justify-center rounded-md bg-warning/10">
                  <Trophy className="size-3.5 text-warning" />
                </span>
                <h3 className="text-sm font-semibold">Achievements</h3>
              </div>
              <button
                onClick={() => router.push("/achievements")}
                className="text-[10px] font-medium text-primary transition-colors hover:text-primary/80"
              >
                View all
              </button>
            </div>
            <div className="flex flex-1 items-center justify-center">
              <div className="grid w-full grid-cols-3 gap-1">
              {previewAchievements.map((a) => {
                const Icon = iconMap[a.icon] ?? Trophy;
                const unlocked = unlockedIds.has(a.id);
                return (
                  <div
                    key={a.id}
                    className={`flex flex-col items-center gap-0.5 rounded-lg p-1.5 ${
                      unlocked ? "bg-primary/5" : "bg-muted/30"
                    }`}
                  >
                    <span className={`flex size-6 items-center justify-center rounded-md ${
                      unlocked ? "bg-primary/15" : "bg-muted"
                    }`}>
                      {unlocked ? (
                        <Icon className="size-5 text-primary" />
                      ) : (
                        <Lock className="size-5 text-muted-foreground/50" />
                      )}
                    </span>
                    <span className="text-center text-[10px] font-medium leading-tight text-muted-foreground">
                      {a.title}
                    </span>
                  </div>
                );
              })}
            </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Shop */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="h-full"
        >
          <GlassCard
            hover
            intensity="light"
            className="flex h-full cursor-pointer items-center justify-between p-4"
            onClick={() => router.push("/shop")}
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-orange-500/20">
                <ShoppingBag className="size-5 text-amber-400" />
              </span>
              <div>
                <h3 className="text-sm font-semibold">Shop</h3>
                <p className="text-[11px] text-muted-foreground">
                  Gems, hearts, streak freezes & more
                </p>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </GlassCard>
        </motion.div>
      </div>

      {/* Change Password (email auth only) */}
      {authType === "email" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-3"
        >
          <GlassCard intensity="light" className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
                <KeyRound className="size-5 text-muted-foreground" />
              </span>
              <div>
                <p className="text-sm font-semibold">Password</p>
                <p className="text-[11px] text-muted-foreground">Change your password</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleChangePassword}
              className="h-8 gap-1.5 text-xs"
            >
              <Mail className="size-3.5" />
              Reset
            </Button>
          </GlassCard>
        </motion.div>
      )}

      {/* Subscription */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.27 }}
        className="mt-3"
      >
        <GlassCard
          hover
          intensity="light"
          className={cn(
            "relative flex cursor-pointer items-center justify-between overflow-hidden p-4",
            hasPremiumAccess(tier, subscriptionExpiry)
              ? "shadow-lg shadow-amber-500/10"
              : "",
          )}
          onClick={() => setShowShop(true)}
        >
          {/* Animated shimmer border for premium */}
          {hasPremiumAccess(tier, subscriptionExpiry) && (
            <motion.div
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{
                background: "linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(245,158,11,0.04) 50%, rgba(251,191,36,0.08) 100%)",
              }}
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          {/* Golden top accent */}
          <div className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-px",
            hasPremiumAccess(tier, subscriptionExpiry)
              ? "bg-gradient-to-r from-transparent via-amber-400/60 to-transparent"
              : "bg-gradient-to-r from-transparent via-amber-400/20 to-transparent",
          )} />

          <div className="relative flex items-center gap-3">
            <span className={cn(
              "flex size-10 items-center justify-center rounded-xl",
              hasPremiumAccess(tier, subscriptionExpiry)
                ? "bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-orange-500/20 ring-1 ring-amber-500/30"
                : "bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-orange-500/10",
            )}>
              <Crown className={cn(
                "size-5",
                hasPremiumAccess(tier, subscriptionExpiry)
                  ? "text-amber-400 drop-shadow-sm"
                  : "text-amber-400/60",
              )} />
            </span>
            <div>
              <p className={cn(
                "text-sm font-semibold",
                hasPremiumAccess(tier, subscriptionExpiry)
                  ? "bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 bg-clip-text text-transparent"
                  : "",
              )}>
                {hasPremiumAccess(tier, subscriptionExpiry) ? "Premium Active" : "BrainBloom Premium"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {hasPremiumAccess(tier, subscriptionExpiry)
                  ? `${formatExpiry(subscriptionExpiry)} remaining`
                  : "Unlock unlimited puzzles & features"}
              </p>
            </div>
          </div>
          <div className="relative flex items-center gap-2">
            {hasPremiumAccess(tier, subscriptionExpiry) ? (
              <PremiumBadge size="sm" />
            ) : (
              <motion.span
                initial={{ x: -4, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/15 to-yellow-500/15 px-3 py-1 text-[11px] font-semibold text-amber-400"
              >
                <Sparkles className="size-3" />
                Upgrade
              </motion.span>
            )}
          </div>
        </GlassCard>
      </motion.div>

      {/* Sound + Logout row */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-5 flex items-center justify-between gap-3"
      >
        <GlassCard intensity="light" className="flex flex-1 items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <span className={cn(
              "flex size-10 items-center justify-center rounded-xl",
              soundEnabled ? "bg-primary/10" : "bg-muted",
            )}>
              {soundEnabled ? (
                <Volume2 className="size-5 text-primary" />
              ) : (
                <VolumeX className="size-5 text-muted-foreground" />
              )}
            </span>
            <div>
              <p className="text-sm font-semibold">Sound Effects</p>
              <p className="text-[11px] text-muted-foreground">
                {soundEnabled ? "On" : "Off"}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (soundEnabled) playToggleOff(); else playToggleOn();
              setSoundEnabled(!soundEnabled);
            }}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              soundEnabled ? "bg-primary" : "bg-muted-foreground/30",
            )}
          >
            <motion.span
              layout
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="inline-block size-5 rounded-full bg-white shadow-sm"
              style={{
                marginLeft: soundEnabled ? "22px" : "2px",
              }}
            />
          </button>
        </GlassCard>
      </motion.div>

      {/* Logout */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="mt-6 mb-6 text-center"
      >
        <Button
          variant="destructive"
          onClick={handleLogout}
          className="h-11 rounded-xl px-8 shadow-lg shadow-destructive/20"
        >
          <LogOut className="size-4" />
          {isGuest ? "Reset Guest Data" : "Sign Out"}
        </Button>
      </motion.div>

      {showAvatarSelector && (
        <AvatarSelector
          currentAvatarId={avatarId}
          photoURL={photoURL}
          displayName={displayName}
          onSelect={(id) => {
            setAvatarId(id);
            toast.success(
              id
                ? `Avatar changed!`
                : "Using default avatar",
              { position: "top-center" },
            );
          }}
          onClose={() => setShowAvatarSelector(false)}
        />
      )}
    </main>
  );
}
