"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function DiscoverImage({ src, alt, className, priority = false }: {
  src: string; alt: string; className?: string; priority?: boolean;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {src && failedSource !== src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading={priority ? "eager" : "lazy"}
          className="absolute inset-0 h-full w-full object-contain"
          onError={() => setFailedSource(src)} />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
          <ImageOff className="size-8 opacity-50" aria-hidden="true" />
          <p className="max-w-xs text-sm">{alt || "Illustration unavailable"}</p>
        </div>
      )}
    </div>
  );
}
