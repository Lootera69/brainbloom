import type { Metadata } from "next";
import { DiscoverLibrary } from "@/components/discover/DiscoverLibrary";

export const metadata: Metadata = {
  title: "Discover | BrainBloom",
  description: "Big ideas, beautifully explained. Explore how the world works with illustrated, step-by-step lessons.",
};

export default function DiscoverPage() { return <DiscoverLibrary />; }
