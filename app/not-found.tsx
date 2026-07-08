import Link from "next/link";
import { Brain } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-3xl bg-primary/10">
        <Brain className="size-10 text-primary" />
      </div>
      <h1 className="font-heading text-5xl font-bold">404</h1>
      <p className="mt-3 text-lg text-muted-foreground">Page not found</p>
      <p className="mt-1 text-sm text-muted-foreground/60">
        This page doesn&apos;t exist or has been moved.
      </p>
      <Link href="/"
        className="mt-8 flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]">
        Go Home
      </Link>
    </div>
  );
}
