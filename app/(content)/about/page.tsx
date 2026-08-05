"use client";

import { motion } from "framer-motion";
import { Brain, Target, Users, Lightbulb, Heart, Sparkles } from "lucide-react";
import { ContentLayout } from "@/components/content/ContentLayout";

const values = [
  {
    icon: Brain,
    title: "Science-First Design",
    description: "Every puzzle type is grounded in cognitive science research. Our crossword puzzles strengthen verbal memory, our Sudoku exercises enhance logical reasoning, our riddles engage lateral thinking, and our ciphers challenge pattern recognition."
  },
  {
    icon: Target,
    title: "Deliberate Practice",
    description: "We believe in quality over quantity. Each puzzle is calibrated to provide the optimal level of challenge — difficult enough to stimulate growth, achievable enough to maintain motivation. This is the zone of proximal development where real learning happens."
  },
  {
    icon: Users,
    title: "Community Driven",
    description: "BrainBloom is built by puzzle enthusiasts and cognitive science researchers who believe that mental fitness should be accessible to everyone. Our Puzzle Studio allows contributors to create and share puzzles with the community."
  },
  {
    icon: Lightbulb,
    title: "Creative Thinking",
    description: "Beyond analytical skills, we emphasize creative problem-solving. Our riddles and lateral thinking puzzles train you to approach problems from unexpected angles — a skill that transfers to every domain of life."
  },
  {
    icon: Heart,
    title: "Sustainable Habits",
    description: "We design for consistency, not intensity. Daily streaks, achievement systems, and progressive difficulty curves are not gamification gimmicks — they are scientifically grounded approaches to habit formation that make learning stick."
  },
  {
    icon: Sparkles,
    title: "Joy in Learning",
    description: "Mental exercise should feel rewarding, not burdensome. Beautiful animations, satisfying sound effects, and meaningful progress indicators make every session something to look forward to."
  }
];

export default function AboutPage() {
  return (
    <ContentLayout title="About BrainBloom" subtitle="A cognitive training platform built on science, designed for delight">
      <div className="space-y-8">
        {/* Mission */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-border/40 bg-card/50 p-6"
        >
          <h2 className="text-base font-bold text-foreground">Our Mission</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground/80">
            BrainBloom exists to make cognitive training accessible, engaging, and scientifically grounded. 
            We believe that everyone deserves the opportunity to sharpen their mind, and that the path to 
            cognitive growth should be filled with curiosity, challenge, and delight — not枯燥 drills or 
            empty gamification.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground/80">
            Our platform offers eight distinct puzzle types, each designed to exercise different cognitive 
            faculties. From the verbal recall of crosswords to the logical precision of Sudoku, from the 
            creative lateral thinking of riddles to the pattern recognition demands of ciphers — BrainBloom 
            provides a complete cognitive workout that adapts to your level and grows with your progress.
          </p>
        </motion.div>

        {/* Story */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl border border-border/40 bg-card/50 p-6"
        >
          <h2 className="text-base font-bold text-foreground">Our Story</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground/80">
            BrainBloom began with a simple observation: the best brain training apps felt either too 
            clinical or too childish. We wanted something that respected adult intelligence while 
            making the experience genuinely enjoyable. Something that felt less like homework and more 
            like a daily ritual of mental enrichment.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground/80">
            We started with crossword puzzles and Sudoku — the classics. But we quickly realized that 
            cognitive training is richer than any single format. We added riddles to engage creative 
            thinking. Ciphers to challenge analytical deduction. Type-answer puzzles to strengthen 
            verbal recall. Each addition was guided by cognitive science research and refined through 
            user feedback.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground/80">
            Today, BrainBloom serves thousands of daily users who have collectively solved millions 
            of puzzles. But we measure success not by numbers, but by the emails we receive from users 
            who tell us that their memory has improved, their thinking has sharpened, or their daily 
            puzzle practice has become the highlight of their morning routine.
          </p>
        </motion.div>

        {/* Values */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="mb-4 text-base font-bold text-foreground">What We Believe</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {values.map((value, i) => {
              const Icon = value.icon;
              return (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 * i }}
                  className="rounded-2xl border border-border/40 bg-card/50 p-5"
                >
                  <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="size-4.5 text-primary" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">{value.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground/70">
                    {value.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Approach */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="rounded-2xl border border-border/40 bg-card/50 p-6"
        >
          <h2 className="text-base font-bold text-foreground">Our Approach</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground/80">
            Every feature in BrainBloom is designed around three principles:
          </p>
          <ul className="mt-3 space-y-3 text-sm text-muted-foreground/80">
            <li className="flex gap-3">
              <span className="mt-1.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">1</span>
              <span>
                <strong className="text-foreground">Scientific grounding.</strong> We don't invent cognitive benefits — we implement techniques that have been validated by peer-reviewed research. Our puzzle types, difficulty curves, and reward systems are all informed by neuroscience and cognitive psychology.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">2</span>
              <span>
                <strong className="text-foreground">Sustainable design.</strong> We optimize for long-term engagement, not short-term metrics. Daily streaks, progressive difficulty, and meaningful rewards create habits that last — not compulsions that fade.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">3</span>
              <span>
                <strong className="text-foreground">Joy in the process.</strong> Beautiful design, satisfying interactions, and genuine challenge make BrainBloom something you want to do, not something you have to do. The best cognitive training is the kind you actually enjoy.
              </span>
            </li>
          </ul>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center"
        >
          <h2 className="text-base font-bold text-foreground">Start Your Journey</h2>
          <p className="mt-2 text-sm text-muted-foreground/70">
            Join thousands of daily learners who are building sharper minds, one puzzle at a time.
          </p>
          <a
            href="/"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <Sparkles className="size-4" />
            Begin Training
          </a>
        </motion.div>
      </div>
    </ContentLayout>
  );
}
