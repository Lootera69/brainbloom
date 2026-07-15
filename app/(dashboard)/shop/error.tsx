"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, ShoppingBag } from "lucide-react";

export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Shop error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertTriangle className="size-8 text-destructive" />
      </div>
      <h2 className="text-xl font-bold">Shop unavailable</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Something went wrong loading the store. Please try again.
      </p>
      <button
        onClick={reset}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-110 active:scale-[0.98]"
      >
        <RefreshCw className="size-4" />
        Try again
      </button>
      <Link
        href="/"
        className="flex items-center gap-1.5 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        <ShoppingBag className="size-3.5" />
        Back to home
      </Link>
    </div>
  );
}
