import { privateJson } from "@/lib/server/staff-auth";
import { publicDiscoverLessons } from "@/lib/server/discover-content";
import { discoverFailure, discoverPublicDatabase } from "@/lib/server/discover-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public, published-only JSON catalogue for the web and native apps. */
export async function GET() {
  try { return privateJson(await publicDiscoverLessons(discoverPublicDatabase())); }
  catch (error) { return discoverFailure(error); }
}
