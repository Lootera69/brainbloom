"use client";

import { motion } from "framer-motion";
import { ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface ContentLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function ContentLayout({ children, title, subtitle }: ContentLayoutProps) {
  const pathname = usePathname();
  const isBlog = pathname.startsWith("/blog");
  const isAbout = pathname === "/about";

  return (
    <main className="relative min-h-dvh bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 top-20 h-[500px] w-[500px] rounded-full bg-primary/[0.03] blur-[120px]" />
        <div className="absolute -right-32 bottom-20 h-[400px] w-[400px] rounded-full bg-[#8b5cf6]/[0.03] blur-[100px]" />
      </div>

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground/60 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to home
          </Link>

          <div className="mb-10 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-[#8b5cf6]/10 shadow-sm">
              <BookOpen className="size-5 text-primary" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-foreground">
                {title || (isBlog ? "Blog" : isAbout ? "About BrainBloom" : "")}
              </h1>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="space-y-8">
            {children}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
