"use client";

import { StudioDiscoverError } from "@/components/studio/discover/discover-studio-ui";

export default function DiscoverError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <StudioDiscoverError message="The lesson workspace couldn’t be opened. Please try again." onRetry={reset} />;
}
