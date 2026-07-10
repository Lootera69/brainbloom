"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, User, Loader2, Zap, Brain, Flame } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/user-store";
import { signInWithGoogle } from "@/services/firebase";
import { Toaster } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";


const firebaseConfigured =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY.length > 0;

const taglines = [
  { text: "Train your brain every day", icon: Brain },
  { text: "Fun challenges await", icon: Zap },
  { text: "Build your streak", icon: Flame },
];

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [taglineIndex, setTaglineIndex] = useState(0);
  const loginAsGuest = useUserStore((s) => s.loginAsGuest);
  const setUser = useUserStore((s) => s.setUser);
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/");
    } else {
      const timer = setTimeout(() => setPageLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIndex((i) => (i + 1) % taglines.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleGuest = () => {
    loginAsGuest();
    router.push("/");
  };

  const handleGoogle = async () => {
    if (!firebaseConfigured) return;
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      if (user) {
        setUser({
          uid: user.uid,
          displayName: user.displayName ?? "User",
          email: user.email,
          photoURL: user.photoURL,
        });
        router.push("/");
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const TaglineIcon = taglines[taglineIndex].icon;

  if (pageLoading) {
    return (
      <main className="relative flex min-h-dvh select-none flex-col items-center justify-center overflow-hidden px-6">
        <div className="flex flex-col items-center gap-6">
          <Skeleton className="size-16 rounded-2xl" />
          <Skeleton className="h-12 w-56 rounded-lg" />
          <Skeleton className="h-5 w-40 rounded-full" />
          <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-dvh select-none flex-col items-center justify-center overflow-hidden px-6">
      <Toaster />

      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-[#8b5cf6]/5 blur-[100px]" />
      </div>

      {/* Brand section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative flex flex-col items-center text-center"
      >
        {/* Logo ring */}
        <motion.div
          className="relative mb-7"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary via-[#8b5cf6] to-secondary p-[2px]">
            <div className="size-16 rounded-2xl bg-background" />
          </div>
          <span className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] shadow-lg shadow-primary/25">
            <Sparkles className="size-8 text-white" />
          </span>
        </motion.div>

        <h1 className="font-heading bg-gradient-to-r from-primary via-[#8b5cf6] to-secondary bg-clip-text text-5xl font-bold text-transparent sm:text-6xl">
          BrainBloom
        </h1>

        <div className="mt-3 flex items-center gap-2">
          <motion.div
            key={taglineIndex}
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5"
          >
            <TaglineIcon className="size-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">
              {taglines[taglineIndex].text}
            </span>
          </motion.div>
        </div>

        {/* Feature dots */}
        <div className="mt-5 flex items-center gap-3">
          {["Daily Challenges", "Track Progress", "Earn Rewards"].map((feat, i) => (
            <motion.div
              key={feat}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.12 }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span className="size-1.5 rounded-full bg-primary" />
              {feat}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="mt-10 flex w-full max-w-sm flex-col gap-3"
      >
        <motion.button
          onClick={handleGuest}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="group relative flex h-14 items-center justify-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-card/60 text-sm font-semibold shadow-lg backdrop-blur-xl saturate-150 transition-all hover:border-primary/30 hover:shadow-primary/10 active:scale-[0.98]"
        >
          <span className="absolute inset-0 -z-10 translate-y-full bg-gradient-to-b from-primary/5 to-transparent transition-transform duration-300 group-hover:translate-y-0" />
          <User className="size-5" />
          Continue as Guest
        </motion.button>

        <motion.button
          onClick={handleGoogle}
          disabled={!firebaseConfigured || loading}
          whileHover={firebaseConfigured ? { scale: 1.02 } : {}}
          whileTap={firebaseConfigured ? { scale: 0.98 } : {}}
          className="relative flex h-14 items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 active:scale-[0.98] disabled:opacity-50"
        >
          <span className="absolute inset-0 -z-10 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.15)_50%,transparent_75%)] bg-[length:250%_250%] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          {loading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" className="size-5">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {firebaseConfigured ? "Sign in with Google" : "Google Sign-In"}
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-6 text-center text-xs text-muted-foreground/60"
        >
          By signing in to BrainBloom, you agree to our{" "}
          <span className="underline underline-offset-2 hover:text-muted-foreground cursor-pointer">Terms</span>{" "}
          and{" "}
          <span className="underline underline-offset-2 hover:text-muted-foreground cursor-pointer">Privacy Policy</span>.
        </motion.p>
      </motion.div>

      {/* Bottom fade */}
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </main>
  );
}
