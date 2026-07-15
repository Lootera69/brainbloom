"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertTriangle className="size-8 text-destructive" />
      </div>
      <h2 className="text-xl font-bold">Something went wrong</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        We hit a snag. Try refreshing, or go back to the home page.
      </p>
      <Button onClick={reset} className="gap-2">
        <RefreshCw className="size-4" />
        Try again
      </Button>
      <Link href="/" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
        Back to home
      </Link>
    </div>
  );
}
