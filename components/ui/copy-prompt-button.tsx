"use client";

import { useState } from "react";
import { Sparkles, Check } from "lucide-react";

const PROMPT_TEMPLATE = `You are the official illustrator for BrainBloom, a premium mobile app that transforms curiosity into learning through daily puzzles.

Your task is to create ONE illustration that follows the BrainBloom Illustration System.

SUBJECT:
[SUBJECT]

----------------------------------------

STYLE GUIDE

Create a timeless premium editorial vector illustration.

Inspired by the illustration systems used by Stripe, Notion, Linear, GitHub and modern SaaS products.

The illustration must feel intelligent, elegant, minimal and educational rather than playful or childish.

DESIGN RULES

• Flat SVG vector illustration
• Editorial illustration style
• Modern geometric composition
• Clean mathematical proportions
• White background
• Plenty of whitespace
• Thin charcoal outlines (consistent stroke width)
• Rounded corners
• Simple geometric forms
• Blue and purple accent colors only
• Neutral gray secondary elements
• Minimal soft shadows only if necessary
• Extremely clean layout
• Premium mobile app aesthetic
• Consistent visual language
• High readability even on small mobile screens

COLOR PALETTE

Primary Blue
Deep Purple
Charcoal Gray
Light Gray
White

Avoid unnecessary colors.

COMPOSITION

Focus on one clear concept.

Avoid clutter.

Every object should have purpose.

Use negative space generously.

Create visual hierarchy.

CAMERA

Use a consistent front or slightly isometric (around 20–30°) perspective.

Never use dramatic cinematic angles.

ILLUSTRATION STYLE

Professional
Minimal
Scientific
Educational
Elegant
Editorial
Modern

Not childish.

Not cartoonish.

Not game-like.

Not comic style.

OBJECTS

Represent real-world concepts using simplified geometric shapes.

Every object should look carefully designed rather than randomly generated.

If humans appear:

• faceless
• minimal
• professional
• diverse
• no exaggerated expressions

LIGHTING

Soft
Clean
Natural

No dramatic lighting.

QUALITY

Vector quality

Sharp edges

Perfect symmetry where applicable

Suitable for a premium educational application.

NEGATIVE PROMPT

Do NOT generate:

Photorealism
3D renders
Clay style
Anime
Disney style
Pixar style
Comic style
Manga
Watercolor
Oil painting
Sketch
Hand drawn
Pencil drawing
AI art look
Messy compositions
Clipart
Stock illustration
Overly colorful scenes
Heavy gradients
Textures
Noise
Text
Logos
Watermarks
Fake UI
Fake buttons
Random background objects
Extra unnecessary details

The final illustration should immediately feel like it belongs inside the BrainBloom app and remain visually timeless for the next 10 years.

This illustration is part of the BrainBloom Design System. Every illustration across the app must maintain identical visual language, proportions, stroke width, spacing, color palette, perspective, and overall aesthetic. The result should look as though it was created by the same illustrator as every other BrainBloom illustration.`;

export function CopyPromptButton({ subject }: { subject: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const trimmed = subject.trim() || "No description provided";
    const truncated = trimmed.length > 500 ? trimmed.slice(0, 497) + "..." : trimmed;
    const prompt = PROMPT_TEMPLATE.replace("[SUBJECT]", truncated);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("Clipboard API failed — prompt logged to console:", prompt);
    }
  };

  return (
    <button type="button" onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary">
      {copied ? <Check className="size-3" /> : <Sparkles className="size-3" />}
      {copied ? "Copied!" : "AI prompt"}
    </button>
  );
}
