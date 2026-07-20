"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, User, Loader2, Zap, Brain, Flame, Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/user-store";
import { signInWithGoogle, signUpWithEmailFull, signInWithEmailFull, sendPasswordReset, resendVerificationEmail } from "@/services/firebase";
import { GoogleOneTap } from "@/components/auth/GoogleOneTap";
import { Toaster, toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import AvatarWithEyes from "@/components/onboarding/AvatarWithEyes";

const firebaseConfigured =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY.length > 0;

const taglines = [
  { text: "Train your brain every day", icon: Brain },
  { text: "Fun challenges await", icon: Zap },
  { text: "Build your streak", icon: Flame },
];

type AuthMode = "signin" | "signup" | "forgot" | "verify";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);

  const [ready, setReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);

  useEffect(() => {
    const complete = localStorage.getItem("brainbloom-onboarding-complete") === "true";
    setShowOnboarding(!complete);
    setReady(true);
    const avatarId = localStorage.getItem("brainbloom-selected-avatar");
    if (avatarId) setSelectedAvatarId(avatarId);
  }, []);

  const loginAsGuest = useUserStore((s) => s.loginAsGuest);
  const setUser = useUserStore((s) => s.setUser);
  const setAvatarId = useUserStore((s) => s.setAvatarId);
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);

  const emailRef = useRef<HTMLInputElement>(null);

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

  // Reset form when switching modes
  useEffect(() => {
    setError("");
    setSuccess("");
    setPassword("");
    setConfirmPassword("");
    setDisplayName("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [mode]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    const avatarId = localStorage.getItem("brainbloom-selected-avatar");
    if (avatarId) setSelectedAvatarId(avatarId);
  };

  const handleGuest = () => {
    loginAsGuest();
    // Apply avatar from onboarding if selected
    const avatarId = localStorage.getItem("brainbloom-selected-avatar");
    if (avatarId) {
      setAvatarId(avatarId);
    }
    router.push("/");
  };

  const handleGoogle = async () => {
    if (!firebaseConfigured) return;
    setLoading(true);
    setError("");
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
      setError("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateEmail(email)) { setError("Please enter a valid email address"); return; }
    if (!password) { setError("Please enter your password"); return; }

    setLoading(true);
    const result = await signInWithEmailFull(email, password);
    setLoading(false);

    if (result.error) {
      if (result.needsVerification) {
        setError("");
        setMode("verify");
        return;
      }
      setError(result.error);
      return;
    }
    if (result.user) {
      setUser({
        uid: result.user.uid,
        displayName: result.user.displayName ?? email.split("@")[0],
        email: result.user.email,
        photoURL: result.user.photoURL,
      });
      router.push("/");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!displayName.trim()) { setError("Please enter your name"); return; }
    if (!validateEmail(email)) { setError("Please enter a valid email address"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }

    setLoading(true);
    const result = await signUpWithEmailFull(email, password, displayName.trim());
    setLoading(false);

    if (result.error) { setError(result.error); return; }
    if (result.success) {
      setMode("verify");
    }
  };

  const handleResendVerification = async () => {
    setVerifyingEmail(true);
    setError("");
    const result = await resendVerificationEmail(email, password);
    setVerifyingEmail(false);
    if (result.success) {
      toast.success("Verification email sent! Check your inbox.", { position: "top-center" });
    } else {
      toast.error(result.error ?? "Failed to resend. Please try again.", { position: "top-center" });
    }
  };

  const handleVerifyRefresh = async () => {
    setLoading(true);
    setError("");
    const result = await signInWithEmailFull(email, password);
    setLoading(false);
    if (result.needsVerification) {
      toast.error("Still not verified. Check your email inbox.", { position: "top-center" });
      return;
    }
    if (result.user) {
      setUser({
        uid: result.user.uid,
        displayName: result.user.displayName ?? email.split("@")[0],
        email: result.user.email,
        photoURL: result.user.photoURL,
      });
      router.push("/");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateEmail(email)) { setError("Please enter a valid email address"); return; }

    setLoading(true);
    const result = await sendPasswordReset(email);
    setLoading(false);

    if (result.error) { setError(result.error); return; }
    setSuccess("Password reset link sent! Check your email.");
    setEmail("");
  };

  const TaglineIcon = taglines[taglineIndex].icon;

  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  if (!ready || pageLoading) {
    return (
      <main className="relative flex min-h-dvh select-none flex-col items-center justify-center overflow-y-auto px-6">
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
    <main className="relative flex min-h-dvh select-none flex-col items-center justify-center overflow-y-auto px-6 pb-4 md:pb-0 bg-background dark:bg-gradient-to-br dark:from-[#0f0f1a] dark:via-[#1a1a2e] dark:to-[#0d0d1a]">
      <Toaster position="top-center" />
      <GoogleOneTap />

      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-[#8b5cf6]/5 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative flex flex-col items-center text-center"
      >
        <motion.div
          className="relative mb-5 md:mb-7"
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(99,102,241,0)",
              "0 0 30px 4px rgba(99,102,241,0.15)",
              "0 0 0 0 rgba(99,102,241,0)",
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="flex size-14 md:size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] shadow-lg shadow-primary/25">
            <Sparkles className="size-7 md:size-8 text-white" />
          </span>
        </motion.div>

          <h1 className="font-heading bg-gradient-to-r from-primary via-[#8b5cf6] to-secondary bg-clip-text text-4xl font-bold text-transparent sm:text-5xl md:text-6xl">
          BrainBloom
        </h1>

        <div className="mt-3 flex items-center justify-center">
          {selectedAvatarId && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="shrink-0"
              style={{ width: 60 }}
            >
              <AvatarWithEyes avatarId={selectedAvatarId} size={56} />
            </motion.div>
          )}
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


      </motion.div>

      {/* Auth form */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="mt-6 md:mt-8 w-full max-w-sm"
      >
        {/* Tab bar */}
        {mode !== "forgot" && mode !== "verify" && (
          <div className="mb-4 md:mb-5 flex gap-1 rounded-xl bg-muted/60 p-1">
            <button
              onClick={() => setMode("signin")}
              className={cn(
                "flex-1 rounded-lg px-4 py-2 text-xs font-semibold transition-all",
                mode === "signin" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode("signup")}
              className={cn(
                "flex-1 rounded-lg px-4 py-2 text-xs font-semibold transition-all",
                mode === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success banner */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
                <CheckCircle className="size-4 shrink-0" />
                <span>{success}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {mode === "signin" && (
            <motion.form
              key="signin"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.18 }}
              onSubmit={handleSignIn}
              className="space-y-3"
            >
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  autoComplete="email"
                  autoFocus
                  className="w-full rounded-xl border bg-muted/30 px-4 py-3 pl-10 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/40 focus:border-primary focus:bg-muted/50 focus:ring-4 focus:ring-primary/15"
                />
              </div>

              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  className="w-full rounded-xl border bg-muted/30 px-4 py-3 pl-10 pr-12 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/40 focus:border-primary focus:bg-muted/50 focus:ring-4 focus:ring-primary/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => { setMode("forgot"); setEmail(email); }}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:brightness-110 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </motion.form>
          )}

          {mode === "signup" && (
            <motion.form
              key="signup"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
              onSubmit={handleSignUp}
              className="space-y-3"
            >
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  autoFocus
                  className="w-full rounded-xl border bg-muted/30 px-4 py-3 pl-10 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/40 focus:border-primary focus:bg-muted/50 focus:ring-4 focus:ring-primary/15"
                />
              </div>

              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  autoComplete="email"
                  className="w-full rounded-xl border bg-muted/30 px-4 py-3 pl-10 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/40 focus:border-primary focus:bg-muted/50 focus:ring-4 focus:ring-primary/15"
                />
              </div>

              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (min 6 characters)"
                  autoComplete="new-password"
                  className="w-full rounded-xl border bg-muted/30 px-4 py-3 pl-10 pr-12 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/40 focus:border-primary focus:bg-muted/50 focus:ring-4 focus:ring-primary/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>

              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  className="w-full rounded-xl border bg-muted/30 px-4 py-3 pl-10 pr-12 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/40 focus:border-primary focus:bg-muted/50 focus:ring-4 focus:ring-primary/15"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:brightness-110 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <User className="size-4" />}
                {loading ? "Creating account…" : "Create Account"}
              </button>
            </motion.form>
          )}

          {mode === "forgot" && (
            <motion.form
              key="forgot"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
              onSubmit={handleForgotPassword}
              className="space-y-3"
            >
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                Back to sign in
              </button>

              <p className="text-sm text-muted-foreground">
                Enter your email and we'll send you a link to reset your password.
              </p>

              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  autoComplete="email"
                  autoFocus
                  className="w-full rounded-xl border bg-muted/30 px-4 py-3 pl-10 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/40 focus:border-primary focus:bg-muted/50 focus:ring-4 focus:ring-primary/15"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:brightness-110 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                {loading ? "Sending…" : "Send Reset Link"}
              </button>
            </motion.form>
          )}

          {mode === "verify" && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
              className="space-y-5"
            >
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                Back to sign in
              </button>

              <div className="flex flex-col items-center text-center gap-3 py-4">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Mail className="size-7 text-primary" />
                </span>
                <h2 className="text-lg font-bold">Check your email</h2>
                <p className="text-sm text-muted-foreground max-w-xs">
                  We sent a verification email to{" "}
                  <span className="font-medium text-foreground">{email}</span>.
                  Please click the link in the email to verify your account.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleResendVerification}
                  disabled={verifyingEmail}
                  className="relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-border/50 bg-card/60 text-sm font-semibold shadow-lg backdrop-blur-xl transition-all hover:border-primary/30 active:scale-[0.98] disabled:opacity-50"
                >
                  {verifyingEmail ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                  {verifyingEmail ? "Sending…" : "Resend verification email"}
                </button>

                <button
                  onClick={handleVerifyRefresh}
                  disabled={loading}
                  className="relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:brightness-110 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-60"
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
                  {loading ? "Checking…" : "I've verified — Sign In"}
                </button>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                Didn't receive the email? Check your spam folder or{" "}
                <button
                  onClick={handleResendVerification}
                  disabled={verifyingEmail}
                  className="underline underline-offset-2 hover:text-foreground transition-colors"
                >
                  send again
                </button>
                .
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {mode !== "verify" && (
          <>
            <div className="my-4 md:my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-border/50" />
              <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40">or continue with</span>
              <span className="h-px flex-1 bg-border/50" />
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleGoogle}
                disabled={!firebaseConfigured || loading}
                className="relative flex h-12 items-center justify-center gap-3 overflow-hidden rounded-xl bg-gradient-to-br from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <svg viewBox="0 0 24 24" className="size-5 shrink-0">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Google
              </button>

              <button
                onClick={handleGuest}
                disabled={loading}
                className="group relative flex h-12 items-center justify-center gap-3 overflow-hidden rounded-xl border border-border/50 bg-card/60 text-sm font-semibold shadow-lg backdrop-blur-xl saturate-150 transition-all hover:border-primary/30 hover:shadow-primary/10 active:scale-[0.98] disabled:opacity-50"
              >
                <span className="absolute inset-0 -z-10 translate-y-full bg-gradient-to-b from-primary/5 to-transparent transition-transform duration-300 group-hover:translate-y-0" />
                <User className="size-4" />
                Continue as Guest
              </button>
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-5 md:mt-6 text-center text-xs text-muted-foreground/60"
            >
              By signing in to BrainBloom, you agree to our{" "}
              <span className="underline underline-offset-2 hover:text-muted-foreground cursor-pointer">Terms</span>{" "}
              and{" "}
              <span className="underline underline-offset-2 hover:text-muted-foreground cursor-pointer">Privacy Policy</span>.
            </motion.p>
          </>
        )}
      </motion.div>
    </main>
  );
}
