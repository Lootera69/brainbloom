"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import { ContentLayout } from "@/components/content/ContentLayout";
import { blogPosts } from "@/lib/blog-data";

export default function BlogPage() {
  return (
    <ContentLayout title="Blog" subtitle="Insights on brain training, cognitive science, and the art of thinking well">
      <div className="space-y-6">
        {blogPosts.map((post, i) => (
          <motion.article
            key={post.slug}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 * i }}
          >
            <Link
              href={`/blog/${post.slug}`}
              className="group block rounded-2xl border border-border/40 bg-card/50 p-6 transition-all hover:border-primary/30 hover:bg-card/80 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                  {post.category}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {post.readTime}
                </span>
                <span>{post.date}</span>
              </div>

              <h2 className="mt-3 text-base font-bold text-foreground transition-colors group-hover:text-primary">
                {post.title}
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-muted-foreground/70">
                {post.excerpt}
              </p>

              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-primary/70 transition-colors group-hover:text-primary">
                Read article
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          </motion.article>
        ))}
      </div>
    </ContentLayout>
  );
}
