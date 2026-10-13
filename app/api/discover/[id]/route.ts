import { discoverIdSchema } from "@/lib/discover/validation";
import { privateJson } from "@/lib/server/staff-auth";
import { publicDiscoverLesson } from "@/lib/server/discover-content";
import { discoverFailure, discoverPublicDatabase } from "@/lib/server/discover-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const id = discoverIdSchema.parse((await context.params).id);
    const lesson = await publicDiscoverLesson(discoverPublicDatabase(), id);
    return lesson ? privateJson({ lesson }) : privateJson({ error: "This Discover lesson is not available." }, 404);
  } catch (error) { return discoverFailure(error); }
}
