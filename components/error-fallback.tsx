"use client";

import { AlertTriangle, ClipboardCopy, RefreshCw, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ErrorFallbackProps {
  title?: string;
  description?: string;
  error?: Error;
  onRetry?: () => void;
  fullPage?: boolean;
}

export function ErrorFallback({
  title = "Something went wrong",
  description = "We've run into an unexpected issue. Our team has been notified. If this keeps happening, please reach out to our support team.",
  error,
  onRetry,
  fullPage = true,
}: ErrorFallbackProps) {
  const handleCopyDiagnostics = () => {
    const lines = [
      `Title: ${title}`,
      `Description: ${description}`,
      error ? `Error: ${error.name}: ${error.message}` : "",
      error?.stack ? `Stack: ${error.stack}` : "",
      `User Agent: ${navigator.userAgent}`,
      `URL: ${window.location.href}`,
      `Timestamp: ${new Date().toISOString()}`,
    ].filter(Boolean);
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      toast.success("Diagnostic info copied to clipboard", { position: "top-center" });
    }).catch(() => {
      toast.error("Could not copy to clipboard", { position: "top-center" });
    });
  };

  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 14 }}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        fullPage ? "min-h-[60vh] p-6" : "p-6",
      )}
    >
      <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertTriangle className="size-7 text-destructive" />
      </div>

      <h2 className="font-heading text-xl font-bold sm:text-2xl">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>

      {error && process.env.NODE_ENV === "development" && (
        <pre className="mt-4 max-w-lg overflow-auto rounded-xl bg-muted p-4 text-left text-xs text-muted-foreground">
          {error.name}: {error.message}
          {error.stack && `\n\n${error.stack}`}
        </pre>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <RefreshCw className="size-4" />
            Try Again
          </button>
        )}
        <button
          onClick={handleCopyDiagnostics}
          className="inline-flex h-10 items-center gap-2 rounded-xl border bg-card px-5 text-sm font-medium transition-all hover:bg-muted active:scale-[0.98]"
        >
          <ClipboardCopy className="size-4" />
          Copy Diagnostics
        </button>
        <button
          onClick={() => {
            handleCopyDiagnostics();
            toast.success("Diagnostics copied — please send to our support team", { position: "top-center" });
          }}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-destructive/10 px-5 text-sm font-medium text-destructive transition-all hover:bg-destructive/20 active:scale-[0.98]"
        >
          <MessageSquare className="size-4" />
          Contact Support
        </button>
      </div>
    </motion.div>
  );

  return content;
}
