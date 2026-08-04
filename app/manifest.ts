import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BrainBloom",
    short_name: "BrainBloom",
    description: "Train your brain every day with puzzles, quizzes, and learning paths.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#6366f1",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-96.png",
        sizes: "96x96",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["education", "games", "puzzles"],
    lang: "en",
    scope: "/",
  };
}
