"use client";

import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Clock, Tag } from "lucide-react";
import { ContentLayout } from "@/components/content/ContentLayout";
import { blogPosts } from "@/lib/blog-data";
import { notFound } from "next/navigation";

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  return (
    <ContentLayout title={post.title}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8 flex items-center gap-3 text-xs text-muted-foreground/60">
          <span className="flex items-center gap-1">
            <Tag className="size-3" />
            {post.category}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {post.readTime}
          </span>
          <span>{post.date}</span>
        </div>

        <div className="space-y-6">
          {post.content.map((paragraph, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 * i }}
              className="text-sm leading-relaxed text-muted-foreground/80"
            >
              {paragraph}
            </motion.p>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-primary/20 bg-primary/5 p-6">
          <p className="text-sm font-semibold text-foreground">Ready to put these ideas into practice?</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            BrainBloom offers daily puzzles designed by cognitive scientists to strengthen memory, 
            creativity, and problem-solving skills. Start your streak today.
          </p>
          <a
            href="/"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98]"
          >
            Start Training
          </a>
        </div>
      </motion.div>
    </ContentLayout>
  );
}
