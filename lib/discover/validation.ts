import { z } from "zod";

export const DISCOVER_ACCENTS = ["sky", "violet", "amber", "emerald", "rose"] as const;
export const DISCOVER_MAX_STEPS = 20;

export const discoverIdSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/, "Use a valid lesson identifier.");

// URLs are displayed as image sources only. Reject data/JavaScript URLs and
// protocol-relative URLs; allow portable public assets and HTTPS image hosts.
export function isDiscoverImageUrl(value: string): boolean {
  if (/^\/discover\/[a-zA-Z0-9/_-]+\.(svg|png|jpe?g|webp|avif)$/i.test(value)) {
    return !value.includes("//");
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
}

const imageUrl = z.string().trim().max(2048).refine((value) => !value || isDiscoverImageUrl(value), "Use an HTTPS image URL or a /discover/ image asset.");
const optionalText = (max: number) => z.string().trim().max(max).optional();

export const discoverStepSchema = z.object({
  id: discoverIdSchema,
  title: z.string().trim().max(100),
  body: z.string().trim().max(4000),
  imageUrl,
  imageAlt: z.string().trim().max(300),
  caption: optionalText(240),
  keyFact: optionalText(350),
});

export const discoverLessonInputSchema = z.object({
  title: z.string().trim().min(1, "Add a title.").max(120),
  summary: z.string().trim().max(400),
  category: z.string().trim().max(50),
  coverImageUrl: imageUrl,
  coverImageAlt: z.string().trim().max(300),
  accent: z.enum(DISCOVER_ACCENTS),
  difficulty: z.enum(["beginner", "intermediate"]),
  durationMinutes: z.number().int().min(1).max(60),
  steps: z.array(discoverStepSchema).max(DISCOVER_MAX_STEPS),
  takeaways: z.array(z.string().trim().max(300)).max(8),
  published: z.boolean(),
  featured: z.boolean(),
}).superRefine((lesson, ctx) => {
  if (new Set(lesson.steps.map((step) => step.id)).size !== lesson.steps.length) {
    ctx.addIssue({ code: "custom", message: "Each chapter must have a unique identifier.", path: ["steps"] });
  }
  if (!lesson.published) return;
  for (const key of ["summary", "category", "coverImageUrl", "coverImageAlt"] as const) {
    if (!lesson[key]) ctx.addIssue({ code: "custom", message: `${key} is required before publishing.`, path: [key] });
  }
  if (!lesson.steps.length) ctx.addIssue({ code: "custom", message: "Add at least one chapter before publishing.", path: ["steps"] });
  lesson.steps.forEach((step, index) => {
    for (const key of ["title", "body", "imageUrl", "imageAlt"] as const) {
      if (!step[key]) ctx.addIssue({ code: "custom", message: `Chapter ${index + 1}: ${key} is required before publishing.`, path: ["steps", index, key] });
    }
  });
  if (!lesson.takeaways.length || lesson.takeaways.some((takeaway) => !takeaway)) {
    ctx.addIssue({ code: "custom", message: "Add a complete takeaway before publishing.", path: ["takeaways"] });
  }
});

export const discoverLessonSchema = discoverLessonInputSchema.safeExtend({
  id: discoverIdSchema,
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export const discoverUpdateSchema = z.object({
  lesson: discoverLessonInputSchema,
  expectedUpdatedAt: z.number().int().nonnegative(),
});

export const discoverDeleteSchema = z.object({ expectedUpdatedAt: z.number().int().nonnegative() });
