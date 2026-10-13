import { DiscoverEditLoader } from "@/components/studio/discover/DiscoverLessonEditor";

export default async function EditDiscoverLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DiscoverEditLoader id={id} />;
}
