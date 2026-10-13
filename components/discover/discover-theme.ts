import type { DiscoverAccent } from "@/types/discover";

export const discoverAccent: Record<DiscoverAccent, { text: string; tint: string; dot: string }> = {
  sky: { text: "text-secondary", tint: "bg-secondary/10", dot: "bg-secondary" },
  violet: { text: "text-primary", tint: "bg-primary/10", dot: "bg-primary" },
  amber: { text: "text-warning", tint: "bg-warning/10", dot: "bg-warning" },
  emerald: { text: "text-success", tint: "bg-success/10", dot: "bg-success" },
  rose: { text: "text-destructive", tint: "bg-destructive/10", dot: "bg-destructive" },
};
