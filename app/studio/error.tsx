"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function StudioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Studio error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertTriangle className="size-8 text-destructive" />
      </div>
      <h2 className="text-xl font-bold">Studio error</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Something went wrong in the studio. Try refreshing, or go back.
      </p>
      <Button onClick={reset} className="gap-2">
        <RefreshCw className="size-4" />
        Try again
      </Button>
      <Link href="/studio" className="flex items-center gap-1.5 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        Back to studio
      </Link>
    </div>
  );
}
