import { getFirestore } from "firebase-admin/firestore";
import { privateJson } from "@/lib/server/staff-auth";
import { requirePlayer, smallJson } from "@/lib/server/player-http";
import { playerDatabase } from "@/lib/server/player-database";
import { billingConfig } from "@/lib/server/store-config";
import { BillingError, purchaseRequestSchema } from "@/lib/server/store-contract";
import { billingSnapshot, fulfillPurchase, prepareBilling, storedSubscriptions } from "@/lib/server/store-billing";
import { StoreVerifier } from "@/lib/server/store-verification";
import { billingFailure } from "@/lib/server/store-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const identity = await requirePlayer(request);
  if (!identity.ok) return identity.response;
  if (identity.anonymous) return privateJson({ ok: false, error: "Sign in with Google, Apple, or email before purchasing so you can restore your purchases.", code: "purchase-sign-in-required" }, 403);
  let input;
  try { input = purchaseRequestSchema.parse(await smallJson(request)); }
  catch { return privateJson({ ok: false, error: "Invalid purchase request.", code: "invalid-request" }, 400); }
  try {
    const config = billingConfig();
    const database = playerDatabase(getFirestore(identity.app), identity.app.options.projectId!);
    const prepared = await prepareBilling(database, config, identity.uid, input.store, input.action === "prepare");
    if (input.action === "prepare") return privateJson({ ok: true, ...prepared });
    const verifier = new StoreVerifier(config);
    if (input.action === "verify") {
      const purchase = await verifier.verify(input);
      const result = await fulfillPurchase(database, config, identity.uid, purchase);
      await verifier.finalize(purchase);
      return privateJson({ ok: true, ...result });
    }
    const proofs = await storedSubscriptions(database, identity.uid, input.store);
    for (const proof of proofs) {
      try {
        const purchase = await verifier.verify(proof);
        await fulfillPurchase(database, config, identity.uid, purchase);
        await verifier.finalize(purchase);
      } catch (error) {
        if (!(error instanceof BillingError) || error.code !== "invalid-purchase") throw error;
      }
    }
    return privateJson({ ok: true, ...await billingSnapshot(database, identity.uid) });
  } catch (error) { return billingFailure(error); }
}
