"use client";

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
  Snowflake,
  Check,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserStore } from "@/store/user-store";
import { toast } from "sonner";

export default function ProfilePage() {
  const router = useRouter();
  const {
    displayName,
    email,
    photoURL,
    isGuest,
    xp,
    streak,
    hearts,
    level,
    gems,
    streakFreezes,
    logout,
    buyStreakFreeze,
  } = useUserStore();

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-5 sm:p-6">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col items-center text-center sm:mb-10"
      >
        <Avatar className="mb-4 size-20 ring-4 ring-primary/20">
          <AvatarImage src={photoURL ?? undefined} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-lg font-bold text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <h1 className="font-heading text-2xl font-bold">{displayName}</h1>
        {email && (
          <p className="text-sm text-muted-foreground">{email}</p>
        )}
        {isGuest && (
          <span className="mt-2 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            Guest
          </span>
        )}

        <div className="mt-4 flex items-center gap-1.5 rounded-xl bg-primary/10 px-4 py-2">
          <Sparkles className="size-4 text-primary" />
          <span className="text-sm font-semibold text-primary">Level {level}</span>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="rounded-2xl p-5">
          <div className="grid grid-cols-4 gap-4">
            {[
              { icon: Zap, label: "XP", value: xp, color: "text-primary" },
              { icon: Flame, label: "Streak", value: `${streak}d`, color: "text-warning" },
              { icon: Gem, label: "Gems", value: gems, color: "text-cyan-500" },
              { icon: Heart, label: "Hearts", value: hearts, color: "text-destructive" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 text-center">
                <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
                  <Icon className={`size-5 ${color}`} />
                </span>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-heading text-lg font-bold">{value}</p>
              </div>
            ))}
          </div>
        </Card>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 space-y-2"
      >
        <Card className="flex items-center justify-between rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <Trophy className="size-5 text-primary" />
            <span className="text-sm font-medium">Achievements</span>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Card>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6"
      >
        <Card className="rounded-2xl p-5">
          <div className="mb-3 flex items-center gap-2">
            <Snowflake className="size-5 text-primary" />
            <h3 className="font-heading text-base font-semibold">Streak Freeze</h3>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Protects your streak if you miss a day. You have {streakFreezes} freeze{streakFreezes !== 1 ? "s" : ""}.
          </p>
          <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
            <span className="flex items-center gap-2 text-sm">
              <Gem className="size-4 text-cyan-500" />
              200 Gems
            </span>
            {gems >= 200 ? (
              <Button
                size="sm"
                onClick={() => {
                  const ok = buyStreakFreeze();
                  if (ok) toast.success("Streak freeze purchased!");
                  else toast.error("Not enough gems");
                }}
                className="h-8 gap-1"
              >
                <Check className="size-3.5" />
                Buy
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">Not enough gems</span>
            )}
          </div>
        </Card>
      </motion.section>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-8 text-center"
      >
        <Button
          variant="destructive"
          onClick={handleLogout}
          className="h-11 px-8"
        >
          <LogOut className="size-4" />
          {isGuest ? "Reset Guest Data" : "Sign Out"}
        </Button>
      </motion.div>
    </main>
  );
}
