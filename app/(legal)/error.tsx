"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function LegalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Legal page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertTriangle className="size-8 text-destructive" />
      </div>
      <h2 className="text-xl font-bold">Could not load page</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        We encountered an error loading this document. Please try refreshing.
      </p>
      <Button onClick={reset} className="gap-2">
        <RefreshCw className="size-4" />
        Try again
      </Button>
      <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        Back to home
      </Link>
    </div>
  );
}
