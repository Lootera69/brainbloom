import { privateJson, requireAdmin } from "@/lib/server/staff-auth";
import { seedMetadata, seedPage } from "@/lib/server/seed-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;
  const params = new URL(request.url).searchParams;
  const source = params.get("source") ?? "metadata";
  if (source === "metadata") return privateJson(seedMetadata());
  if (!["legacy", "forge", "ciphers"].includes(source)) return privateJson({ error: "Unknown seed source." }, 400);
  const pageValue = params.get("page") ?? "0";
  if (!/^\d{1,5}$/.test(pageValue)) return privateJson({ error: "Invalid seed page." }, 400);
  try {
    const data = await seedPage(source as "legacy" | "forge" | "ciphers", Number(pageValue));
    return data ? privateJson(data) : privateJson({ error: "Seed page not found." }, 404);
  } catch { return privateJson({ error: "Seed data is unavailable. Please retry." }, 503); }
}
