import { AppLayout } from "@/components/layout/app-layout";
import { EventEntrance } from "@/features/home/components/EventEntrance";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout>
      {children}
      <EventEntrance />
    </AppLayout>
  );
}
