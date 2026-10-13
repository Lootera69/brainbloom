import type { Metadata } from "next";
import { DiscoverLessonPage } from "@/components/discover/DiscoverLessonPage";

export const metadata: Metadata = { title: "Explore a discovery | BrainBloom" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DiscoverLessonPage key={id} id={id} />;
}
