"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Compass } from "lucide-react";
import { getDiscoverLesson } from "@/services/discover-service";
import { DiscoverReader } from "./DiscoverReader";
import { DiscoverLoading } from "./DiscoverLibrary";
import type { DiscoverLesson } from "@/types/discover";

export function DiscoverLessonPage({ id }: { id: string }) {
  const [lesson, setLesson] = useState<DiscoverLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    getDiscoverLesson(id).then((data) => {
      if (!cancelled) { setLesson(data); setLoading(false); }
    }).catch((cause: unknown) => {
      if (!cancelled) { setError(cause instanceof Error ? cause.message : "Could not open this discovery."); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [id, retry]);
  if (loading) return <div className="mx-auto max-w-7xl p-6"><DiscoverLoading /></div>;
  if (lesson && !error) return <DiscoverReader key={`${lesson.id}:${lesson.updatedAt}`} lesson={lesson} />;
  return <div className="mx-auto max-w-xl px-6 py-20 text-center"><Compass className="mx-auto mb-5 size-12 text-primary" /><h1 className="text-2xl font-bold">{error ? "We couldn’t open this discovery" : "This discovery isn’t available"}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">{error || "It may have moved or is still being prepared. There’s plenty more to explore."}</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/discover" className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold"><ArrowLeft className="size-4" /> Back to Discover</Link>{error && <button onClick={() => { setError(null); setLoading(true); setRetry((value) => value + 1); }} className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Try again</button>}</div></div>;
}
