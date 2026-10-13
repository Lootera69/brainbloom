import { Compass, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DiscoverAccent } from "@/types/discover";

export const inputClass = "w-full rounded-xl border border-border/70 bg-background/60 px-3.5 py-3 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10 placeholder:text-muted-foreground/50 disabled:opacity-50";
export const secondaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border/70 bg-card px-4 py-2 text-sm font-semibold transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-45";
export const primaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-45";
export const accentClasses: Record<DiscoverAccent, string> = {
  sky: "from-sky-500/20 via-cyan-500/10 to-indigo-500/10",
  violet: "from-violet-500/20 via-indigo-500/10 to-fuchsia-500/10",
  amber: "from-amber-500/20 via-orange-500/10 to-rose-500/10",
  emerald: "from-emerald-500/20 via-teal-500/10 to-sky-500/10",
  rose: "from-rose-500/20 via-pink-500/10 to-violet-500/10",
};
export const accentDots: Record<DiscoverAccent, string> = {
  sky: "bg-sky-500", violet: "bg-violet-500", amber: "bg-amber-500", emerald: "bg-emerald-500", rose: "bg-rose-500",
};

export function StudioDiscoverLoading() {
  return <div className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-8" role="status" aria-label="Loading Discover Studio">
    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Opening your collection…</div>
    <div className="h-52 animate-pulse rounded-[2rem] bg-muted" />
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((n) => <div key={n} className="h-72 animate-pulse rounded-3xl bg-muted/70" />)}</div>
  </div>;
}

export function StudioDiscoverError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="mx-auto my-12 max-w-lg rounded-3xl border bg-card p-8 text-center">
    <Compass className="mx-auto mb-5 size-10 text-primary" />
    <h1 className="font-heading text-xl font-semibold">We couldn’t open Discover</h1>
    <p className="mt-3 text-sm leading-relaxed text-muted-foreground" role="alert">{message}</p>
    <button onClick={onRetry} className={cn(secondaryButton, "mt-6")}><RefreshCw className="size-4" /> Try again</button>
  </div>;
}
