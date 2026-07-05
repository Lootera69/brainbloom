"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const greetings = [
  { time: 5, text: "Good Morning", emoji: "🌅" },
  { time: 12, text: "Good Afternoon", emoji: "☀️" },
  { time: 18, text: "Good Evening", emoji: "🌆" },
  { time: 22, text: "Night Owl", emoji: "🦉" },
];

function getGreeting() {
  const hour = new Date().getHours();
  return (
    greetings.find((g) => hour < g.time) ?? greetings[greetings.length - 1]
  );
}

const letters = "BrainBloom".split("");

export function Greeting() {
  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState(greetings[0]);

  useEffect(() => {
    setMounted(true);
    setGreeting(getGreeting());
    const id = setInterval(() => setGreeting(getGreeting()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!mounted) {
    return (
      <section className="mb-5 sm:mb-7">
        <p className="text-sm text-muted-foreground sm:text-base">&nbsp;</p>
        <h1 className="mt-1 font-heading text-3xl font-bold sm:text-5xl">
          BrainBloom
        </h1>
      </section>
    );
  }

  return (
    <section className="mb-5 sm:mb-7">
      <motion.p
        key={greeting.text}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-sm text-muted-foreground sm:text-base"
      >
        {greeting.text} {greeting.emoji}
      </motion.p>

      <h1 className="mt-1 flex font-heading text-3xl font-bold sm:text-5xl">
        {letters.map((letter, i) => (
          <motion.span
            key={`${letter}-${i}`}
            initial={{ opacity: 0, y: 30, rotateZ: i % 2 === 0 ? -15 : 15 }}
            animate={{ opacity: 1, y: 0, rotateZ: 0 }}
            transition={{
              delay: 0.05 + i * 0.04,
              type: "spring",
              stiffness: 150,
              damping: 12,
            }}
            className="inline-block bg-gradient-to-r from-primary via-purple-500 to-[#8b5cf6] bg-clip-text text-transparent"
            style={letter === " " ? { width: "0.3em" } : undefined}
          >
            {letter === " " ? "\u00A0" : letter}
          </motion.span>
        ))}
      </h1>
    </section>
  );
}
