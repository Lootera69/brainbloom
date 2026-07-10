"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function GlobalErrorHandler() {
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.warn("Unhandled promise rejection:", event.reason);
      event.preventDefault();
      toast.error("Something went wrong. If this keeps happening, please contact support.", {
        position: "top-center",
        duration: 4000,
      });
    };

    const handleError = (event: ErrorEvent) => {
      if (event.message.includes("ResizeObserver") || event.message.includes("Script error")) return;
      console.warn("Global error caught:", event.message);
      event.preventDefault();
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return null;
}
